


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."application_status_type" AS ENUM (
    'APPLIED',
    'WITHDRAWN',
    'SHORTLISTED',
    'REJECTED',
    'OFFERED'
);


ALTER TYPE "public"."application_status_type" OWNER TO "postgres";


CREATE TYPE "public"."approval_status" AS ENUM (
    'PENDING',
    'ACTIVE',
    'REJECTED'
);


ALTER TYPE "public"."approval_status" OWNER TO "postgres";


CREATE TYPE "public"."global_status_type" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE "public"."global_status_type" OWNER TO "postgres";


CREATE TYPE "public"."local_status_type" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE "public"."local_status_type" OWNER TO "postgres";


CREATE TYPE "public"."mock_interview_type" AS ENUM (
    'PRACTICE',
    'JOB_REQUIRED'
);


ALTER TYPE "public"."mock_interview_type" OWNER TO "postgres";


CREATE TYPE "public"."mock_status_type" AS ENUM (
    'REQUESTED',
    'QUEUED',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'ANSWERING',
    'EVALUATING',
    'EVALUATED'
);


ALTER TYPE "public"."mock_status_type" OWNER TO "postgres";


CREATE TYPE "public"."offer_status_type" AS ENUM (
    'EXTENDED',
    'ACCEPTED',
    'REJECTED',
    'REVOKED',
    'AUTO_WITHDRAWN'
);


ALTER TYPE "public"."offer_status_type" OWNER TO "postgres";


CREATE TYPE "public"."profile_approval_status" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE "public"."profile_approval_status" OWNER TO "postgres";


CREATE TYPE "public"."round_status_type" AS ENUM (
    'PENDING',
    'CLEARED',
    'FAILED',
    'SCHEDULED'
);


ALTER TYPE "public"."round_status_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'SA',
    'COLLEGE_ADMIN',
    'MENTOR',
    'STUDENT',
    'COMPANY'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."work_mode_type" AS ENUM (
    'REMOTE',
    'ONSITE',
    'HYBRID'
);


