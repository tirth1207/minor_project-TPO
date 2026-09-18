-- =====================================================================
-- Supabase TPO Management System Database Schema Initialization
-- =====================================================================

-- Enable extensions
create extension if not exists "uuid-ossp";

-- =====================================================================
-- 1. Custom Types (Enums)
-- =====================================================================

create type public.user_role as enum ('SA', 'COLLEGE_ADMIN', 'MENTOR', 'STUDENT', 'COMPANY');
create type public.approval_status as enum ('PENDING', 'ACTIVE', 'REJECTED');
create type public.profile_approval_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type public.work_mode_type as enum ('REMOTE', 'ONSITE', 'HYBRID');
create type public.global_status_type as enum ('PENDING', 'APPROVED', 'REJECTED');
create type public.local_status_type as enum ('PENDING', 'APPROVED', 'REJECTED');
create type public.application_status_type as enum ('APPLIED', 'WITHDRAWN', 'SHORTLISTED', 'REJECTED', 'OFFERED');
create type public.round_status_type as enum ('PENDING', 'CLEARED', 'FAILED', 'SCHEDULED');
create type public.offer_status_type as enum ('EXTENDED', 'ACCEPTED', 'REJECTED', 'REVOKED', 'AUTO_WITHDRAWN');
create type public.mock_status_type as enum ('REQUESTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'ANSWERING', 'EVALUATING', 'EVALUATED');

-- =====================================================================
-- 2. Tables Definition
-- =====================================================================

-- 2.1 organizations Table
create table public.organizations (
    id uuid primary key default gen_random_uuid(),
    name varchar not null,
    status public.approval_status not null default 'PENDING',
    created_at timestamptz not null default now()
);

-- 2.2 departments Table
create table public.departments (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organizations(id) on delete cascade,
    name varchar not null,
    status public.approval_status not null default 'PENDING',
    created_at timestamptz not null default now()
);

-- 2.3 invite_links Table
create table public.invite_links (
    id uuid primary key default gen_random_uuid(),
    dept_id uuid not null references public.departments(id) on delete cascade,
    token varchar not null unique,
    used_count int not null default 0,
    created_by uuid not null references auth.users(id) on delete cascade,
    expires_at timestamptz not null
);

-- 2.4 users Table (1:1 with auth.users)
create table public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    role public.user_role not null,
    org_id uuid references public.organizations(id) on delete cascade,
    dept_id uuid references public.departments(id) on delete cascade,
    
    constraint check_role_org_dept check (
        (role = 'SA' and org_id is null and dept_id is null) or
        (role = 'COMPANY' and org_id is null and dept_id is null) or
        (role = 'COLLEGE_ADMIN' and org_id is not null and dept_id is null) or
        (role = 'MENTOR' and org_id is not null and dept_id is not null) or
        (role = 'STUDENT' and org_id is not null and dept_id is not null)
    )
);

-- 2.5 company_profiles Table
create table public.company_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade unique,
    company_name varchar not null,
    website varchar,
    status public.approval_status not null default 'PENDING'
);

-- 2.6 student_profiles Table
create table public.student_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade unique,
    enrollment_no varchar not null unique,
    name varchar not null,
    dob date,
    address text,
    phone varchar,
    bio text,
    cgpa decimal(3,2) not null default 0.00 check (cgpa >= 0.00 and cgpa <= 10.00),
    active_backlogs int not null default 0 check (active_backlogs >= 0),
    semester int not null check (semester >= 1 and semester <= 10),
    branch varchar not null,
    skills text[],  
    hobbies text[],
    resume_url varchar not null,
    marksheet_url varchar,
    social_links jsonb default '{}'::jsonb,
    profile_status public.profile_approval_status not null default 'PENDING',
    is_placed boolean not null default false,
    mentor_id uuid references public.users(id) on delete set null
);

-- 2.7 job_postings Table
create table public.job_postings (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.company_profiles(id) on delete cascade,
    title varchar not null,
    description text not null,
    ctc_min decimal check (ctc_min >= 0),
    ctc_max decimal check (ctc_max >= 0),
    location varchar not null,
    work_mode public.work_mode_type not null,
    min_cgpa decimal(3,2) not null default 0.00 check (min_cgpa >= 0.00 and min_cgpa <= 10.00),
    max_backlogs int not null default 0 check (max_backlogs >= 0),
    date_of_visit date,
    require_mock boolean not null default false,
    mock_pass_score int default 50 check (mock_pass_score >= 0 and mock_pass_score <= 100),
    global_status public.global_status_type not null default 'PENDING',
    rounds jsonb not null default '[]'::jsonb
);

-- 2.8 job_eligible_branches Table
create table public.job_eligible_branches (
    job_id uuid not null references public.job_postings(id) on delete cascade,
    branch_name varchar not null,
    primary key (job_id, branch_name)
);

-- 2.9 job_college_mappings Table
create table public.job_college_mappings (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references public.job_postings(id) on delete cascade,
    org_id uuid not null references public.organizations(id) on delete cascade,
    local_status public.local_status_type not null default 'PENDING',
    unique (job_id, org_id)
);

