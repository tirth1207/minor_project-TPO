-- ============================================================================
-- TPO MANAGEMENT SYSTEM
-- RLS REPAIR MIGRATION
--
-- Fixes:
--   1. Incorrect JWT application-role access
--   2. student_profiles <-> job_postings RLS recursion
--   3. SECURITY DEFINER helper hardening
--   4. Super Admin access
--   5. College Admin / Mentor / Student / Company access
--
-- IMPORTANT:
--   - Does NOT drop tables
--   - Does NOT delete application data
--   - Intended to run as a Supabase migration / postgres owner
-- ============================================================================

begin;


-- ============================================================================
-- 1. JWT CLAIM HELPERS
-- ============================================================================
--
-- Supabase JWT top-level "role" is normally "authenticated".
-- Your application role is stored in app_metadata.role.
--
-- Your existing sync_user_meta_to_auth trigger already writes:
--   role
--   org_id
--   dept_id
-- into auth.users.raw_app_meta_data.
-- ============================================================================

create or replace function public.current_user_role()
returns text
language sql
stable
set search_path = ''
as $$
    select auth.jwt() -> 'app_metadata' ->> 'role';
$$;


create or replace function public.current_org_id()
returns uuid
language sql
stable
set search_path = ''
as $$
    select case
        when nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '') is null
            then null
        else (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    end;
$$;


create or replace function public.current_dept_id()
returns uuid
language sql
stable
set search_path = ''
as $$
    select case
        when nullif(auth.jwt() -> 'app_metadata' ->> 'dept_id', '') is null
            then null
        else (auth.jwt() -> 'app_metadata' ->> 'dept_id')::uuid
    end;
$$;


-- ============================================================================
-- 2. SECURITY DEFINER LOOKUP HELPERS
-- ============================================================================
--
-- These functions intentionally execute as their owner so policy checks can
-- inspect related tables without recursively invoking RLS.
--
-- Explicit public.* references are required because search_path is empty.
-- ============================================================================

create or replace function public.get_student_id_by_user_id(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select s.id
    from public.student_profiles s
    where s.user_id = p_user_id
    limit 1;
$$;


create or replace function public.get_company_id_by_user_id(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select cp.id
    from public.company_profiles cp
    where cp.user_id = p_user_id
    limit 1;
$$;


create or replace function public.get_job_id_by_mapping_id(p_mapping_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select jcm.job_id
    from public.job_college_mappings jcm
    where jcm.id = p_mapping_id
    limit 1;
$$;


-- ============================================================================
-- 3. STUDENT ELIGIBILITY
-- ============================================================================

create or replace function public.check_student_eligibility(
    p_student_id uuid,
    p_job_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1

        from public.student_profiles s

        join public.users u
            on u.id = s.user_id

        join public.job_postings jp
            on jp.id = p_job_id

        join public.job_college_mappings jcm
            on jcm.job_id = jp.id
           and jcm.org_id = u.org_id

        where s.id = p_student_id

          and s.profile_status = 'APPROVED'
          and s.is_placed = false

          and jp.global_status = 'APPROVED'
          and jcm.local_status = 'APPROVED'

          and s.cgpa >= jp.min_cgpa
          and s.active_backlogs <= jp.max_backlogs

          and exists (
              select 1
              from public.job_eligible_branches jeb
              where jeb.job_id = jp.id
                and jeb.branch_name = s.branch
          )
    );
$$;


-- ============================================================================
-- 4. STUDENT VISIBILITY HELPERS
-- ============================================================================

create or replace function public.check_college_admin_view_student(
    p_student_id uuid,
    p_org_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.student_profiles s
        join public.users u
            on u.id = s.user_id
        where s.id = p_student_id
          and u.org_id = p_org_id
    );
$$;


create or replace function public.check_mentor_view_student(
    p_student_id uuid,
    p_dept_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.student_profiles s
        join public.users u
            on u.id = s.user_id
        where s.id = p_student_id
          and u.dept_id = p_dept_id
    );
$$;


create or replace function public.check_mentor_update_student(
    p_student_id uuid,
    p_mentor_uid uuid,
    p_dept_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.student_profiles s
        join public.users u
            on u.id = s.user_id
        where s.id = p_student_id
          and u.dept_id = p_dept_id
          and (
              s.mentor_id = p_mentor_uid
              or s.mentor_id is null
          )
    );
$$;


-- ============================================================================
-- 5. COMPANY -> STUDENT VISIBILITY
-- ============================================================================

create or replace function public.check_company_view_student(
    p_student_id uuid,
    p_company_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1

        from public.applications a

        join public.job_college_mappings jcm
            on jcm.id = a.job_college_map_id

        join public.job_postings jp
            on jp.id = jcm.job_id

        join public.company_profiles cp
            on cp.id = jp.company_id

        where a.student_id = p_student_id
          and cp.user_id = p_company_user_id
    );
$$;


-- ============================================================================
-- 6. JOB HELPERS
-- ============================================================================

create or replace function public.check_job_mapped_to_college(
    p_job_id uuid,
    p_org_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.job_college_mappings jcm
        where jcm.job_id = p_job_id
          and jcm.org_id = p_org_id
    );
$$;


create or replace function public.check_job_mapped_and_approved(
    p_job_id uuid,
    p_org_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.job_college_mappings jcm
        where jcm.job_id = p_job_id
          and jcm.org_id = p_org_id
          and jcm.local_status = 'APPROVED'
    );
$$;


create or replace function public.check_company_owns_job(
    p_job_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.job_postings jp
        join public.company_profiles cp
            on cp.id = jp.company_id
        where jp.id = p_job_id
          and cp.user_id = p_user_id
    );
$$;


create or replace function public.check_company_owns_mapping(
    p_mapping_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1

        from public.job_college_mappings jcm

        join public.job_postings jp
            on jp.id = jcm.job_id

        join public.company_profiles cp
            on cp.id = jp.company_id

        where jcm.id = p_mapping_id
          and cp.user_id = p_user_id
    );
$$;


-- ============================================================================
-- 7. APPLICATION HELPERS
-- ============================================================================

create or replace function public.check_college_admin_view_application(
    p_application_id uuid,
    p_org_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1

        from public.applications a

        join public.student_profiles s
            on s.id = a.student_id

        join public.users u
            on u.id = s.user_id

        where a.id = p_application_id
          and u.org_id = p_org_id
    );
$$;


create or replace function public.check_student_owns_application(
    p_application_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1

        from public.applications a

        join public.student_profiles s
            on s.id = a.student_id

        where a.id = p_application_id
          and s.user_id = p_user_id
    );
$$;


create or replace function public.check_company_owns_application(
    p_application_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1

        from public.applications a

        join public.job_college_mappings jcm
            on jcm.id = a.job_college_map_id

        join public.job_postings jp
            on jp.id = jcm.job_id

        join public.company_profiles cp
            on cp.id = jp.company_id

        where a.id = p_application_id
          and cp.user_id = p_user_id
    );
$$;


-- ============================================================================
-- 8. MOCK INTERVIEW HELPER
-- ============================================================================

create or replace function public.check_company_view_mock(
    p_student_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1

        from public.applications a

        join public.job_college_mappings jcm
            on jcm.id = a.job_college_map_id

        join public.job_postings jp
            on jp.id = jcm.job_id

        join public.company_profiles cp
            on cp.id = jp.company_id

        where a.student_id = p_student_id
          and cp.user_id = p_user_id
          and jp.require_mock = true
    );
$$;


-- ============================================================================
-- 9. GENERIC JOB VISIBILITY HELPER
-- ============================================================================

create or replace function public.check_user_can_view_job(
    p_job_id uuid,
    p_user_id uuid,
    p_role varchar,
    p_org_id uuid,
    p_dept_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

    if p_role = 'SA' then
        return true;
    end if;


    if p_role = 'COMPANY' then
        return public.check_company_owns_job(
            p_job_id,
            p_user_id
        );
    end if;


    if p_role = 'COLLEGE_ADMIN' then
        return public.check_job_mapped_to_college(
            p_job_id,
            p_org_id
        );
    end if;


    if p_role = 'MENTOR' then
        return public.check_job_mapped_and_approved(
            p_job_id,
            p_org_id
        );
    end if;


    if p_role = 'STUDENT' then
        return public.check_job_mapped_and_approved(
            p_job_id,
            p_org_id
        );
    end if;


    return false;

end;
$$;


-- ============================================================================
-- 10. BLIND APPLICATION COUNT
-- ============================================================================

create or replace function public.get_job_applicant_count(
    p_job_college_map_id uuid
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select count(*)::integer
    from public.applications a
    where a.job_college_map_id = p_job_college_map_id;
$$;


-- ============================================================================
-- 11. FUNCTION PERMISSIONS
-- ============================================================================
--
-- Do not allow arbitrary anonymous execution.
-- authenticated users can execute these functions, but the functions themselves
-- only answer access/ownership questions.
-- ============================================================================

revoke all on function public.get_student_id_by_user_id(uuid) from public;
revoke all on function public.get_company_id_by_user_id(uuid) from public;
revoke all on function public.get_job_id_by_mapping_id(uuid) from public;

revoke all on function public.check_student_eligibility(uuid, uuid) from public;
revoke all on function public.check_college_admin_view_student(uuid, uuid) from public;
revoke all on function public.check_mentor_view_student(uuid, uuid) from public;
revoke all on function public.check_mentor_update_student(uuid, uuid, uuid) from public;
revoke all on function public.check_company_view_student(uuid, uuid) from public;

revoke all on function public.check_job_mapped_to_college(uuid, uuid) from public;
revoke all on function public.check_job_mapped_and_approved(uuid, uuid) from public;
revoke all on function public.check_company_owns_job(uuid, uuid) from public;
revoke all on function public.check_company_owns_mapping(uuid, uuid) from public;

revoke all on function public.check_college_admin_view_application(uuid, uuid) from public;
revoke all on function public.check_student_owns_application(uuid, uuid) from public;
revoke all on function public.check_company_owns_application(uuid, uuid) from public;
revoke all on function public.check_company_view_mock(uuid, uuid) from public;

revoke all on function public.get_job_applicant_count(uuid) from public;


grant execute on function public.get_student_id_by_user_id(uuid) to authenticated;
grant execute on function public.get_company_id_by_user_id(uuid) to authenticated;
grant execute on function public.get_job_id_by_mapping_id(uuid) to authenticated;

grant execute on function public.check_student_eligibility(uuid, uuid) to authenticated;
grant execute on function public.check_college_admin_view_student(uuid, uuid) to authenticated;
grant execute on function public.check_mentor_view_student(uuid, uuid) to authenticated;
grant execute on function public.check_mentor_update_student(uuid, uuid, uuid) to authenticated;
grant execute on function public.check_company_view_student(uuid, uuid) to authenticated;

grant execute on function public.check_job_mapped_to_college(uuid, uuid) to authenticated;
grant execute on function public.check_job_mapped_and_approved(uuid, uuid) to authenticated;
grant execute on function public.check_company_owns_job(uuid, uuid) to authenticated;
grant execute on function public.check_company_owns_mapping(uuid, uuid) to authenticated;

grant execute on function public.check_college_admin_view_application(uuid, uuid) to authenticated;
grant execute on function public.check_student_owns_application(uuid, uuid) to authenticated;
grant execute on function public.check_company_owns_application(uuid, uuid) to authenticated;
grant execute on function public.check_company_view_mock(uuid, uuid) to authenticated;

grant execute on function public.get_job_applicant_count(uuid) to authenticated;


-- ============================================================================
-- 12. DROP EXISTING POLICIES
-- ============================================================================
--
-- Drop the policies from the original schema that depend on incorrect JWT
-- fields or recursive helper evaluation.
-- ============================================================================


-- organizations

drop policy if exists
"Super Admins have full access to organizations"
on public.organizations;

drop policy if exists
"College Admins can view own organization"
on public.organizations;


-- departments

drop policy if exists
"Super Admins have full access to departments"
on public.departments;

drop policy if exists
"College Admins can view own college departments"
on public.departments;

drop policy if exists
"College Admins can insert department for own college"
on public.departments;

drop policy if exists
"Mentors can view assigned department"
on public.departments;


-- invite_links

drop policy if exists
"College Admins can view own invite links"
on public.invite_links;

drop policy if exists
"College Admins can create invite links"
on public.invite_links;


-- users

drop policy if exists
"Super Admins can view all users"
on public.users;

drop policy if exists
"College Admins can view users in their college"
on public.users;

drop policy if exists
"Mentors can view users in their department"
on public.users;

drop policy if exists
"Users can view their own user row"
on public.users;


-- company_profiles

drop policy if exists
"Super Admins have full access to company profiles"
on public.company_profiles;

drop policy if exists
"Companies can view self profile"
on public.company_profiles;

drop policy if exists
"Companies can insert self profile"
on public.company_profiles;

drop policy if exists
"Companies can update self profile"
on public.company_profiles;

drop policy if exists
"All authenticated users can view active company profiles"
on public.company_profiles;


-- student_profiles

drop policy if exists
"Super Admins can view all student profiles"
on public.student_profiles;

drop policy if exists
"College Admins can view student profiles in their college"
on public.student_profiles;

drop policy if exists
"Mentors can view student profiles in their department"
on public.student_profiles;

drop policy if exists
"Mentors can update student profiles in their department"
on public.student_profiles;

drop policy if exists
"Students can view self profile"
on public.student_profiles;

drop policy if exists
"Students can insert self profile"
on public.student_profiles;

drop policy if exists
"Students can update self profile"
on public.student_profiles;

drop policy if exists
"Companies can view applicant student profiles"
on public.student_profiles;


-- job_postings

drop policy if exists
"Super Admins can select all job postings"
on public.job_postings;

drop policy if exists
"Super Admins can update all job postings"
on public.job_postings;

drop policy if exists
"Companies can view own job postings"
on public.job_postings;

drop policy if exists
"Companies can insert own job postings"
on public.job_postings;

drop policy if exists
"Companies can update own job postings"
on public.job_postings;

drop policy if exists
"College Admins can view jobs mapped to their college"
on public.job_postings;

drop policy if exists
"Mentors can view approved jobs mapped to their college"
on public.job_postings;

drop policy if exists
"Students can view college-mapped job postings"
on public.job_postings;


-- job_eligible_branches

drop policy if exists
"Allow select on job_eligible_branches if user can select job"
on public.job_eligible_branches;

drop policy if exists
"Companies can manage branches for own jobs"
on public.job_eligible_branches;


-- job_college_mappings

drop policy if exists
"Super Admins can view all job college mappings"
on public.job_college_mappings;

drop policy if exists
"College Admins can view own college mappings"
on public.job_college_mappings;

drop policy if exists
"College Admins can update own college mappings status"
on public.job_college_mappings;

drop policy if exists
"Companies can view mappings for their own jobs"
on public.job_college_mappings;

drop policy if exists
"Companies can create mappings for their own jobs"
on public.job_college_mappings;

drop policy if exists
"Students can view mappings for their own college"
on public.job_college_mappings;


-- applications

drop policy if exists
"Super Admins can view all applications"
on public.applications;

drop policy if exists
"College Admins can view applications from their college"
on public.applications;

drop policy if exists
"Students can view own applications"
on public.applications;

drop policy if exists
"Students can create own applications if eligible"
on public.applications;

drop policy if exists
"Companies can view applications for their jobs"
on public.applications;

drop policy if exists
"Companies can update status of applications for their jobs"
on public.applications;


-- application_rounds

drop policy if exists
"Super Admins can view all application rounds"
on public.application_rounds;

drop policy if exists
"College Admins can view rounds for their college students"
on public.application_rounds;

drop policy if exists
"Students can view own application rounds"
on public.application_rounds;

drop policy if exists
"Companies can view rounds for their jobs"
on public.application_rounds;

drop policy if exists
"Companies can manage rounds for their jobs"
on public.application_rounds;


-- offers

drop policy if exists
"Super Admins can view all offers"
on public.offers;

drop policy if exists
"College Admins can view offers for their college students"
on public.offers;

drop policy if exists
"Students can view own offers"
on public.offers;

drop policy if exists
"Students can update own offers (accept/reject)"
on public.offers;

drop policy if exists
"Companies can view offers for their jobs"
on public.offers;

drop policy if exists
"Companies can manage offers for their jobs"
on public.offers;


-- mock interviews

drop policy if exists
"Students can manage own mock interviews"
on public.mock_interviews;

drop policy if exists
"Companies can read applicant mock scores if mock required"
on public.mock_interviews;


-- notifications

drop policy if exists
"Users can view own notifications"
on public.notifications;

drop policy if exists
"Users can update own notifications"
on public.notifications;


-- ============================================================================
-- 13. ORGANIZATIONS
-- ============================================================================

create policy "Super Admins have full access to organizations"
on public.organizations
for all
to authenticated
using (
    public.current_user_role() = 'SA'
)
with check (
    public.current_user_role() = 'SA'
);


create policy "College Admins can view own organization"
on public.organizations
for select
to authenticated
using (
    public.current_user_role() = 'COLLEGE_ADMIN'
    and id = public.current_org_id()
);


-- ============================================================================
-- 14. DEPARTMENTS
-- ============================================================================

create policy "Super Admins have full access to departments"
on public.departments
for all
to authenticated
using (
    public.current_user_role() = 'SA'
)
with check (
    public.current_user_role() = 'SA'
);


create policy "College Admins can view own college departments"
on public.departments
for select
to authenticated
using (
    public.current_user_role() = 'COLLEGE_ADMIN'
    and org_id = public.current_org_id()
);


create policy "College Admins can insert department for own college"
on public.departments
for insert
to authenticated
with check (
    public.current_user_role() = 'COLLEGE_ADMIN'
    and org_id = public.current_org_id()
);


create policy "Mentors can view assigned department"
on public.departments
for select
to authenticated
using (
    public.current_user_role() = 'MENTOR'
    and id = public.current_dept_id()
);


-- ============================================================================
-- 15. INVITE LINKS
-- ============================================================================

create policy "College Admins can view own invite links"
on public.invite_links
for select
to authenticated
using (
    public.current_user_role() = 'COLLEGE_ADMIN'
    and exists (
        select 1
        from public.departments d
        where d.id = invite_links.dept_id
          and d.org_id = public.current_org_id()
    )
);


create policy "College Admins can create invite links"
on public.invite_links
for insert
to authenticated
with check (
    public.current_user_role() = 'COLLEGE_ADMIN'
    and created_by = auth.uid()
    and exists (
        select 1
        from public.departments d
        where d.id = invite_links.dept_id
          and d.org_id = public.current_org_id()
    )
);


-- ============================================================================
-- 16. USERS
-- ============================================================================

create policy "Super Admins can view all users"
on public.users
for select
to authenticated
using (
    public.current_user_role() = 'SA'
);


create policy "College Admins can view users in their college"
on public.users
for select
to authenticated
using (
    public.current_user_role() = 'COLLEGE_ADMIN'
    and org_id = public.current_org_id()
);


create policy "Mentors can view users in their department"
on public.users
for select
to authenticated
using (
    public.current_user_role() = 'MENTOR'
    and dept_id = public.current_dept_id()
);


create policy "Users can view their own user row"
on public.users
for select
to authenticated
using (
    id = auth.uid()
);


-- ============================================================================
-- 17. COMPANY PROFILES
-- ============================================================================

create policy "Super Admins have full access to company profiles"
on public.company_profiles
for all
to authenticated
using (
    public.current_user_role() = 'SA'
)
with check (
    public.current_user_role() = 'SA'
);


create policy "Companies can view self profile"
on public.company_profiles
for select
to authenticated
using (
    public.current_user_role() = 'COMPANY'
    and user_id = auth.uid()
);


create policy "Companies can insert self profile"
on public.company_profiles
for insert
to authenticated
with check (
    public.current_user_role() = 'COMPANY'
    and user_id = auth.uid()
);


create policy "Companies can update self profile"
on public.company_profiles
for update
to authenticated
using (
    public.current_user_role() = 'COMPANY'
    and user_id = auth.uid()
)
with check (
    public.current_user_role() = 'COMPANY'
    and user_id = auth.uid()
);


create policy "All authenticated users can view active company profiles"
on public.company_profiles
for select
to authenticated
using (
    status = 'ACTIVE'
);


-- ============================================================================
-- 18. STUDENT PROFILES
-- ============================================================================

create policy "Super Admins can view all student profiles"
on public.student_profiles
for select
to authenticated
using (
    public.current_user_role() = 'SA'
);


create policy "College Admins can view student profiles in their college"
on public.student_profiles
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COLLEGE_ADMIN'
        then public.check_college_admin_view_student(
            id,
            public.current_org_id()
        )
        else false
    end
);


create policy "Mentors can view student profiles in their department"
on public.student_profiles
for select
to authenticated
using (
    case
        when public.current_user_role() = 'MENTOR'
        then public.check_mentor_view_student(
            id,
            public.current_dept_id()
        )
        else false
    end
);


create policy "Mentors can update student profiles in their department"
on public.student_profiles
for update
to authenticated
using (
    case
        when public.current_user_role() = 'MENTOR'
        then public.check_mentor_update_student(
            id,
            auth.uid(),
            public.current_dept_id()
        )
        else false
    end
)
with check (
    case
        when public.current_user_role() = 'MENTOR'
        then public.check_mentor_update_student(
            id,
            auth.uid(),
            public.current_dept_id()
        )
        else false
    end
);


create policy "Students can view self profile"
on public.student_profiles
for select
to authenticated
using (
    public.current_user_role() = 'STUDENT'
    and user_id = auth.uid()
);


create policy "Students can insert self profile"
on public.student_profiles
for insert
to authenticated
with check (
    public.current_user_role() = 'STUDENT'
    and user_id = auth.uid()
);


create policy "Students can update self profile"
on public.student_profiles
for update
to authenticated
using (
    public.current_user_role() = 'STUDENT'
    and user_id = auth.uid()
)
with check (
    public.current_user_role() = 'STUDENT'
    and user_id = auth.uid()
);


create policy "Companies can view applicant student profiles"
on public.student_profiles
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then public.check_company_view_student(
            id,
            auth.uid()
        )
        else false
    end
);


-- ============================================================================
-- 19. JOB POSTINGS
-- ============================================================================

create policy "Super Admins can select all job postings"
on public.job_postings
for select
to authenticated
using (
    public.current_user_role() = 'SA'
);


create policy "Super Admins can update all job postings"
on public.job_postings
for update
to authenticated
using (
    public.current_user_role() = 'SA'
)
with check (
    public.current_user_role() = 'SA'
);


create policy "Companies can view own job postings"
on public.job_postings
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then company_id = public.get_company_id_by_user_id(auth.uid())
        else false
    end
);


create policy "Companies can insert own job postings"
on public.job_postings
for insert
to authenticated
with check (
    public.current_user_role() = 'COMPANY'
    and company_id = public.get_company_id_by_user_id(auth.uid())
);


create policy "Companies can update own job postings"
on public.job_postings
for update
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then company_id = public.get_company_id_by_user_id(auth.uid())
        else false
    end
)
with check (
    public.current_user_role() = 'COMPANY'
    and company_id = public.get_company_id_by_user_id(auth.uid())
);


create policy "College Admins can view jobs mapped to their college"
on public.job_postings
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COLLEGE_ADMIN'
        then public.check_job_mapped_to_college(
            id,
            public.current_org_id()
        )
        else false
    end
);


create policy "Mentors can view approved jobs mapped to their college"
on public.job_postings
for select
to authenticated
using (
    case
        when public.current_user_role() = 'MENTOR'
        then public.check_job_mapped_and_approved(
            id,
            public.current_org_id()
        )
        else false
    end
);


create policy "Students can view college-mapped job postings"
on public.job_postings
for select
to authenticated
using (
    case
        when public.current_user_role() = 'STUDENT'
        then public.check_job_mapped_and_approved(
            id,
            public.current_org_id()
        )
        else false
    end
);


-- ============================================================================
-- 20. JOB ELIGIBLE BRANCHES
-- ============================================================================

create policy "Allow select on job_eligible_branches if user can select job"
on public.job_eligible_branches
for select
to authenticated
using (
    public.check_user_can_view_job(
        job_id,
        auth.uid(),
        public.current_user_role(),
        public.current_org_id(),
        public.current_dept_id()
    )
);


create policy "Companies can manage branches for own jobs"
on public.job_eligible_branches
for all
to authenticated
using (
    public.current_user_role() = 'COMPANY'
    and public.check_company_owns_job(job_id, auth.uid())
)
with check (
    public.current_user_role() = 'COMPANY'
    and public.check_company_owns_job(job_id, auth.uid())
);


-- ============================================================================
-- 21. JOB COLLEGE MAPPINGS
-- ============================================================================

create policy "Super Admins can view all job college mappings"
on public.job_college_mappings
for select
to authenticated
using (
    public.current_user_role() = 'SA'
);


create policy "College Admins can view own college mappings"
on public.job_college_mappings
for select
to authenticated
using (
    public.current_user_role() = 'COLLEGE_ADMIN'
    and org_id = public.current_org_id()
);


create policy "College Admins can update own college mappings status"
on public.job_college_mappings
for update
to authenticated
using (
    public.current_user_role() = 'COLLEGE_ADMIN'
    and org_id = public.current_org_id()
)
with check (
    public.current_user_role() = 'COLLEGE_ADMIN'
    and org_id = public.current_org_id()
);


create policy "Companies can view mappings for their own jobs"
on public.job_college_mappings
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then public.check_company_owns_job(
            job_id,
            auth.uid()
        )
        else false
    end
);