ALTER TYPE "public"."work_mode_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_college_admin_view_application"("p_application_id" "uuid", "p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."check_college_admin_view_application"("p_application_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_college_admin_view_student"("p_student_id" "uuid", "p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select exists (
        select 1
        from public.student_profiles s
        join public.users u
            on u.id = s.user_id
        where s.id = p_student_id
          and u.org_id = p_org_id
    );
$$;


ALTER FUNCTION "public"."check_college_admin_view_student"("p_student_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_company_active_before_job_post"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."check_company_active_before_job_post"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_company_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."check_company_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_company_owns_job"("p_job_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select exists (
        select 1
        from public.job_postings jp
        join public.company_profiles cp
            on cp.id = jp.company_id
        where jp.id = p_job_id
          and cp.user_id = p_user_id
    );
$$;


ALTER FUNCTION "public"."check_company_owns_job"("p_job_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_company_owns_mapping"("p_mapping_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."check_company_owns_mapping"("p_mapping_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_company_view_mock"("p_student_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."check_company_view_mock"("p_student_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_company_view_student"("p_student_id" "uuid", "p_company_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."check_company_view_student"("p_student_id" "uuid", "p_company_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_job_mapped_and_approved"("p_job_id" "uuid", "p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select exists (
        select 1
        from public.job_college_mappings jcm
        where jcm.job_id = p_job_id
          and jcm.org_id = p_org_id
          and jcm.local_status = 'APPROVED'
    );
$$;


ALTER FUNCTION "public"."check_job_mapped_and_approved"("p_job_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_job_mapped_to_college"("p_job_id" "uuid", "p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select exists (
        select 1
        from public.job_college_mappings jcm
        where jcm.job_id = p_job_id
          and jcm.org_id = p_org_id
    );
$$;


ALTER FUNCTION "public"."check_job_mapped_to_college"("p_job_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_mentor_update_student"("p_student_id" "uuid", "p_mentor_uid" "uuid", "p_dept_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."check_mentor_update_student"("p_student_id" "uuid", "p_mentor_uid" "uuid", "p_dept_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_mentor_view_student"("p_student_id" "uuid", "p_dept_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select exists (
        select 1
        from public.student_profiles s
        join public.users u
            on u.id = s.user_id
        where s.id = p_student_id
          and u.dept_id = p_dept_id
    );
$$;


ALTER FUNCTION "public"."check_mentor_view_student"("p_student_id" "uuid", "p_dept_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_student_eligibility"("p_student_id" "uuid", "p_job_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."check_student_eligibility"("p_student_id" "uuid", "p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_student_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select exists (
        select 1

        from public.applications a

        join public.student_profiles s
            on s.id = a.student_id

        where a.id = p_application_id
          and s.user_id = p_user_id
    );
$$;


ALTER FUNCTION "public"."check_student_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_can_view_job"("p_job_id" "uuid", "p_user_id" "uuid", "p_role" character varying, "p_org_id" "uuid", "p_dept_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."check_user_can_view_job"("p_job_id" "uuid", "p_user_id" "uuid", "p_role" character varying, "p_org_id" "uuid", "p_dept_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_dept_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
    select case
        when nullif(auth.jwt() -> 'app_metadata' ->> 'dept_id', '') is null
            then null
        else (auth.jwt() -> 'app_metadata' ->> 'dept_id')::uuid
    end;
$$;


ALTER FUNCTION "public"."current_dept_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
    select case
        when nullif(auth.jwt() -> 'app_metadata' ->> 'org_id', '') is null
            then null
        else (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    end;
$$;


ALTER FUNCTION "public"."current_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
    select auth.jwt() -> 'app_metadata' ->> 'role';
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_company_id_by_user_id"("p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select cp.id
    from public.company_profiles cp
    where cp.user_id = p_user_id
    limit 1;
$$;


ALTER FUNCTION "public"."get_company_id_by_user_id"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_job_applicant_count"("p_job_college_map_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select count(*)::integer
    from public.applications a
    where a.job_college_map_id = p_job_college_map_id;
$$;


ALTER FUNCTION "public"."get_job_applicant_count"("p_job_college_map_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_job_id_by_mapping_id"("p_mapping_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select jcm.job_id
    from public.job_college_mappings jcm
    where jcm.id = p_mapping_id
    limit 1;
$$;


ALTER FUNCTION "public"."get_job_id_by_mapping_id"("p_mapping_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_id_by_user_id"("p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select s.id
    from public.student_profiles s
    where s.user_id = p_user_id
    limit 1;
$$;


ALTER FUNCTION "public"."get_student_id_by_user_id"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_critical_profile_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin

  if
    old.name is distinct from new.name
    or old.enrollment_no is distinct from new.enrollment_no
    or old.dob is distinct from new.dob
    or old.address is distinct from new.address
    or old.phone is distinct from new.phone
    or old.bio is distinct from new.bio
    or old.cgpa is distinct from new.cgpa
    or old.active_backlogs is distinct from new.active_backlogs
    or old.semester is distinct from new.semester
    or old.branch is distinct from new.branch
    or old.skills is distinct from new.skills
    or old.hobbies is distinct from new.hobbies
    or old.resume_url is distinct from new.resume_url
    or old.marksheet_url is distinct from new.marksheet_url
    or old.social_links is distinct from new.social_links
  then
    new.profile_status := 'PENDING';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_critical_profile_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_offer_acceptance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_offer_acceptance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_meta_to_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_user_meta_to_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_mentor_profile_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_role public.user_role;
    v_org_id uuid;
    v_dept_id uuid;
BEGIN

    SELECT role, org_id, dept_id
    INTO v_role, v_org_id, v_dept_id
    FROM public.users
    WHERE id = NEW.user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User does not exist';
    END IF;

    IF v_role IS DISTINCT FROM 'MENTOR'::public.user_role THEN
        RAISE EXCEPTION 'mentor_profiles.user_id must belong to a MENTOR';
    END IF;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Mentor must belong to an organization';
    END IF;

    IF v_dept_id IS NULL THEN
        RAISE EXCEPTION 'Mentor must belong to a department';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_mentor_profile_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_student_mentor"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_student_mentor"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."application_rounds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "round_name" character varying NOT NULL,
    "status" "public"."round_status_type" DEFAULT 'PENDING'::"public"."round_status_type" NOT NULL,
    "company_feedback" "text"
);


ALTER TABLE "public"."application_rounds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "job_college_map_id" "uuid" NOT NULL,
    "status" "public"."application_status_type" DEFAULT 'APPLIED'::"public"."application_status_type" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "mock_score" integer,
    CONSTRAINT "applications_mock_score_check" CHECK ((("mock_score" >= 0) AND ("mock_score" <= 100)))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_name" character varying NOT NULL,
    "website" character varying,
    "status" "public"."approval_status" DEFAULT 'PENDING'::"public"."approval_status" NOT NULL
);


ALTER TABLE "public"."company_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" character varying NOT NULL,
    "status" "public"."approval_status" DEFAULT 'PENDING'::"public"."approval_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invite_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dept_id" "uuid" NOT NULL,
    "token" character varying NOT NULL,
    "used_count" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."invite_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_college_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "local_status" "public"."local_status_type" DEFAULT 'PENDING'::"public"."local_status_type" NOT NULL
);


ALTER TABLE "public"."job_college_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_eligible_branches" (
    "job_id" "uuid" NOT NULL,
    "branch_name" character varying NOT NULL
);


ALTER TABLE "public"."job_eligible_branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_postings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" character varying NOT NULL,
    "description" "text" NOT NULL,
    "ctc_min" numeric,
    "ctc_max" numeric,
    "location" character varying NOT NULL,
    "work_mode" "public"."work_mode_type" NOT NULL,
    "min_cgpa" numeric(3,2) DEFAULT 0.00 NOT NULL,
    "max_backlogs" integer DEFAULT 0 NOT NULL,
    "date_of_visit" "date",
    "require_mock" boolean DEFAULT false NOT NULL,
    "mock_pass_score" integer DEFAULT 50,
    "global_status" "public"."global_status_type" DEFAULT 'PENDING'::"public"."global_status_type" NOT NULL,
    "rounds" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "job_postings_ctc_max_check" CHECK (("ctc_max" >= (0)::numeric)),
    CONSTRAINT "job_postings_ctc_min_check" CHECK (("ctc_min" >= (0)::numeric)),
    CONSTRAINT "job_postings_max_backlogs_check" CHECK (("max_backlogs" >= 0)),
    CONSTRAINT "job_postings_min_cgpa_check" CHECK ((("min_cgpa" >= 0.00) AND ("min_cgpa" <= 10.00))),
    CONSTRAINT "job_postings_mock_pass_score_check" CHECK ((("mock_pass_score" >= 0) AND ("mock_pass_score" <= 100)))
);


ALTER TABLE "public"."job_postings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentor_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying NOT NULL,
    "employee_id" character varying NOT NULL,
    "designation" character varying,
    "qualification" character varying,
    "specialization" character varying,
    "phone" character varying,
    "bio" "text",
    "skills" "text"[],
    "social_links" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "profile_status" "public"."profile_approval_status" DEFAULT 'PENDING'::"public"."profile_approval_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mentor_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mock_interviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "job_role_context" character varying NOT NULL,
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "answers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "ai_score" integer,
    "ai_feedback" "text",
    "overall_score" integer,
    "ai_summary" "text",
    "ai_results" "jsonb",
    "completed_at" timestamp with time zone,
    "status" "public"."mock_status_type" DEFAULT 'REQUESTED'::"public"."mock_status_type" NOT NULL,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "job_id" "uuid",
    "job_college_mapping_id" "uuid",
    "mock_type" "public"."mock_interview_type" DEFAULT 'PRACTICE'::"public"."mock_interview_type" NOT NULL,
    "job_spec_snapshot" "jsonb",
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "mcq_score" integer,
    "theory_score" integer,
    "coding_score" integer,
    "skill_scores" "jsonb" DEFAULT '{}'::"jsonb",
    "passed" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mock_interviews_ai_score_check" CHECK ((("ai_score" >= 0) AND ("ai_score" <= 100))),
    CONSTRAINT "mock_interviews_coding_score_check" CHECK ((("coding_score" >= 0) AND ("coding_score" <= 100))),
    CONSTRAINT "mock_interviews_mcq_score_check" CHECK ((("mcq_score" >= 0) AND ("mcq_score" <= 100))),
    CONSTRAINT "mock_interviews_overall_score_check" CHECK ((("overall_score" >= 0) AND ("overall_score" <= 100))),
    CONSTRAINT "mock_interviews_theory_score_check" CHECK ((("theory_score" >= 0) AND ("theory_score" <= 100)))
);


ALTER TABLE "public"."mock_interviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" character varying NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "ctc_offered" numeric NOT NULL,
    "status" "public"."offer_status_type" DEFAULT 'EXTENDED'::"public"."offer_status_type" NOT NULL,
    "extended_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decided_at" timestamp with time zone,
    CONSTRAINT "offers_ctc_offered_check" CHECK (("ctc_offered" >= (0)::numeric))
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "status" "public"."approval_status" DEFAULT 'PENDING'::"public"."approval_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_career_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "dream_job" character varying,
    "dream_role" character varying,
    "dream_ctc" numeric,
    "dream_skills" "text"[] DEFAULT '{}'::"text"[],
    "current_skills" "text"[] DEFAULT '{}'::"text"[],
    "skill_level" character varying,
    "target_job_type" character varying,
    "preferred_work_mode" character varying,
    "target_timeline" character varying,
    "target_companies" "text"[] DEFAULT '{}'::"text"[],
    "current_challenges" "text",
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "student_career_profiles_skill_level_check" CHECK ((("skill_level")::"text" = ANY ((ARRAY['Beginner'::character varying, 'Intermediate'::character varying, 'Advanced'::character varying])::"text"[])))
);


ALTER TABLE "public"."student_career_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_career_roadmaps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "roadmap_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "profile_hash" character varying,
    "jobs_hash" character varying,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_career_roadmaps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "enrollment_no" character varying NOT NULL,
    "name" character varying NOT NULL,
    "dob" "date",
    "address" "text",
    "phone" character varying,
    "bio" "text",
    "cgpa" numeric(3,2) DEFAULT 0.00 NOT NULL,
    "active_backlogs" integer DEFAULT 0 NOT NULL,
    "semester" integer NOT NULL,
    "branch" character varying NOT NULL,
    "skills" "text"[],
    "hobbies" "text"[],
    "resume_url" character varying NOT NULL,
    "marksheet_url" character varying,
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "profile_status" "public"."profile_approval_status" DEFAULT 'PENDING'::"public"."profile_approval_status" NOT NULL,
    "is_placed" boolean DEFAULT false NOT NULL,
    "mentor_id" "uuid",
    CONSTRAINT "student_profiles_active_backlogs_check" CHECK (("active_backlogs" >= 0)),
    CONSTRAINT "student_profiles_cgpa_check" CHECK ((("cgpa" >= 0.00) AND ("cgpa" <= 10.00))),
    CONSTRAINT "student_profiles_semester_check" CHECK ((("semester" >= 1) AND ("semester" <= 10)))
);


ALTER TABLE "public"."student_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "org_id" "uuid",
    "dept_id" "uuid",
    CONSTRAINT "check_role_org_dept" CHECK (((("role" = 'SA'::"public"."user_role") AND ("org_id" IS NULL) AND ("dept_id" IS NULL)) OR (("role" = 'COMPANY'::"public"."user_role") AND ("org_id" IS NULL) AND ("dept_id" IS NULL)) OR (("role" = 'COLLEGE_ADMIN'::"public"."user_role") AND ("org_id" IS NOT NULL) AND ("dept_id" IS NULL)) OR (("role" = 'MENTOR'::"public"."user_role") AND ("org_id" IS NOT NULL) AND ("dept_id" IS NOT NULL)) OR (("role" = 'STUDENT'::"public"."user_role") AND ("org_id" IS NOT NULL) AND ("dept_id" IS NOT NULL))))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."application_rounds"
    ADD CONSTRAINT "application_rounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_student_id_job_college_map_id_key" UNIQUE ("student_id", "job_college_map_id");



ALTER TABLE ONLY "public"."company_profiles"
    ADD CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_profiles"
    ADD CONSTRAINT "company_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invite_links"
    ADD CONSTRAINT "invite_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invite_links"
    ADD CONSTRAINT "invite_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."job_college_mappings"
    ADD CONSTRAINT "job_college_mappings_job_id_org_id_key" UNIQUE ("job_id", "org_id");



ALTER TABLE ONLY "public"."job_college_mappings"
    ADD CONSTRAINT "job_college_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_eligible_branches"
    ADD CONSTRAINT "job_eligible_branches_pkey" PRIMARY KEY ("job_id", "branch_name");



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mentor_profiles"
    ADD CONSTRAINT "mentor_profiles_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."mentor_profiles"
    ADD CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mentor_profiles"
    ADD CONSTRAINT "mentor_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."mock_interviews"
    ADD CONSTRAINT "mock_interviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_application_id_key" UNIQUE ("application_id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_career_profiles"
    ADD CONSTRAINT "student_career_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_career_profiles"
    ADD CONSTRAINT "student_career_profiles_student_id_key" UNIQUE ("student_id");



ALTER TABLE ONLY "public"."student_career_roadmaps"
    ADD CONSTRAINT "student_career_roadmaps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_career_roadmaps"
    ADD CONSTRAINT "student_career_roadmaps_student_id_key" UNIQUE ("student_id");



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_enrollment_no_key" UNIQUE ("enrollment_no");



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_applications_job_college_map_id" ON "public"."applications" USING "btree" ("job_college_map_id");



CREATE INDEX "idx_applications_status" ON "public"."applications" USING "btree" ("status");



CREATE INDEX "idx_applications_student_id" ON "public"."applications" USING "btree" ("student_id");



CREATE INDEX "idx_departments_org_id" ON "public"."departments" USING "btree" ("org_id");



CREATE INDEX "idx_job_college_mappings_job_id" ON "public"."job_college_mappings" USING "btree" ("job_id");



CREATE INDEX "idx_job_college_mappings_local_status" ON "public"."job_college_mappings" USING "btree" ("local_status");



CREATE INDEX "idx_job_college_mappings_org_id" ON "public"."job_college_mappings" USING "btree" ("org_id");



CREATE INDEX "idx_job_postings_company_id" ON "public"."job_postings" USING "btree" ("company_id");



CREATE INDEX "idx_job_postings_global_status" ON "public"."job_postings" USING "btree" ("global_status");



CREATE INDEX "idx_mentor_profiles_employee_id" ON "public"."mentor_profiles" USING "btree" ("employee_id");



CREATE INDEX "idx_mentor_profiles_status" ON "public"."mentor_profiles" USING "btree" ("profile_status");



CREATE INDEX "idx_mentor_profiles_user_id" ON "public"."mentor_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_mock_interviews_processing" ON "public"."mock_interviews" USING "btree" ("status", "updated_at");



CREATE INDEX "idx_mock_interviews_status" ON "public"."mock_interviews" USING "btree" ("status");



CREATE INDEX "idx_mock_interviews_student_job" ON "public"."mock_interviews" USING "btree" ("student_id", "job_id", "mock_type", "status");



CREATE INDEX "idx_mock_interviews_student_type" ON "public"."mock_interviews" USING "btree" ("student_id", "mock_type", "status");



CREATE INDEX "idx_notifications_user_id_is_read" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_offers_application_id" ON "public"."offers" USING "btree" ("application_id");



CREATE INDEX "idx_offers_status" ON "public"."offers" USING "btree" ("status");



CREATE INDEX "idx_student_career_profiles_student_id" ON "public"."student_career_profiles" USING "btree" ("student_id");



CREATE INDEX "idx_student_career_roadmaps_student_id" ON "public"."student_career_roadmaps" USING "btree" ("student_id");



CREATE INDEX "idx_student_profiles_branch" ON "public"."student_profiles" USING "btree" ("branch");



CREATE INDEX "idx_student_profiles_cgpa" ON "public"."student_profiles" USING "btree" ("cgpa");



CREATE INDEX "idx_student_profiles_is_placed" ON "public"."student_profiles" USING "btree" ("is_placed");



CREATE INDEX "idx_student_profiles_mentor_id" ON "public"."student_profiles" USING "btree" ("mentor_id");



CREATE INDEX "idx_student_profiles_status" ON "public"."student_profiles" USING "btree" ("profile_status");



CREATE INDEX "idx_users_dept_id" ON "public"."users" USING "btree" ("dept_id");



CREATE INDEX "idx_users_org_id" ON "public"."users" USING "btree" ("org_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "before_job_posting_insert" BEFORE INSERT ON "public"."job_postings" FOR EACH ROW EXECUTE FUNCTION "public"."check_company_active_before_job_post"();



CREATE OR REPLACE TRIGGER "mentor_profiles_set_updated_at" BEFORE UPDATE ON "public"."mentor_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_offer_accepted" BEFORE UPDATE ON "public"."offers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_offer_acceptance"();



CREATE OR REPLACE TRIGGER "on_public_user_upsert" AFTER INSERT OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_meta_to_auth"();



CREATE OR REPLACE TRIGGER "on_student_profile_critical_update" BEFORE UPDATE ON "public"."student_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_critical_profile_update"();



CREATE OR REPLACE TRIGGER "trigger_student_career_profiles_updated_at" BEFORE UPDATE ON "public"."student_career_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_student_career_roadmaps_updated_at" BEFORE UPDATE ON "public"."student_career_roadmaps" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_validate_student_mentor" BEFORE INSERT OR UPDATE OF "mentor_id", "user_id" ON "public"."student_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_student_mentor"();



CREATE OR REPLACE TRIGGER "validate_mentor_profile_user_trigger" BEFORE INSERT OR UPDATE OF "user_id" ON "public"."mentor_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_mentor_profile_user"();



ALTER TABLE ONLY "public"."application_rounds"
    ADD CONSTRAINT "application_rounds_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_job_college_map_id_fkey" FOREIGN KEY ("job_college_map_id") REFERENCES "public"."job_college_mappings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_profiles"
    ADD CONSTRAINT "company_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invite_links"
    ADD CONSTRAINT "invite_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invite_links"
    ADD CONSTRAINT "invite_links_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_college_mappings"
    ADD CONSTRAINT "job_college_mappings_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_college_mappings"
    ADD CONSTRAINT "job_college_mappings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_eligible_branches"
    ADD CONSTRAINT "job_eligible_branches_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentor_profiles"
    ADD CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mock_interviews"
    ADD CONSTRAINT "mock_interviews_job_college_mapping_id_fkey" FOREIGN KEY ("job_college_mapping_id") REFERENCES "public"."job_college_mappings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mock_interviews"
    ADD CONSTRAINT "mock_interviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mock_interviews"
    ADD CONSTRAINT "mock_interviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_career_profiles"
    ADD CONSTRAINT "student_career_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_career_roadmaps"
    ADD CONSTRAINT "student_career_roadmaps_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "All authenticated users can view active company profiles" ON "public"."company_profiles" FOR SELECT TO "authenticated" USING (("status" = 'ACTIVE'::"public"."approval_status"));



CREATE POLICY "Allow select on job_eligible_branches if user can select job" ON "public"."job_eligible_branches" FOR SELECT TO "authenticated" USING ("public"."check_user_can_view_job"("job_id", "auth"."uid"(), ("public"."current_user_role"())::character varying, "public"."current_org_id"(), "public"."current_dept_id"()));



CREATE POLICY "College Admin can approve mentor" ON "public"."mentor_profiles" FOR UPDATE TO "authenticated" USING ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "mentor_profiles"."user_id") AND ("u"."role" = 'MENTOR'::"public"."user_role") AND ("u"."org_id" = "public"."current_org_id"())))))) WITH CHECK ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "mentor_profiles"."user_id") AND ("u"."role" = 'MENTOR'::"public"."user_role") AND ("u"."org_id" = "public"."current_org_id"()))))));