-- 2.10 applications Table
create table public.applications (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.student_profiles(id) on delete cascade,
    job_college_map_id uuid not null references public.job_college_mappings(id) on delete cascade,
    status public.application_status_type not null default 'APPLIED',
    applied_at timestamptz not null default now(),
    mock_score int check (mock_score >= 0 and mock_score <= 100),
    unique (student_id, job_college_map_id)
);

-- 2.11 application_rounds Table
create table public.application_rounds (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references public.applications(id) on delete cascade,
    round_name varchar not null,
    status public.round_status_type not null default 'PENDING',
    company_feedback text
);

-- 2.12 offers Table
create table public.offers (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references public.applications(id) on delete cascade unique,
    ctc_offered decimal not null check (ctc_offered >= 0),
    status public.offer_status_type not null default 'EXTENDED',
    extended_at timestamptz not null default now(),
    decided_at timestamptz
);

-- 2.13 mock_interviews Table
create table public.mock_interviews (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.student_profiles(id) on delete cascade,
    job_role_context varchar not null,
    questions jsonb not null default '[]'::jsonb,
    answers jsonb not null default '[]'::jsonb,
    ai_score int check (ai_score >= 0 and ai_score <= 100),
    ai_feedback text,
    overall_score int check (overall_score >= 0 and overall_score <= 100),
    ai_summary text,
    ai_results jsonb,
    completed_at timestamptz,
    status public.mock_status_type not null default 'REQUESTED',
    retry_count integer not null default 0
);

-- 2.14 notifications Table
create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    title varchar not null,
    message text not null,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

-- =====================================================================
-- 3. Performance Indexes
-- =====================================================================

create index idx_users_org_id on public.users(org_id);
create index idx_users_dept_id on public.users(dept_id);
create index idx_users_role on public.users(role);

create index idx_departments_org_id on public.departments(org_id);

create index idx_student_profiles_cgpa on public.student_profiles(cgpa);
create index idx_student_profiles_branch on public.student_profiles(branch);
create index idx_student_profiles_is_placed on public.student_profiles(is_placed);
create index idx_student_profiles_status on public.student_profiles(profile_status);
create index idx_student_profiles_mentor_id on public.student_profiles(mentor_id);

create index idx_job_postings_company_id on public.job_postings(company_id);
create index idx_job_postings_global_status on public.job_postings(global_status);

create index idx_job_college_mappings_job_id on public.job_college_mappings(job_id);
create index idx_job_college_mappings_org_id on public.job_college_mappings(org_id);
create index idx_job_college_mappings_local_status on public.job_college_mappings(local_status);

create index idx_applications_student_id on public.applications(student_id);
create index idx_applications_job_college_map_id on public.applications(job_college_map_id);
create index idx_applications_status on public.applications(status);

create index idx_offers_application_id on public.offers(application_id);
create index idx_offers_status on public.offers(status);

create index idx_notifications_user_id_is_read on public.notifications(user_id, is_read);

create index idx_mock_interviews_status on public.mock_interviews(status);

-- =====================================================================
-- 4. Helper Functions
-- =====================================================================

-- 4.1 Job Eligibility Engine
-- Verifies if a student is eligible for a specific job posting
create or replace function public.normalize_skill(p_skill text)
returns text
language plpgsql
immutable
as $$
declare
    v_raw text;
begin
    v_raw := lower(trim(coalesce(p_skill, '')));
    if v_raw = '' then
        return '';
    end if;

    case v_raw
        when 'c++', 'c plus plus' then return 'cpp';
        when 'c#', 'c sharp' then return 'csharp';
        when '.net', 'asp.net' then return 'dotnet';
        when 'node.js', 'node js', 'nodejs', 'node' then return 'nodejs';
        when 'react.js', 'react js', 'reactjs', 'react' then return 'reactjs';
        when 'next.js', 'next js', 'nextjs' then return 'nextjs';
        when 'vue.js', 'vue js', 'vuejs' then return 'vuejs';
        when 'express.js', 'express js', 'expressjs' then return 'expressjs';
        when 'tailwind css', 'tailwind' then return 'tailwind';
        when 'postgresql', 'postgre sql', 'postgres' then return 'postgres';
        when 'mongo db', 'mongodb' then return 'mongodb';
        when 'machine learning', 'machinelearning' then return 'machinelearning';
        when 'deep learning', 'deeplearning' then return 'deeplearning';
        when 'artificial intelligence', 'ai' then return 'ai';
        when 'amazon web services', 'aws' then return 'aws';
        when 'google cloud platform', 'gcp' then return 'gcp';
        when 'microsoft azure', 'azure' then return 'azure';
        else
            return regexp_replace(regexp_replace(v_raw, '\s+', '', 'g'), '[._\-/#+]+', '', 'g');
    end case;
end;
$$;