create policy "Companies can create mappings for their own jobs"
on public.job_college_mappings
for insert
to authenticated
with check (
    public.current_user_role() = 'COMPANY'
    and public.check_company_owns_job(
        job_id,
        auth.uid()
    )
);


create policy "Students can view mappings for their own college"
on public.job_college_mappings
for select
to authenticated
using (
    public.current_user_role() = 'STUDENT'
    and org_id = public.current_org_id()
);


-- ============================================================================
-- 22. APPLICATIONS
-- ============================================================================

create policy "Super Admins can view all applications"
on public.applications
for select
to authenticated
using (
    public.current_user_role() = 'SA'
);


create policy "College Admins can view applications from their college"
on public.applications
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COLLEGE_ADMIN'
        then public.check_college_admin_view_student(
            student_id,
            public.current_org_id()
        )
        else false
    end
);


create policy "Students can view own applications"
on public.applications
for select
to authenticated
using (
    public.current_user_role() = 'STUDENT'
    and student_id = public.get_student_id_by_user_id(auth.uid())
);


create policy "Students can create own applications if eligible"
on public.applications
for insert
to authenticated
with check (
    public.current_user_role() = 'STUDENT'

    and student_id =
        public.get_student_id_by_user_id(auth.uid())

    and public.check_student_eligibility(
        student_id,
        public.get_job_id_by_mapping_id(job_college_map_id)
    )
);