CREATE POLICY "College Admins can create invite links" ON "public"."invite_links" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND ("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."departments" "d"
  WHERE (("d"."id" = "invite_links"."dept_id") AND ("d"."org_id" = "public"."current_org_id"()))))));



CREATE POLICY "College Admins can insert department for own college" ON "public"."departments" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND ("org_id" = "public"."current_org_id"())));



CREATE POLICY "College Admins can update own college mappings status" ON "public"."job_college_mappings" FOR UPDATE TO "authenticated" USING ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND ("org_id" = "public"."current_org_id"()))) WITH CHECK ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND ("org_id" = "public"."current_org_id"())));



CREATE POLICY "College Admins can view applications from their college" ON "public"."applications" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") THEN "public"."check_college_admin_view_student"("student_id", "public"."current_org_id"())
    ELSE false
END);



CREATE POLICY "College Admins can view jobs mapped to their college" ON "public"."job_postings" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") THEN "public"."check_job_mapped_to_college"("id", "public"."current_org_id"())
    ELSE false
END);



CREATE POLICY "College Admins can view offers for their college students" ON "public"."offers" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") THEN "public"."check_college_admin_view_application"("application_id", "public"."current_org_id"())
    ELSE false
END);



CREATE POLICY "College Admins can view own college departments" ON "public"."departments" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND ("org_id" = "public"."current_org_id"())));



