-- Synthetic demonstration dataset for Historical Placement Comparison.
-- These figures are NOT verified institutional results.
-- Years: 2024-25 (stored as 2024) and 2025-26 (stored as 2025).
-- The seed targets an existing R.C. Technical Institute organization when present;
-- otherwise it creates a clearly labelled demo organization.

do $$
declare
  v_org uuid;
  v_dept_ce uuid;
  v_dept_it uuid;
  v_dept_ece uuid;
  v_dept_me uuid;
begin
  select id into v_org
  from public.organizations
  where lower(name) like '%r.c. technical institute%'
  order by created_at
  limit 1;

  if v_org is null then
    insert into public.organizations(name, status)
    values ('R.C. Technical Institute (Demo Data)', 'ACTIVE')
    returning id into v_org;
  end if;

  insert into public.departments(org_id, name, status)
  select v_org, x.name, 'ACTIVE'
  from (values ('Computer Engineering'),('Information Technology'),('Electronics & Communication'),('Mechanical Engineering')) x(name)
  where not exists (
    select 1 from public.departments d
    where d.org_id = v_org and lower(d.name) = lower(x.name)
  );

  select id into v_dept_ce from public.departments where org_id=v_org and lower(name)='computer engineering' limit 1;
  select id into v_dept_it from public.departments where org_id=v_org and lower(name)='information technology' limit 1;
  select id into v_dept_ece from public.departments where org_id=v_org and lower(name)='electronics & communication' limit 1;
  select id into v_dept_me from public.departments where org_id=v_org and lower(name)='mechanical engineering' limit 1;

  insert into public.placement_comparison_records
  (org_id,academic_year,scope_type,department_id,department_name,company_name,total_students,eligible_students,placed_students,companies_participated,total_offers,avg_ctc,median_ctc,highest_ctc,lowest_ctc)
  values
  (v_org,2024,'college',null,null,null,412,356,274,38,301,4.72,4.30,12.50,2.40),
  (v_org,2025,'college',null,null,null,438,389,319,46,352,5.18,4.70,15.20,2.60),
  (v_org,2024,'department',v_dept_ce,'Computer Engineering',null,126,111,91,24,101,5.08,4.50,12.50,2.80),
  (v_org,2025,'department',v_dept_ce,'Computer Engineering',null,134,121,105,29,116,5.64,5.10,15.20,3.00),
  (v_org,2024,'department',v_dept_it,'Information Technology',null,108,94,72,21,79,4.61,4.20,10.80,2.50),
  (v_org,2025,'department',v_dept_it,'Information Technology',null,116,103,84,25,93,5.03,4.60,12.40,2.70),
  (v_org,2024,'department',v_dept_ece,'Electronics & Communication',null,96,83,59,17,64,4.32,3.90,9.60,2.40),
  (v_org,2025,'department',v_dept_ece,'Electronics & Communication',null,101,91,68,19,73,4.71,4.30,10.80,2.50),
  (v_org,2024,'department',v_dept_me,'Mechanical Engineering',null,82,68,52,14,57,3.94,3.60,7.80,2.30),
  (v_org,2025,'department',v_dept_me,'Mechanical Engineering',null,87,74,62,16,70,4.22,3.90,8.60,2.40),
  (v_org,2024,'company',null,null,'TechNova Solutions',12,12,7,1,7,5.20,5.00,6.50,4.00),
  (v_org,2025,'company',null,null,'TechNova Solutions',16,16,10,1,10,5.65,5.50,7.20,4.20),
  (v_org,2024,'company',null,null,'Apex Infotech',18,18,8,1,8,4.60,4.50,6.00,3.50),
  (v_org,2025,'company',null,null,'Apex Infotech',22,22,13,1,14,5.05,4.80,6.80,3.80),
  (v_org,2024,'company',null,null,'CloudMatrix Systems',14,14,6,1,6,5.80,5.50,8.00,4.50),
  (v_org,2025,'company',null,null,'CloudMatrix Systems',20,20,11,1,12,6.35,6.00,9.20,4.80),
  (v_org,2024,'company',null,null,'ByteCraft Technologies',20,20,9,1,10,4.35,4.10,5.80,3.20),
  (v_org,2025,'company',null,null,'ByteCraft Technologies',25,25,15,1,16,4.85,4.60,6.40,3.50)
  on conflict (org_id, academic_year, scope_type, (coalesce(department_id::text, '')), (coalesce(mentor_id::text, '')), (coalesce(company_id::text, '')), (coalesce(lower(company_name), '')))
  do update set
    total_students=excluded.total_students,
    eligible_students=excluded.eligible_students,
    placed_students=excluded.placed_students,
    companies_participated=excluded.companies_participated,
    total_offers=excluded.total_offers,
    avg_ctc=excluded.avg_ctc,
    median_ctc=excluded.median_ctc,
    highest_ctc=excluded.highest_ctc,
    lowest_ctc=excluded.lowest_ctc,
    updated_at=now();
end $$;