create policy "Companies can view applications for their jobs"
on public.applications
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then public.check_company_owns_mapping(
            job_college_map_id,
            auth.uid()
        )
        else false
    end
);


create policy "Companies can update status of applications for their jobs"
on public.applications
for update
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then public.check_company_owns_mapping(
            job_college_map_id,
            auth.uid()
        )
        else false
    end
)
with check (
    public.current_user_role() = 'COMPANY'
    and public.check_company_owns_mapping(
        job_college_map_id,
        auth.uid()
    )
);


-- ============================================================================
-- 23. APPLICATION ROUNDS
-- ============================================================================

create policy "Super Admins can view all application rounds"
on public.application_rounds
for select
to authenticated
using (
    public.current_user_role() = 'SA'
);


create policy "College Admins can view rounds for their college students"
on public.application_rounds
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COLLEGE_ADMIN'
        then public.check_college_admin_view_application(
            application_id,
            public.current_org_id()
        )
        else false
    end
);


create policy "Students can view own application rounds"
on public.application_rounds
for select
to authenticated
using (
    case
        when public.current_user_role() = 'STUDENT'
        then public.check_student_owns_application(
            application_id,
            auth.uid()
        )
        else false
    end
);


create policy "Companies can view rounds for their jobs"
on public.application_rounds
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then public.check_company_owns_application(
            application_id,
            auth.uid()
        )
        else false
    end
);