create or replace function public.check_student_eligibility(
    p_student_id uuid,
    p_job_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_eligible boolean;
begin
    select exists (
        select 1
        from public.student_profiles s
        join public.users u
          on s.user_id = u.id
        join public.job_college_mappings jcm
          on jcm.org_id = u.org_id
         and jcm.job_id = p_job_id
        join public.job_postings j
          on j.id = p_job_id
        where s.id = p_student_id

          and s.profile_status = 'APPROVED'
          and s.is_placed = false

          and j.global_status = 'APPROVED'
          and jcm.local_status = 'APPROVED'

          and (
              not exists (
                  select 1 from public.job_eligible_branches jeb
                  where jeb.job_id = p_job_id
              )
              or exists (
                  select 1
                  from public.job_eligible_branches jeb
                  where jeb.job_id = p_job_id
                    and lower(trim(jeb.branch_name)) = lower(trim(coalesce(s.branch, '')))
              )
          )

          and coalesce(s.cgpa, 0) >= coalesce(j.min_cgpa, 0)
          and coalesce(s.active_backlogs, 0) <= coalesce(j.max_backlogs, 0)

          and (
              j.skills is null
              or array_length(j.skills, 1) is null
              or array_length(j.skills, 1) = 0
              or not exists (
                  select 1
                  from unnest(j.skills) req_skill
                  where not exists (
                      select 1
                      from unnest(coalesce(s.skills, '{}'::text[])) stud_skill
                      where public.normalize_skill(stud_skill) = public.normalize_skill(req_skill)
                  )
              )
          )
    )
    into v_eligible;

    return coalesce(v_eligible, false);
end;
$$;

-- 4.2 Blind Count Helper Function
-- Returns applicant count without exposing user identities to other students
create or replace function public.get_job_applicant_count(p_job_college_map_id uuid)
returns integer as $$
declare
    v_count integer;
begin
    select count(*) into v_count
    from public.applications
    where job_college_map_id = p_job_college_map_id;
    
    return v_count;
end;
$$ language plpgsql stable security definer;

-- 4.3 Policy Security Definer Helper Functions
-- Used to prevent infinite recursion in RLS policies by bypassing policy evaluation internally

create or replace function public.get_student_id_by_user_id(p_user_id uuid)
returns uuid as $$
  select id from public.student_profiles where user_id = p_user_id;
$$ language sql stable security definer;

create or replace function public.get_company_id_by_user_id(p_user_id uuid)
returns uuid as $$
  select id from public.company_profiles where user_id = p_user_id;
$$ language sql stable security definer;

create or replace function public.get_job_id_by_mapping_id(p_mapping_id uuid)
returns uuid as $$
  select job_id from public.job_college_mappings where id = p_mapping_id;
$$ language sql stable security definer;

create or replace function public.check_company_view_student(p_student_id uuid, p_company_user_id uuid)
returns boolean as $$
declare
    v_company_id uuid;
begin
    select id into v_company_id from public.company_profiles where user_id = p_company_user_id;
    if v_company_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.applications a
        join public.job_college_mappings jcm on a.job_college_map_id = jcm.id
        join public.job_postings jp on jcm.job_id = jp.id
        where a.student_id = p_student_id
          and jp.company_id = v_company_id
    );
end;
$$ language plpgsql stable security definer;

create or replace function public.check_college_admin_view_student(p_student_id uuid, p_org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.student_profiles s
    join public.users u on s.user_id = u.id
    where s.id = p_student_id and u.org_id = p_org_id
  );
$$ language sql stable security definer;

create or replace function public.check_mentor_view_student(p_student_id uuid, p_dept_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.student_profiles s
    join public.users u on s.user_id = u.id
    where s.id = p_student_id and u.dept_id = p_dept_id
  );
$$ language sql stable security definer;

create or replace function public.check_mentor_update_student(p_student_id uuid, p_mentor_uid uuid, p_dept_id uuid)
returns boolean as $$
declare
    v_mentor_id uuid;
begin
    select mentor_id into v_mentor_id from public.student_profiles where id = p_student_id;
    if v_mentor_id = p_mentor_uid then
        return true;
    end if;
    if v_mentor_id is null then
        return exists (
            select 1 from public.student_profiles s
            join public.users u on s.user_id = u.id
            where s.id = p_student_id and u.dept_id = p_dept_id
        );
    end if;
    return false;
end;
$$ language plpgsql stable security definer;

create or replace function public.check_job_mapped_to_college(p_job_id uuid, p_org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.job_college_mappings
    where job_id = p_job_id and org_id = p_org_id
  );
$$ language sql stable security definer;

create or replace function public.check_job_mapped_and_approved(p_job_id uuid, p_org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.job_college_mappings
    where job_id = p_job_id and org_id = p_org_id and local_status = 'APPROVED'
  );
$$ language sql stable security definer;

create or replace function public.check_user_can_view_job(p_job_id uuid, p_user_id uuid, p_role varchar, p_org_id uuid, p_dept_id uuid)
returns boolean as $$
begin
    if p_role = 'SA' then
        return true;
    end if;
    if p_role = 'COMPANY' then
        return exists (
            select 1 from public.job_postings jp
            join public.company_profiles cp on jp.company_id = cp.id
            where jp.id = p_job_id and cp.user_id = p_user_id
        );
    end if;
    if p_role = 'COLLEGE_ADMIN' then
        return exists (
            select 1 from public.job_college_mappings
            where job_id = p_job_id and org_id = p_org_id
        );
    end if;
    if p_role = 'MENTOR' then
        return exists (
            select 1 from public.job_college_mappings
            where job_id = p_job_id and org_id = p_org_id and local_status = 'APPROVED'
        );
    end if;
    if p_role = 'STUDENT' then
        return public.check_job_mapped_and_approved(p_job_id, p_org_id);
    end if;
    return false;
end;
$$ language plpgsql stable security definer;