CREATE POLICY "College Admins can view own college mappings" ON "public"."job_college_mappings" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND ("org_id" = "public"."current_org_id"())));



CREATE POLICY "College Admins can view own invite links" ON "public"."invite_links" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."departments" "d"
  WHERE (("d"."id" = "invite_links"."dept_id") AND ("d"."org_id" = "public"."current_org_id"()))))));



CREATE POLICY "College Admins can view own organization" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND ("id" = "public"."current_org_id"())));



CREATE POLICY "College Admins can view rounds for their college students" ON "public"."application_rounds" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") THEN "public"."check_college_admin_view_application"("application_id", "public"."current_org_id"())
    ELSE false
END);



CREATE POLICY "College Admins can view student profiles in their college" ON "public"."student_profiles" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") THEN "public"."check_college_admin_view_student"("id", "public"."current_org_id"())
    ELSE false
END);



CREATE POLICY "College Admins can view users in their college" ON "public"."users" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND ("org_id" = "public"."current_org_id"())));



CREATE POLICY "College admins can view organization mentors" ON "public"."mentor_profiles" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'COLLEGE_ADMIN'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "mentor_profiles"."user_id") AND ("u"."role" = 'MENTOR'::"public"."user_role") AND ("u"."org_id" = "public"."current_org_id"()))))));