create policy "Companies can manage rounds for their jobs"
on public.application_rounds
for all
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then public.check_company_owns_application(
            application_id,
            auth.uid()
        )
        else false
    end
)
with check (
    public.current_user_role() = 'COMPANY'
    and public.check_company_owns_application(
        application_id,
        auth.uid()
    )
);


-- ============================================================================
-- 24. OFFERS
-- ============================================================================

create policy "Super Admins can view all offers"
on public.offers
for select
to authenticated
using (
    public.current_user_role() = 'SA'
);


create policy "College Admins can view offers for their college students"
on public.offers
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COLLEGE_ADMIN'
        then public.check_college_admin_view_application(
            application_id,
            public.current_org_id()
        )
        else false
    end
);


create policy "Students can view own offers"
on public.offers
for select
to authenticated
using (
    case
        when public.current_user_role() = 'STUDENT'
        then public.check_student_owns_application(
            application_id,
            auth.uid()
        )
        else false
    end
);


create policy "Students can update own offers (accept/reject)"
on public.offers
for update
to authenticated
using (
    case
        when public.current_user_role() = 'STUDENT'
        then public.check_student_owns_application(
            application_id,
            auth.uid()
        )
        else false
    end
)
with check (
    public.current_user_role() = 'STUDENT'
    and public.check_student_owns_application(
        application_id,
        auth.uid()
    )
);