create or replace function public.check_company_owns_job(p_job_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.job_postings jp
    join public.company_profiles cp on jp.company_id = cp.id
    where jp.id = p_job_id and cp.user_id = p_user_id
  );
$$ language sql stable security definer;

create or replace function public.check_company_owns_mapping(p_mapping_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.job_college_mappings jcm
    join public.job_postings jp on jcm.job_id = jp.id
    join public.company_profiles cp on jp.company_id = cp.id
    where jcm.id = p_mapping_id and cp.user_id = p_user_id
  );
$$ language sql stable security definer;

create or replace function public.check_college_admin_view_application(p_application_id uuid, p_org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.applications a
    join public.student_profiles s on a.student_id = s.id
    join public.users u on s.user_id = u.id
    where a.id = p_application_id and u.org_id = p_org_id
  );
$$ language sql stable security definer;

create or replace function public.check_student_owns_application(p_application_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.applications a
    join public.student_profiles s on a.student_id = s.id
    where a.id = p_application_id and s.user_id = p_user_id
  );
$$ language sql stable security definer;

create or replace function public.check_company_owns_application(p_application_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.applications a
    join public.job_college_mappings jcm on a.job_college_map_id = jcm.id
    join public.job_postings jp on jcm.job_id = jp.id
    join public.company_profiles cp on jp.company_id = cp.id
    where a.id = p_application_id and cp.user_id = p_user_id
  );
$$ language sql stable security definer;

create or replace function public.check_company_view_mock(p_student_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.applications a
    join public.job_college_mappings jcm on a.job_college_map_id = jcm.id
    join public.job_postings jp on jcm.job_id = jp.id
    join public.company_profiles cp on jp.company_id = cp.id
    where a.student_id = p_student_id
      and cp.user_id = p_user_id
      and jp.require_mock = true
  );
$$ language sql stable security definer;

-- =====================================================================
-- 4.4 Notification Helper Functions
-- Helper function to create notifications
create or replace function public.create_notification(
    p_user_id uuid,
    p_title varchar,
    p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as 
begin
    insert into public.notifications (user_id, title, message, is_read)
    values (p_user_id, p_title, p_message, false);
end;

-- 5. Trigger Functions
-- =====================================================================

-- 5.1 Synchronize JWT claims into auth.users.raw_app_meta_data
create or replace function public.sync_user_meta_to_auth()
returns trigger as $$
begin
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'role', NEW.role,
            'org_id', NEW.org_id,
            'dept_id', NEW.dept_id
        )
    where id = NEW.id;
    return NEW;
end;
$$ language plpgsql security definer;

create trigger on_public_user_upsert
    after insert or update on public.users
    for each row execute function public.sync_user_meta_to_auth();

-- 5.2 Reset student profile status to PENDING on critical field updates
create or replace function public.handle_critical_profile_update()
returns trigger as $$
begin
    if (OLD.name is distinct from NEW.name or
        OLD.cgpa is distinct from NEW.cgpa or
        OLD.resume_url is distinct from NEW.resume_url) then
        NEW.profile_status := 'PENDING';
    end if;
    return NEW;
end;
$$ language plpgsql security definer;

create trigger on_student_profile_critical_update
    before update on public.student_profiles
    for each row execute function public.handle_critical_profile_update();

-- 5.3 Prevent Company job posting if account is not ACTIVE (Approved)
create or replace function public.check_company_active_before_job_post()
returns trigger as $$
declare
    v_status public.approval_status;
begin
    select status into v_status
    from public.company_profiles
    where id = NEW.company_id;

    if v_status is distinct from 'ACTIVE' then
        raise exception 'Company account is not active. Job postings are forbidden.';
    end if;
    return NEW;
end;
$$ language plpgsql security definer;

create trigger before_job_posting_insert
    before insert on public.job_postings
    for each row execute function public.check_company_active_before_job_post();

-- 5.4 Offer Acceptance State Machine Transition Trigger
create or replace function public.handle_offer_acceptance()
returns trigger as $$
declare
    v_student_id uuid;
begin
    -- Handle transition to ACCEPTED
    if NEW.status = 'ACCEPTED' and (OLD.status is distinct from 'ACCEPTED') then
        -- Find student
        select student_id into v_student_id
        from public.applications
        where id = NEW.application_id;

        -- 1. Flip student to placed (blocks further job viewing/applying)
        update public.student_profiles
        SET is_placed = true
        where id = v_student_id;

        -- 2. Update the accepted application's status to OFFERED
        update public.applications
        set status = 'OFFERED'
        where id = NEW.application_id;

        -- 3. Automatically withdraw other active offers for this student
        update public.offers
        set status = 'AUTO_WITHDRAWN',
            decided_at = now()
        where application_id in (
            select id from public.applications 
            where student_id = v_student_id and id <> NEW.application_id
        ) and status = 'EXTENDED';

        -- 4. Automatically withdraw all other active applications
        update public.applications
        set status = 'WITHDRAWN'
        where student_id = v_student_id 
          and id <> NEW.application_id
          and status in ('APPLIED', 'SHORTLISTED');
          
        NEW.decided_at := now();
    -- Handle timestamps for other terminal decisions (REJECTED, REVOKED)
    elsif NEW.status in ('REJECTED', 'REVOKED') and (OLD.status is distinct from NEW.status) then
        NEW.decided_at := now();
    end if;
    
    return NEW;