CREATE POLICY "Companies can create mappings for their own jobs" ON "public"."job_college_mappings" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = 'COMPANY'::"text") AND "public"."check_company_owns_job"("job_id", "auth"."uid"())));



CREATE POLICY "Companies can insert own job postings" ON "public"."job_postings" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = 'COMPANY'::"text") AND ("company_id" = "public"."get_company_id_by_user_id"("auth"."uid"()))));



CREATE POLICY "Companies can insert self profile" ON "public"."company_profiles" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = 'COMPANY'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Companies can manage branches for own jobs" ON "public"."job_eligible_branches" TO "authenticated" USING ((("public"."current_user_role"() = 'COMPANY'::"text") AND "public"."check_company_owns_job"("job_id", "auth"."uid"()))) WITH CHECK ((("public"."current_user_role"() = 'COMPANY'::"text") AND "public"."check_company_owns_job"("job_id", "auth"."uid"())));



CREATE POLICY "Companies can manage offers for their jobs" ON "public"."offers" TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COMPANY'::"text") THEN "public"."check_company_owns_application"("application_id", "auth"."uid"())
    ELSE false
END) WITH CHECK ((("public"."current_user_role"() = 'COMPANY'::"text") AND "public"."check_company_owns_application"("application_id", "auth"."uid"())));