create policy "Companies can view offers for their jobs"
on public.offers
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then public.check_company_owns_application(
            application_id,
            auth.uid()
        )
        else false
    end
);


create policy "Companies can manage offers for their jobs"
on public.offers
for all
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then public.check_company_owns_application(
            application_id,
            auth.uid()
        )
        else false
    end
)
with check (
    public.current_user_role() = 'COMPANY'
    and public.check_company_owns_application(
        application_id,
        auth.uid()
    )
);


-- ============================================================================
-- 25. MOCK INTERVIEWS
-- ============================================================================

create policy "Students can manage own mock interviews"
on public.mock_interviews
for all
to authenticated
using (
    public.current_user_role() = 'STUDENT'
    and student_id = public.get_student_id_by_user_id(auth.uid())
)
with check (
    public.current_user_role() = 'STUDENT'
    and student_id = public.get_student_id_by_user_id(auth.uid())
);


create policy "Companies can read applicant mock scores if mock required"
on public.mock_interviews
for select
to authenticated
using (
    case
        when public.current_user_role() = 'COMPANY'
        then public.check_company_view_mock(
            student_id,
            auth.uid()
        )
        else false
    end
);


-- ============================================================================
-- 26. NOTIFICATIONS
-- ============================================================================

create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (
    user_id = auth.uid()
);


create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (
    user_id = auth.uid()
)
with check (
    user_id = auth.uid()
);


-- ============================================================================
-- 27. ENSURE RLS REMAINS ENABLED
-- ============================================================================

alter table public.organizations enable row level security;
alter table public.departments enable row level security;
alter table public.invite_links enable row level security;
alter table public.users enable row level security;
alter table public.company_profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.job_postings enable row level security;
alter table public.job_eligible_branches enable row level security;
alter table public.job_college_mappings enable row level security;
alter table public.applications enable row level security;
alter table public.application_rounds enable row level security;
alter table public.offers enable row level security;
alter table public.mock_interviews enable row level security;
alter table public.notifications enable row level security;


commit;