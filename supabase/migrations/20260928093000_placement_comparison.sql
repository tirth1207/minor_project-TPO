-- Historical placement comparison data for the TPO portal.
create table if not exists public.placement_comparison_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  academic_year integer not null check (academic_year between 2000 and 2100),
  scope_type text not null check (scope_type in ('college','department','mentor','company')),
  department_id uuid references public.departments(id) on delete cascade,
  mentor_id uuid references public.users(id) on delete set null,
  company_id uuid references public.company_profiles(id) on delete set null,
  department_name text,
  mentor_name text,
  company_name text,
  total_students integer not null default 0 check (total_students >= 0),
  eligible_students integer not null default 0 check (eligible_students >= 0 and eligible_students <= total_students),
  placed_students integer not null default 0 check (placed_students >= 0 and placed_students <= eligible_students),
  companies_participated integer not null default 0 check (companies_participated >= 0),
  total_offers integer not null default 0 check (total_offers >= placed_students),
  avg_ctc numeric(10,2) not null default 0 check (avg_ctc >= 0),
  median_ctc numeric(10,2) not null default 0 check (median_ctc >= 0),
  highest_ctc numeric(10,2) not null default 0 check (highest_ctc >= 0),
  lowest_ctc numeric(10,2) not null default 0 check (lowest_ctc >= 0),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint placement_comparison_scope_target check (
    (scope_type = 'college' and department_id is null and mentor_id is null and company_id is null)
    or (scope_type = 'department' and department_id is not null and mentor_id is null and company_id is null)
    or (scope_type = 'mentor' and mentor_id is not null and company_id is null)
    or (scope_type = 'company' and company_id is not null and mentor_id is null)
  )
);

create unique index if not exists placement_comparison_unique_idx
on public.placement_comparison_records (
  org_id, academic_year, scope_type,
  coalesce(department_id::text, ''),
  coalesce(mentor_id::text, ''),
  coalesce(company_id::text, ''),
  coalesce(lower(company_name), '')
);

create index if not exists placement_comparison_org_year_idx
on public.placement_comparison_records(org_id, academic_year);

create index if not exists placement_comparison_scope_idx
on public.placement_comparison_records(org_id, scope_type);

alter table public.placement_comparison_records enable row level security;

drop policy if exists "placement comparison read" on public.placement_comparison_records;
create policy "placement comparison read"
on public.placement_comparison_records
for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (
        u.role = 'SA'
        or (u.role in ('COLLEGE_ADMIN','MENTOR','STUDENT') and u.org_id = placement_comparison_records.org_id)
        or (
          u.role = 'COMPANY'
          and placement_comparison_records.company_id is not null
          and exists (
            select 1 from public.company_profiles cp
            where cp.id = placement_comparison_records.company_id
              and cp.user_id = u.id
          )
        )
      )
  )
);

drop policy if exists "placement comparison manage" on public.placement_comparison_records;
create policy "placement comparison manage"
on public.placement_comparison_records
for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (
        u.role = 'SA'
        or (u.role = 'COLLEGE_ADMIN' and u.org_id = placement_comparison_records.org_id)
        or (u.role = 'MENTOR' and u.id = placement_comparison_records.mentor_id)
      )
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (
        u.role = 'SA'
        or (u.role = 'COLLEGE_ADMIN' and u.org_id = placement_comparison_records.org_id)
        or (u.role = 'MENTOR' and u.id = placement_comparison_records.mentor_id and u.org_id = placement_comparison_records.org_id)
      )
  )
);

grant select, insert, update, delete on public.placement_comparison_records to authenticated;

create or replace function public.set_placement_comparison_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists placement_comparison_updated_at on public.placement_comparison_records;
create trigger placement_comparison_updated_at
before update on public.placement_comparison_records
for each row execute function public.set_placement_comparison_updated_at();