end;
$$ language plpgsql security definer;

create trigger on_offer_accepted
    before update on public.offers
    for each row execute function public.handle_offer_acceptance();

-- 5.5 Student-Mentor Assignment Validation Trigger
create or replace function public.validate_student_mentor()
returns trigger as $$
declare
    v_mentor_role public.user_role;
    v_mentor_dept uuid;
    v_student_dept uuid;
begin
    if NEW.mentor_id is not null then
        -- Get mentor details
        select role, dept_id into v_mentor_role, v_mentor_dept
        from public.users
        where id = NEW.mentor_id;

        -- Get student department
        select dept_id into v_student_dept
        from public.users
        where id = NEW.user_id;

        if v_mentor_role is distinct from 'MENTOR' then
            raise exception 'Assigned mentor_id must have the role MENTOR';
        end if;

        if v_mentor_dept is distinct from v_student_dept then
            raise exception 'Student and Mentor must belong to the same department';
        end if;
    end if;
    return NEW;
end;
$$ language plpgsql security definer;

create trigger trigger_validate_student_mentor
    before insert or update of mentor_id, user_id on public.student_profiles
    for each row execute function public.validate_student_mentor();

-- 5.6 Student Profile Status Change Notification Trigger
create or replace function public.notify_student_profile_status_change()
returns trigger as $$
begin
  -- Check if profile_status actually changed
  if OLD.profile_status is distinct from NEW.profile_status then
    -- Determine the notification title and message based on new status
    declare
      v_title text;
      v_message text;
    begin
      if NEW.profile_status = 'APPROVED' then
        v_title := 'Profile Approved';
        v_message := 'Congratulations! Your profile has been approved and you are now eligible to apply for jobs.';
      elsif NEW.profile_status = 'REJECTED' then
        v_title := 'Profile Rejected';
        v_message := 'Your profile has been rejected. Please check your profile for any issues and resubmit for approval.';
      elsif NEW.profile_status = 'PENDING' then
        v_title := 'Profile Pending';
        v_message := 'Your profile is now pending approval. Please make sure all required fields are filled out correctly.';
      end if;
      
      -- Create the notification
      perform public.create_notification(
        NEW.user_id,
        v_title,
        v_message
      );
    end;
  end if;
  
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_student_profile_status_change
    after update on public.student_profiles
    for each row execute function public.notify_student_profile_status_change();

-- 5.7 Job Approval/Rejection Notification Trigger
create or replace function public.notify_job_approval_status_change()
returns trigger as $$
begin
  -- Check if global_status actually changed
  if OLD.global_status is distinct from NEW.global_status then
    -- Determine the notification title and message based on new status
    declare
      v_title text;
      v_message text;
      v_company_user_id uuid;
    begin
      -- Get the company user ID
      select user_id into v_company_user_id
      from public.company_profiles
      where id = NEW.company_id;
      
      if NEW.global_status = 'APPROVED' then
        v_title := 'Job Approved';
        v_message := 'Your job posting "' || NEW.title || '" has been approved and is now visible to students.';
      elsif NEW.global_status = 'REJECTED' then
        v_title := 'Job Rejected';
        v_message := 'Your job posting "' || NEW.title || '" has been rejected. Please review the feedback and resubmit.';
      else -- PENDING or other status
        v_title := 'Job Pending';
        v_message := 'Your job posting "' || NEW.title || '" is pending approval.';
      end if;
      
      -- Create the notification
      perform public.create_notification(
        v_company_user_id,
        v_title,
        v_message
      );
    end;
  end if;
  
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_job_approval_status_change
    after update on public.job_postings
    for each row execute function public.notify_job_approval_status_change();

-- 5.8 Application Status Change Notification Trigger
create or replace function public.notify_application_status_change()
returns trigger as $$
begin
  -- Check if status actually changed
  if OLD.status is distinct from NEW.status then
    -- Determine the notification title and message based on new status
    declare
      v_title text;
      v_message text;
      v_student_user_id uuid;
      v_job_title text;
    begin
      -- Get the student user ID and job title
      select s.user_id, jp.title into v_student_user_id, v_job_title
      from public.applications a
      join public.student_profiles s on a.student_id = s.id
      join public.job_college_mappings jcm on a.job_college_map_id = jcm.id
      join public.job_postings jp on jcm.job_id = jp.id
      where a.id = NEW.id;
      
      if NEW.status = 'SHORTLISTED' then
        v_title := 'Application Shortlisted';
        v_message := 'Congratulations! Your application for "' || v_job_title || '" has been shortlisted.';
      elsif NEW.status = 'REJECTED' then
        v_title := 'Application Rejected';
        v_message := 'We regret to inform you that your application for "' || v_job_title || '" has been rejected.';
      elsif NEW.status = 'OFFERED' then
        v_title := 'Application Offered';
        v_message := 'Great news! Your application for "' || v_job_title || '" has been offered a position.';
      elsif NEW.status = 'WITHDRAWN' then
        v_title := 'Application Withdrawn';
        v_message := 'Your application for "' || v_job_title || '" has been withdrawn.';
      else -- APPLIED or other status
        v_title := 'Application Status Updated';
        v_message := 'The status of your application for "' || v_job_title || '" has been updated to ' || initcap(lower(NEW.status::text)) || '.';
      end if;
      
      -- Create the notification
      perform public.create_notification(
        v_student_user_id,
        v_title,
        v_message
      );
    end;
  end if;
  
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_application_status_change
    after update on public.applications
    for each row execute function public.notify_application_status_change();

