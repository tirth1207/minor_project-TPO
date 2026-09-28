-- Historical Placement Comparison: REAL DATA SEED
--
-- This seed intentionally contains NO fabricated placement numbers.
-- It derives snapshots from the portal's operational data:
--   organizations, departments, users, student_profiles,
--   company_profiles, job_postings, job_college_mappings,
--   applications and offers.
--
-- Academic year convention:
--   date_of_visit in Jul-Dec YYYY -> YYYY-YY
--   date_of_visit in Jan-Jun YYYY -> (YYYY-1)-(YY-1)
--
-- IMPORTANT:
-- The current connected Supabase project must already contain the TPO schema
-- and real application data before this seed can produce historical rows.

do $$
declare
  v_org uuid := '11111111-1111-1111-1111-111111111111';
begin

  if not exists (
    select 1 from public.organizations where id = v_org
  ) then
    raise exception 'Organization % does not exist in this database', v_org;
  end if;

  -- College snapshots.
  -- A student is counted as placed for an academic year when they have
  -- an ACCEPTED offer attached to an application for a job visit in that year.
  insert into public.placement_comparison_records (
    org_id, academic_year, scope_type,
    total_students, eligible_students, placed_students,
    companies_participated, total_offers,
    avg_ctc, median_ctc, highest_ctc, lowest_ctc
  )
  with job_years as (
    select
      jp.id as job_id,
      jcm.org_id,
      case
        when extract(month from jp.date_of_visit) >= 7
          then extract(year from jp.date_of_visit)::int
        else extract(year from jp.date_of_visit)::int - 1
      end as academic_year,
      jp.company_id
    from public.job_postings jp
    join public.job_college_mappings jcm on jcm.job_id = jp.id
    where jcm.org_id = v_org
      and jp.date_of_visit is not null
  ),
  placed as (
    select
      jy.academic_year,
      count(distinct a.student_id) filter (where o.status = 'ACCEPTED') as placed_students,
      count(o.id) filter (where o.status = 'ACCEPTED') as accepted_offers,
      avg(o.ctc_offered) filter (where o.status = 'ACCEPTED') as avg_ctc,
      percentile_cont(0.5) within group (order by o.ctc_offered)
        filter (where o.status = 'ACCEPTED') as median_ctc,
      max(o.ctc_offered) filter (where o.status = 'ACCEPTED') as highest_ctc,
      min(o.ctc_offered) filter (where o.status = 'ACCEPTED') as lowest_ctc
    from job_years jy
    join public.job_college_mappings jcm on jcm.job_id = jy.job_id
    join public.applications a on a.job_college_map_id = jcm.id
    left join public.offers o on o.application_id = a.id
    group by jy.academic_year
  ),
  companies as (
    select academic_year, count(distinct company_id) as company_count
    from job_years
    group by academic_year
  ),
  population as (
    select
      case
        when s.semester >= 7 then extract(year from current_date)::int
        else extract(year from current_date)::int
      end as academic_year,
      count(*) as total_students
    from public.student_profiles s
    join public.users u on u.id = s.user_id
    where u.org_id = v_org
    group by 1
  )
  select
    v_org,
    p.academic_year,
    'college',
    p.total_students,
    p.total_students,
    coalesce(pl.placed_students, 0),
    coalesce(c.company_count, 0),
    coalesce(pl.accepted_offers, 0),
    coalesce(pl.avg_ctc, 0),
    coalesce(pl.median_ctc, 0),
    coalesce(pl.highest_ctc, 0),
    coalesce(pl.lowest_ctc, 0)
  from population p
  left join placed pl on pl.academic_year = p.academic_year
  left join companies c on c.academic_year = p.academic_year
  where p.academic_year in (2024, 2025)
  on conflict (
    org_id, academic_year, scope_type,
    (coalesce(department_id::text, '')),
    (coalesce(mentor_id::text, '')),
    (coalesce(company_id::text, '')),
    (coalesce(lower(company_name), ''))
  )
  do update set
    total_students = excluded.total_students,
    eligible_students = excluded.eligible_students,
    placed_students = excluded.placed_students,
    companies_participated = excluded.companies_participated,
    total_offers = excluded.total_offers,
    avg_ctc = excluded.avg_ctc,
    median_ctc = excluded.median_ctc,
    highest_ctc = excluded.highest_ctc,
    lowest_ctc = excluded.lowest_ctc,
    updated_at = now();

  -- Department snapshots.
  insert into public.placement_comparison_records (
    org_id, academic_year, scope_type,
    department_id, department_name,
    total_students, eligible_students, placed_students,
    companies_participated, total_offers,
    avg_ctc, median_ctc, highest_ctc, lowest_ctc
  )
  with job_years as (
    select
      jp.id as job_id,
      jcm.org_id,
      case
        when extract(month from jp.date_of_visit) >= 7
          then extract(year from jp.date_of_visit)::int
        else extract(year from jp.date_of_visit)::int - 1
      end as academic_year,
      jp.company_id
    from public.job_postings jp
    join public.job_college_mappings jcm on jcm.job_id = jp.id
    where jcm.org_id = v_org
      and jp.date_of_visit is not null
  ),
  dept_placed as (
    select
      jy.academic_year,
      u.dept_id,
      count(distinct a.student_id) filter (where o.status = 'ACCEPTED') as placed_students,
      count(o.id) filter (where o.status = 'ACCEPTED') as accepted_offers,
      avg(o.ctc_offered) filter (where o.status = 'ACCEPTED') as avg_ctc,
      percentile_cont(0.5) within group (order by o.ctc_offered)
        filter (where o.status = 'ACCEPTED') as median_ctc,
      max(o.ctc_offered) filter (where o.status = 'ACCEPTED') as highest_ctc,
      min(o.ctc_offered) filter (where o.status = 'ACCEPTED') as lowest_ctc,
      count(distinct jy.company_id) as company_count
    from job_years jy
    join public.job_college_mappings jcm on jcm.job_id = jy.job_id
    join public.applications a on a.job_college_map_id = jcm.id
    join public.student_profiles s on s.id = a.student_id
    join public.users u on u.id = s.user_id
    left join public.offers o on o.application_id = a.id
    where u.org_id = v_org
    group by jy.academic_year, u.dept_id
  )
  select
    v_org,
    extract(year from current_date)::int as academic_year,
    'department',
    d.id,
    d.name,
    count(s.id),
    count(s.id),
    coalesce(dp.placed_students, 0),
    coalesce(dp.company_count, 0),
    coalesce(dp.accepted_offers, 0),
    coalesce(dp.avg_ctc, 0),
    coalesce(dp.median_ctc, 0),
    coalesce(dp.highest_ctc, 0),
    coalesce(dp.lowest_ctc, 0)
  from public.departments d
  left join public.users u on u.dept_id = d.id and u.org_id = v_org and u.role = 'STUDENT'
  left join public.student_profiles s on s.user_id = u.id
  left join dept_placed dp on dp.dept_id = d.id
  where d.org_id = v_org
  group by d.id, d.name, dp.placed_students, dp.company_count,
           dp.accepted_offers, dp.avg_ctc, dp.median_ctc, dp.highest_ctc, dp.lowest_ctc;

end $$;

-- Verification:
select
  academic_year,
  scope_type,
  department_name,
  company_name,
  total_students,
  eligible_students,
  placed_students,
  total_offers,
  avg_ctc,
  median_ctc,
  highest_ctc,
  lowest_ctc
from public.placement_comparison_records
where org_id = '11111111-1111-1111-1111-111111111111'
order by academic_year, scope_type, department_name, company_name;