CREATE POLICY "Companies can manage rounds for their jobs" ON "public"."application_rounds" TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COMPANY'::"text") THEN "public"."check_company_owns_application"("application_id", "auth"."uid"())
    ELSE false
END) WITH CHECK ((("public"."current_user_role"() = 'COMPANY'::"text") AND "public"."check_company_owns_application"("application_id", "auth"."uid"())));



CREATE POLICY "Companies can read applicant mock scores if mock required" ON "public"."mock_interviews" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'COMPANY'::"text") AND "public"."check_company_view_mock"("student_id", "auth"."uid"())));



CREATE POLICY "Companies can update own job postings" ON "public"."job_postings" FOR UPDATE TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COMPANY'::"text") THEN ("company_id" = "public"."get_company_id_by_user_id"("auth"."uid"()))
    ELSE false
END) WITH CHECK ((("public"."current_user_role"() = 'COMPANY'::"text") AND ("company_id" = "public"."get_company_id_by_user_id"("auth"."uid"()))));



CREATE POLICY "Companies can update self profile" ON "public"."company_profiles" FOR UPDATE TO "authenticated" USING ((("public"."current_user_role"() = 'COMPANY'::"text") AND ("user_id" = "auth"."uid"()))) WITH CHECK ((("public"."current_user_role"() = 'COMPANY'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Companies can update status of applications for their jobs" ON "public"."applications" FOR UPDATE TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COMPANY'::"text") THEN "public"."check_company_owns_mapping"("job_college_map_id", "auth"."uid"())
    ELSE false
END) WITH CHECK ((("public"."current_user_role"() = 'COMPANY'::"text") AND "public"."check_company_owns_mapping"("job_college_map_id", "auth"."uid"())));



CREATE POLICY "Companies can view applicant student profiles" ON "public"."student_profiles" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COMPANY'::"text") THEN "public"."check_company_view_student"("id", "auth"."uid"())
    ELSE false
END);



CREATE POLICY "Companies can view applications for their jobs" ON "public"."applications" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COMPANY'::"text") THEN "public"."check_company_owns_mapping"("job_college_map_id", "auth"."uid"())
    ELSE false
END);



CREATE POLICY "Companies can view mappings for their own jobs" ON "public"."job_college_mappings" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COMPANY'::"text") THEN "public"."check_company_owns_job"("job_id", "auth"."uid"())
    ELSE false
END);



CREATE POLICY "Companies can view offers for their jobs" ON "public"."offers" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COMPANY'::"text") THEN "public"."check_company_owns_application"("application_id", "auth"."uid"())
    ELSE false
END);



CREATE POLICY "Companies can view own job postings" ON "public"."job_postings" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COMPANY'::"text") THEN ("company_id" = "public"."get_company_id_by_user_id"("auth"."uid"()))
    ELSE false
END);



CREATE POLICY "Companies can view rounds for their jobs" ON "public"."application_rounds" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'COMPANY'::"text") THEN "public"."check_company_owns_application"("application_id", "auth"."uid"())
    ELSE false
END);



CREATE POLICY "Companies can view self profile" ON "public"."company_profiles" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'COMPANY'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Company can Select organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("public"."current_user_role"() = 'COMPANY'::"text"));



CREATE POLICY "Mentors can create own profile" ON "public"."mentor_profiles" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = 'MENTOR'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Mentors can update own profile" ON "public"."mentor_profiles" FOR UPDATE TO "authenticated" USING ((("public"."current_user_role"() = 'MENTOR'::"text") AND ("user_id" = "auth"."uid"()))) WITH CHECK ((("public"."current_user_role"() = 'MENTOR'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Mentors can update student profiles in their department" ON "public"."student_profiles" FOR UPDATE TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'MENTOR'::"text") THEN "public"."check_mentor_update_student"("id", "auth"."uid"(), "public"."current_dept_id"())
    ELSE false
END) WITH CHECK (
CASE
    WHEN ("public"."current_user_role"() = 'MENTOR'::"text") THEN "public"."check_mentor_update_student"("id", "auth"."uid"(), "public"."current_dept_id"())
    ELSE false
END);



CREATE POLICY "Mentors can view approved jobs mapped to their college" ON "public"."job_postings" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'MENTOR'::"text") THEN "public"."check_job_mapped_and_approved"("id", "public"."current_org_id"())
    ELSE false
END);



CREATE POLICY "Mentors can view assigned department" ON "public"."departments" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'MENTOR'::"text") AND ("id" = "public"."current_dept_id"())));



CREATE POLICY "Mentors can view assigned organization" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'MENTOR'::"text") AND ("id" = "public"."current_org_id"())));



CREATE POLICY "Mentors can view own profile" ON "public"."mentor_profiles" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'MENTOR'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Mentors can view student profiles in their department" ON "public"."student_profiles" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'MENTOR'::"text") THEN "public"."check_mentor_view_student"("id", "public"."current_dept_id"())
    ELSE false
END);



CREATE POLICY "Mentors can view users in their department" ON "public"."users" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'MENTOR'::"text") AND ("dept_id" = "public"."current_dept_id"())));



CREATE POLICY "Student can view assigned Organization" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'STUDENT'::"text") AND ("id" = "public"."current_org_id"())));



CREATE POLICY "Student can view assigned department" ON "public"."departments" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'STUDENT'::"text") AND ("id" = "public"."current_dept_id"())));



CREATE POLICY "Students can create own applications if eligible" ON "public"."applications" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = 'STUDENT'::"text") AND ("student_id" = "public"."get_student_id_by_user_id"("auth"."uid"())) AND "public"."check_student_eligibility"("student_id", "public"."get_job_id_by_mapping_id"("job_college_map_id"))));