-- 5.9 Offer Status Change Notification Trigger
create or replace function public.notify_offer_status_change()
returns trigger as $$
begin
  -- Check if status actually changed
  if OLD.status is distinct from NEW.status then
    -- Determine the notification title and message based on new status
    declare
      v_title text;
      v_message text;
      v_student_user_id uuid;
      v_job_title text;
      v_ctc_offered decimal;
    begin
      -- Get the student user ID, job title, and CTC offered
      select s.user_id, jp.title, NEW.ctc_offered into v_student_user_id, v_job_title, v_ctc_offered
      from public.offers o
      join public.applications a on o.application_id = a.id
      join public.student_profiles s on a.student_id = s.id
      join public.job_college_mappings jcm on a.job_college_map_id = jcm.id
      join public.job_postings jp on jcm.job_id = jp.id
      where o.id = NEW.id;
      
      if NEW.status = 'ACCEPTED' then
        v_title := 'Offer Accepted';
        v_message := 'Congratulations! You have accepted the job offer for "' || v_job_title || '" with a CTC of ' || v_ctc_offered || ' LPA.';
      elsif NEW.status = 'REJECTED' then
        v_title := 'Offer Rejected';
        v_message := 'You have rejected the job offer for "' || v_job_title || '" with a CTC of ' || v_ctc_offered || ' LPA.';
      elsif NEW.status = 'REVOKED' then
        v_title := 'Offer Revoked';
        v_message := 'The job offer for "' || v_job_title || '" with a CTC of ' || v_ctc_offered || ' LPA has been revoked by the company.';
      elsif NEW.status = 'AUTO_WITHDRAWN' then
        v_title := 'Offer Auto-Withdrawn';
        v_message := 'The job offer for "' || v_job_title || '" with a CTC of ' || v_ctc_offered || ' LPA has been automatically withdrawn as you have accepted another offer.';
      else -- EXTENDED or other status
        v_title := 'Offer Updated';
        v_message := 'The status of your job offer for "' || v_job_title || '" has been updated to ' || initcap(lower(NEW.status::text)) || '.';
      end if;
      
      -- Create the notification
      perform public.create_notification(
        v_student_user_id,
        v_title,
        v_message
      );
    end;
  end if;
  
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_offer_status_change
    after update on public.offers
    for each row execute function public.notify_offer_status_change();

-- 5.10 Interview Scheduling Notification Trigger
create or replace function public.notify_interview_scheduling()
returns trigger as $$
begin
  -- Check if this is an insert or if status changed to SCHEDULED
  if (TG_OP = 'INSERT') or 
     (TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status and NEW.status = 'SCHEDULED') then
    -- Determine the notification title and message
    declare
      v_title text;
      v_message text;
      v_student_user_id uuid;
      v_round_name text;
      v_job_title text;
    begin
      -- Get the student user ID, round name, and job title
      select s.user_id, NEW.round_name, jp.title into v_student_user_id, v_round_name, v_job_title
      from public.application_rounds ar
      join public.applications a on ar.application_id = a.id
      join public.student_profiles s on a.student_id = s.id
      join public.job_college_mappings jcm on a.job_college_map_id = jcm.id
      join public.job_postings jp on jcm.job_id = jp.id
      where ar.id = NEW.id;
      
      if TG_OP = 'INSERT' then
        v_title := 'Interview Round Scheduled';
        v_message := 'You have been scheduled for a "' || v_round_name || '" interview round for the job "' || v_job_title || '". Please prepare accordingly.';
      else -- UPDATE and status changed to SCHEDULED
        v_title := 'Interview Round Scheduled';
        v_message := 'Your "' || v_round_name || '" interview round for the job "' || v_job_title || '" has been scheduled. Please prepare accordingly.';
      end if;
      
      -- Create the notification
      perform public.create_notification(
        v_student_user_id,
        v_title,
        v_message
      );
    end;
  end if;
  
  -- Return appropriate value based on operation
  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_interview_scheduling
    after insert or update on public.application_rounds
    for each row execute function public.notify_interview_scheduling();

-- 5.11 Mentor Assignment Notification Trigger
create or replace function public.notify_mentor_assignment()
returns trigger as $$
begin
  -- Check if mentor_id actually changed (including being set from null or changed from one mentor to another)
  if OLD.mentor_id is distinct from NEW.mentor_id then
    -- Notify the student
    declare
      v_student_title text;
      v_student_message text;
      v_mentor_title text;
      v_mentor_message text;
      v_student_name text;
      v_mentor_name text;
    begin
      -- Get student and mentor names
      select 
        coalesce(NEW.name, 'Student') into v_student_name,
        coalesce(u.name, 'Mentor') into v_mentor_name
      from public.student_profiles sp
      left join public.users u on NEW.mentor_id = u.id
      where sp.id = NEW.id;
      
      if NEW.mentor_id is not null then
        -- Mentor assigned or changed
        v_student_title := 'Mentor Assigned';
        v_student_message := 'You have been assigned a mentor: ' || v_mentor_name || '.';
        
        v_mentor_title := 'New Mentee Assigned';
        v_mentor_message := 'You have been assigned as a mentor to ' || v_student_name || '.';
        
        -- Create notification for student
        perform public.create_notification(
          NEW.user_id,
          v_student_title,
          v_student_message
        );
        
        -- Create notification for mentor
        perform public.create_notification(
          NEW.mentor_id,
          v_mentor_title,
          v_mentor_message
        );
      else
        -- Mentor removed
        v_student_title := 'Mentor Removed';
        v_student_message := 'Your mentor has been removed. Please contact the college admin if you need a new mentor assigned.';
        
        -- Create notification for student
        perform public.create_notification(
          NEW.user_id,
          v_student_title,
          v_student_message
        );
      end if;
    end;
  end if;
  
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_mentor_assignment
    after update on public.student_profiles
    for each row execute function public.notify_mentor_assignment();