CREATE POLICY "Students can insert own career profile" ON "public"."student_career_profiles" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "student_profiles"."user_id"
   FROM "public"."student_profiles"
  WHERE ("student_profiles"."id" = "student_career_profiles"."student_id"))));



CREATE POLICY "Students can insert own mock interviews" ON "public"."mock_interviews" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."get_student_id_by_user_id"("auth"."uid"())));



CREATE POLICY "Students can insert self profile" ON "public"."student_profiles" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = 'STUDENT'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Students can manage own career roadmap" ON "public"."student_career_roadmaps" USING (("auth"."uid"() IN ( SELECT "student_profiles"."user_id"
   FROM "public"."student_profiles"
  WHERE ("student_profiles"."id" = "student_career_roadmaps"."student_id"))));



CREATE POLICY "Students can read own career profile" ON "public"."student_career_profiles" FOR SELECT USING (("auth"."uid"() IN ( SELECT "student_profiles"."user_id"
   FROM "public"."student_profiles"
  WHERE ("student_profiles"."id" = "student_career_profiles"."student_id"))));



CREATE POLICY "Students can read own career roadmap" ON "public"."student_career_roadmaps" FOR SELECT USING (("auth"."uid"() IN ( SELECT "student_profiles"."user_id"
   FROM "public"."student_profiles"
  WHERE ("student_profiles"."id" = "student_career_roadmaps"."student_id"))));



CREATE POLICY "Students can read own mock interviews" ON "public"."mock_interviews" FOR SELECT TO "authenticated" USING (("student_id" = "public"."get_student_id_by_user_id"("auth"."uid"())));



CREATE POLICY "Students can update own career profile" ON "public"."student_career_profiles" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "student_profiles"."user_id"
   FROM "public"."student_profiles"
  WHERE ("student_profiles"."id" = "student_career_profiles"."student_id"))));



CREATE POLICY "Students can update own mock interviews" ON "public"."mock_interviews" FOR UPDATE TO "authenticated" USING (("student_id" = "public"."get_student_id_by_user_id"("auth"."uid"()))) WITH CHECK (("student_id" = "public"."get_student_id_by_user_id"("auth"."uid"())));



CREATE POLICY "Students can update own offers (accept/reject)" ON "public"."offers" FOR UPDATE TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'STUDENT'::"text") THEN "public"."check_student_owns_application"("application_id", "auth"."uid"())
    ELSE false
END) WITH CHECK ((("public"."current_user_role"() = 'STUDENT'::"text") AND "public"."check_student_owns_application"("application_id", "auth"."uid"())));



CREATE POLICY "Students can update self profile" ON "public"."student_profiles" FOR UPDATE TO "authenticated" USING ((("public"."current_user_role"() = 'STUDENT'::"text") AND ("user_id" = "auth"."uid"()))) WITH CHECK ((("public"."current_user_role"() = 'STUDENT'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Students can view college-mapped job postings" ON "public"."job_postings" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'STUDENT'::"text") THEN "public"."check_job_mapped_and_approved"("id", "public"."current_org_id"())
    ELSE false
END);



CREATE POLICY "Students can view mappings for their own college" ON "public"."job_college_mappings" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'STUDENT'::"text") AND ("org_id" = "public"."current_org_id"())));



CREATE POLICY "Students can view own application rounds" ON "public"."application_rounds" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'STUDENT'::"text") THEN "public"."check_student_owns_application"("application_id", "auth"."uid"())
    ELSE false
END);



CREATE POLICY "Students can view own applications" ON "public"."applications" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'STUDENT'::"text") AND ("student_id" = "public"."get_student_id_by_user_id"("auth"."uid"()))));



CREATE POLICY "Students can view own offers" ON "public"."offers" FOR SELECT TO "authenticated" USING (
CASE
    WHEN ("public"."current_user_role"() = 'STUDENT'::"text") THEN "public"."check_student_owns_application"("application_id", "auth"."uid"())
    ELSE false
END);



CREATE POLICY "Students can view self profile" ON "public"."student_profiles" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'STUDENT'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Super Admins can select all job postings" ON "public"."job_postings" FOR SELECT TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super Admins can update all job postings" ON "public"."job_postings" FOR UPDATE TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text")) WITH CHECK (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super Admins can view all application rounds" ON "public"."application_rounds" FOR SELECT TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super Admins can view all applications" ON "public"."applications" FOR SELECT TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super Admins can view all job college mappings" ON "public"."job_college_mappings" FOR SELECT TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super Admins can view all offers" ON "public"."offers" FOR SELECT TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super Admins can view all student profiles" ON "public"."student_profiles" FOR SELECT TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super Admins can view all users" ON "public"."users" FOR SELECT TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super Admins have full access to company profiles" ON "public"."company_profiles" TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text")) WITH CHECK (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super Admins have full access to departments" ON "public"."departments" TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text")) WITH CHECK (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super Admins have full access to organizations" ON "public"."organizations" TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text")) WITH CHECK (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Super admins can view all mentor profiles" ON "public"."mentor_profiles" FOR SELECT TO "authenticated" USING (("public"."current_user_role"() = 'SA'::"text"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own user row" ON "public"."users" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."application_rounds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invite_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_college_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_eligible_branches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_postings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mentor_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mock_interviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_career_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_career_roadmaps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."check_college_admin_view_application"("p_application_id" "uuid", "p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_college_admin_view_application"("p_application_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_college_admin_view_application"("p_application_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_college_admin_view_application"("p_application_id" "uuid", "p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_college_admin_view_student"("p_student_id" "uuid", "p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_college_admin_view_student"("p_student_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_college_admin_view_student"("p_student_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_college_admin_view_student"("p_student_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_company_active_before_job_post"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_company_active_before_job_post"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_company_active_before_job_post"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_company_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_company_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_company_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_company_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_company_owns_job"("p_job_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_company_owns_job"("p_job_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_company_owns_job"("p_job_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_company_owns_job"("p_job_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_company_owns_mapping"("p_mapping_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_company_owns_mapping"("p_mapping_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_company_owns_mapping"("p_mapping_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_company_owns_mapping"("p_mapping_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_company_view_mock"("p_student_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_company_view_mock"("p_student_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_company_view_mock"("p_student_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_company_view_mock"("p_student_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_company_view_student"("p_student_id" "uuid", "p_company_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_company_view_student"("p_student_id" "uuid", "p_company_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_company_view_student"("p_student_id" "uuid", "p_company_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_company_view_student"("p_student_id" "uuid", "p_company_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_job_mapped_and_approved"("p_job_id" "uuid", "p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_job_mapped_and_approved"("p_job_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_job_mapped_and_approved"("p_job_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_job_mapped_and_approved"("p_job_id" "uuid", "p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_job_mapped_to_college"("p_job_id" "uuid", "p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_job_mapped_to_college"("p_job_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_job_mapped_to_college"("p_job_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_job_mapped_to_college"("p_job_id" "uuid", "p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_mentor_update_student"("p_student_id" "uuid", "p_mentor_uid" "uuid", "p_dept_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_mentor_update_student"("p_student_id" "uuid", "p_mentor_uid" "uuid", "p_dept_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_mentor_update_student"("p_student_id" "uuid", "p_mentor_uid" "uuid", "p_dept_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_mentor_update_student"("p_student_id" "uuid", "p_mentor_uid" "uuid", "p_dept_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_mentor_view_student"("p_student_id" "uuid", "p_dept_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_mentor_view_student"("p_student_id" "uuid", "p_dept_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_mentor_view_student"("p_student_id" "uuid", "p_dept_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_mentor_view_student"("p_student_id" "uuid", "p_dept_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_student_eligibility"("p_student_id" "uuid", "p_job_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_student_eligibility"("p_student_id" "uuid", "p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_student_eligibility"("p_student_id" "uuid", "p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_student_eligibility"("p_student_id" "uuid", "p_job_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_student_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_student_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_student_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_student_owns_application"("p_application_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_can_view_job"("p_job_id" "uuid", "p_user_id" "uuid", "p_role" character varying, "p_org_id" "uuid", "p_dept_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_can_view_job"("p_job_id" "uuid", "p_user_id" "uuid", "p_role" character varying, "p_org_id" "uuid", "p_dept_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_can_view_job"("p_job_id" "uuid", "p_user_id" "uuid", "p_role" character varying, "p_org_id" "uuid", "p_dept_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_dept_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_dept_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_dept_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_company_id_by_user_id"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_company_id_by_user_id"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_company_id_by_user_id"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_id_by_user_id"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_job_applicant_count"("p_job_college_map_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_job_applicant_count"("p_job_college_map_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_job_applicant_count"("p_job_college_map_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_job_applicant_count"("p_job_college_map_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_job_id_by_mapping_id"("p_mapping_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_job_id_by_mapping_id"("p_mapping_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_job_id_by_mapping_id"("p_mapping_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_job_id_by_mapping_id"("p_mapping_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_student_id_by_user_id"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_student_id_by_user_id"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_id_by_user_id"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_id_by_user_id"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_critical_profile_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_critical_profile_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_critical_profile_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_offer_acceptance"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_offer_acceptance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_offer_acceptance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_meta_to_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_meta_to_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_meta_to_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_mentor_profile_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_mentor_profile_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_mentor_profile_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_student_mentor"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_student_mentor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_student_mentor"() TO "service_role";


















GRANT ALL ON TABLE "public"."application_rounds" TO "anon";
GRANT ALL ON TABLE "public"."application_rounds" TO "authenticated";
GRANT ALL ON TABLE "public"."application_rounds" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."company_profiles" TO "anon";
GRANT ALL ON TABLE "public"."company_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."company_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."invite_links" TO "anon";
GRANT ALL ON TABLE "public"."invite_links" TO "authenticated";
GRANT ALL ON TABLE "public"."invite_links" TO "service_role";



GRANT ALL ON TABLE "public"."job_college_mappings" TO "anon";
GRANT ALL ON TABLE "public"."job_college_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."job_college_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."job_eligible_branches" TO "anon";
GRANT ALL ON TABLE "public"."job_eligible_branches" TO "authenticated";
GRANT ALL ON TABLE "public"."job_eligible_branches" TO "service_role";



GRANT ALL ON TABLE "public"."job_postings" TO "anon";
GRANT ALL ON TABLE "public"."job_postings" TO "authenticated";
GRANT ALL ON TABLE "public"."job_postings" TO "service_role";



GRANT ALL ON TABLE "public"."mentor_profiles" TO "anon";
GRANT ALL ON TABLE "public"."mentor_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."mentor_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."mock_interviews" TO "anon";
GRANT ALL ON TABLE "public"."mock_interviews" TO "authenticated";
GRANT ALL ON TABLE "public"."mock_interviews" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."offers" TO "anon";
GRANT ALL ON TABLE "public"."offers" TO "authenticated";
GRANT ALL ON TABLE "public"."offers" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."student_career_profiles" TO "anon";
GRANT ALL ON TABLE "public"."student_career_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."student_career_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."student_career_roadmaps" TO "anon";
GRANT ALL ON TABLE "public"."student_career_roadmaps" TO "authenticated";
GRANT ALL ON TABLE "public"."student_career_roadmaps" TO "service_role";



GRANT ALL ON TABLE "public"."student_profiles" TO "anon";
GRANT ALL ON TABLE "public"."student_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."student_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