-- =====================================================================
-- 6. Row Level Security (RLS) Enablement & Policies
-- =====================================================================

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

-- 6.1 organizations Policies
create policy "Super Admins have full access to organizations" on public.organizations
    for all to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "College Admins can view own organization" on public.organizations
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN' 
        and id = (auth.jwt() ->> 'org_id')::uuid
    );

-- 6.2 departments Policies
create policy "Super Admins have full access to departments" on public.departments
    for all to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "College Admins can view own college departments" on public.departments
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN' 
        and org_id = (auth.jwt() ->> 'org_id')::uuid
    );

create policy "College Admins can insert department for own college" on public.departments
    for insert to authenticated with check (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN' 
        and org_id = (auth.jwt() ->> 'org_id')::uuid
    );

create policy "Mentors can view assigned department" on public.departments
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'MENTOR' 
        and id = (auth.jwt() ->> 'dept_id')::uuid
    );

-- 6.3 invite_links Policies
create policy "College Admins can view own invite links" on public.invite_links
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN'
        and dept_id in (select id from public.departments where org_id = (auth.jwt() ->> 'org_id')::uuid)
    );

create policy "College Admins can create invite links" on public.invite_links
    for insert to authenticated with check (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN'
        and dept_id in (select id from public.departments where org_id = (auth.jwt() ->> 'org_id')::uuid)
        and created_by = auth.uid()
    );

-- 6.4 users Policies
create policy "Super Admins can view all users" on public.users
    for select to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "College Admins can view users in their college" on public.users
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN' 
        and org_id = (auth.jwt() ->> 'org_id')::uuid
    );

create policy "Mentors can view users in their department" on public.users
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'MENTOR' 
        and dept_id = (auth.jwt() ->> 'dept_id')::uuid
    );

create policy "Users can view their own user row" on public.users
    for select to authenticated using (id = auth.uid());

-- 6.5 company_profiles Policies
create policy "Super Admins have full access to company profiles" on public.company_profiles
    for all to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "Companies can view self profile" on public.company_profiles
    for select to authenticated using (user_id = auth.uid());

create policy "Companies can insert self profile" on public.company_profiles
    for insert to authenticated with check (user_id = auth.uid());

create policy "Companies can update self profile" on public.company_profiles
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "All authenticated users can view active company profiles" on public.company_profiles
    for select to authenticated using (status = 'ACTIVE');

-- 6.6 student_profiles Policies
create policy "Super Admins can view all student profiles" on public.student_profiles
    for select to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "College Admins can view student profiles in their college" on public.student_profiles
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN' 
        and public.check_college_admin_view_student(id, (auth.jwt() ->> 'org_id')::uuid)
    );

create policy "Mentors can view student profiles in their department" on public.student_profiles
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'MENTOR' 
        and public.check_mentor_view_student(id, (auth.jwt() ->> 'dept_id')::uuid)
    );

create policy "Mentors can update student profiles in their department" on public.student_profiles
    for update to authenticated using (
        (auth.jwt() ->> 'role') = 'MENTOR' 
        and public.check_mentor_update_student(id, auth.uid(), (auth.jwt() ->> 'dept_id')::uuid)
    );

create policy "Students can view self profile" on public.student_profiles
    for select to authenticated using (user_id = auth.uid());

create policy "Students can insert self profile" on public.student_profiles
    for insert to authenticated with check (user_id = auth.uid());

create policy "Students can update self profile" on public.student_profiles
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Companies can view applicant student profiles" on public.student_profiles
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and public.check_company_view_student(id, auth.uid())
    );

-- 6.7 job_postings Policies
create policy "Super Admins can select all job postings" on public.job_postings
    for select to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "Super Admins can update all job postings" on public.job_postings
    for update to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "Companies can view own job postings" on public.job_postings
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and company_id = public.get_company_id_by_user_id(auth.uid())
    );

create policy "Companies can insert own job postings" on public.job_postings
    for insert to authenticated with check (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and company_id = public.get_company_id_by_user_id(auth.uid())
    );

create policy "Companies can update own job postings" on public.job_postings
    for update to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and company_id = public.get_company_id_by_user_id(auth.uid())
    );

create policy "College Admins can view jobs mapped to their college" on public.job_postings
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN'
        and public.check_job_mapped_to_college(id, (auth.jwt() ->> 'org_id')::uuid)
    );

create policy "Mentors can view approved jobs mapped to their college" on public.job_postings
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'MENTOR'
        and public.check_job_mapped_and_approved(id, (auth.jwt() ->> 'org_id')::uuid)
    );

create policy "Students can view college-mapped job postings" on public.job_postings
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'STUDENT'
        and public.check_job_mapped_and_approved(id, (auth.jwt() ->> 'org_id')::uuid)
    );

-- 6.8 job_eligible_branches Policies
create policy "Allow select on job_eligible_branches if user can select job" on public.job_eligible_branches
    for select to authenticated using (
        public.check_user_can_view_job(
            job_id,
            auth.uid(),
            (auth.jwt() ->> 'role'),
            (auth.jwt() ->> 'org_id')::uuid,
            (auth.jwt() ->> 'dept_id')::uuid
        )
    );

create policy "Companies can manage branches for own jobs" on public.job_eligible_branches
    for all to authenticated using (
        public.check_company_owns_job(job_id, auth.uid())
    );

-- 6.9 job_college_mappings Policies
create policy "Super Admins can view all job college mappings" on public.job_college_mappings
    for select to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "College Admins can view own college mappings" on public.job_college_mappings
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN'
        and org_id = (auth.jwt() ->> 'org_id')::uuid
    );

create policy "College Admins can update own college mappings status" on public.job_college_mappings
    for update to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN'
        and org_id = (auth.jwt() ->> 'org_id')::uuid
    );

create policy "Companies can view mappings for their own jobs" on public.job_college_mappings
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and public.check_company_owns_job(job_id, auth.uid())
    );

create policy "Companies can create mappings for their own jobs" on public.job_college_mappings
    for insert to authenticated with check (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and public.check_company_owns_job(job_id, auth.uid())
    );

create policy "Students can view mappings for their own college" on public.job_college_mappings
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'STUDENT'
        and org_id = (auth.jwt() ->> 'org_id')::uuid
    );

-- 6.10 applications Policies
create policy "Super Admins can view all applications" on public.applications
    for select to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "College Admins can view applications from their college" on public.applications
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN'
        and public.check_college_admin_view_student(student_id, (auth.jwt() ->> 'org_id')::uuid)
    );

create policy "Students can view own applications" on public.applications
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'STUDENT'
        and student_id = public.get_student_id_by_user_id(auth.uid())
    );

create policy "Students can create own applications if eligible" on public.applications
    for insert to authenticated with check (
        (auth.jwt() ->> 'role') = 'STUDENT'
        and student_id = public.get_student_id_by_user_id(auth.uid())
        and public.check_student_eligibility(
            student_id,
            public.get_job_id_by_mapping_id(job_college_map_id)
        )
    );

create policy "Companies can view applications for their jobs" on public.applications
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and public.check_company_owns_mapping(job_college_map_id, auth.uid())
    );

create policy "Companies can update status of applications for their jobs" on public.applications
    for update to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and public.check_company_owns_mapping(job_college_map_id, auth.uid())
    );

-- 6.11 application_rounds Policies
create policy "Super Admins can view all application rounds" on public.application_rounds
    for select to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "College Admins can view rounds for their college students" on public.application_rounds
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN'
        and public.check_college_admin_view_application(application_id, (auth.jwt() ->> 'org_id')::uuid)
    );

create policy "Students can view own application rounds" on public.application_rounds
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'STUDENT'
        and public.check_student_owns_application(application_id, auth.uid())
    );

create policy "Companies can view rounds for their jobs" on public.application_rounds
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and public.check_company_owns_application(application_id, auth.uid())
    );

create policy "Companies can manage rounds for their jobs" on public.application_rounds
    for all to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and public.check_company_owns_application(application_id, auth.uid())
    );

-- 6.12 offers Policies
create policy "Super Admins can view all offers" on public.offers
    for select to authenticated using ((auth.jwt() ->> 'role') = 'SA');

create policy "College Admins can view offers for their college students" on public.offers
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COLLEGE_ADMIN'
        and public.check_college_admin_view_application(application_id, (auth.jwt() ->> 'org_id')::uuid)
    );

create policy "Students can view own offers" on public.offers
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'STUDENT'
        and public.check_student_owns_application(application_id, auth.uid())
    );

create policy "Students can update own offers (accept/reject)" on public.offers
    for update to authenticated using (
        (auth.jwt() ->> 'role') = 'STUDENT'
        and public.check_student_owns_application(application_id, auth.uid())
    );

create policy "Companies can view offers for their jobs" on public.offers
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and public.check_company_owns_application(application_id, auth.uid())
    );

create policy "Companies can manage offers for their jobs" on public.offers
    for all to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and public.check_company_owns_application(application_id, auth.uid())
    );

-- 6.13 mock_interviews Policies
create policy "Students can manage own mock interviews" on public.mock_interviews
    for all to authenticated using (
        (auth.jwt() ->> 'role') = 'STUDENT'
        and student_id = public.get_student_id_by_user_id(auth.uid())
    );

create policy "Companies can read applicant mock scores if mock required" on public.mock_interviews
    for select to authenticated using (
        (auth.jwt() ->> 'role') = 'COMPANY'
        and public.check_company_view_mock(student_id, auth.uid())
    );

-- 6.14 notifications Policies
create policy "Users can view own notifications" on public.notifications
    for select to authenticated using (user_id = auth.uid());

create policy "Users can update own notifications" on public.notifications
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
