-- Migration to align check_student_eligibility SQL function with TypeScript Eligibility Engine

CREATE OR REPLACE FUNCTION public.normalize_skill(p_skill text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_raw text;
BEGIN
    v_raw := lower(trim(coalesce(p_skill, '')));
    IF v_raw = '' THEN
        RETURN '';
    END IF;

    CASE v_raw
        WHEN 'c++', 'c plus plus' THEN RETURN 'cpp';
        WHEN 'c#', 'c sharp' THEN RETURN 'csharp';
        WHEN '.net', 'asp.net' THEN RETURN 'dotnet';
        WHEN 'node.js', 'node js', 'nodejs', 'node' THEN RETURN 'nodejs';
        WHEN 'react.js', 'react js', 'reactjs', 'react' THEN RETURN 'reactjs';
        WHEN 'next.js', 'next js', 'nextjs' THEN RETURN 'nextjs';
        WHEN 'vue.js', 'vue js', 'vuejs' THEN RETURN 'vuejs';
        WHEN 'express.js', 'express js', 'expressjs' THEN RETURN 'expressjs';
        WHEN 'tailwind css', 'tailwind' THEN RETURN 'tailwind';
        WHEN 'postgresql', 'postgre sql', 'postgres' THEN RETURN 'postgres';
        WHEN 'mongo db', 'mongodb' THEN RETURN 'mongodb';
        WHEN 'machine learning', 'machinelearning' THEN RETURN 'machinelearning';
        WHEN 'deep learning', 'deeplearning' THEN RETURN 'deeplearning';
        WHEN 'artificial intelligence', 'ai' THEN RETURN 'ai';
        WHEN 'amazon web services', 'aws' THEN RETURN 'aws';
        WHEN 'google cloud platform', 'gcp' THEN RETURN 'gcp';
        WHEN 'microsoft azure', 'azure' THEN RETURN 'azure';
        ELSE
            RETURN regexp_replace(regexp_replace(v_raw, '\s+', '', 'g'), '[._\-/#+]+', '', 'g');
    END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_student_eligibility(
    p_student_id uuid,
    p_job_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_eligible boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.student_profiles s
        JOIN public.users u
          ON s.user_id = u.id
        JOIN public.job_college_mappings jcm
          ON jcm.org_id = u.org_id
         AND jcm.job_id = p_job_id
        JOIN public.job_postings j
          ON j.id = p_job_id
        WHERE s.id = p_student_id

          AND s.profile_status = 'APPROVED'
          AND s.is_placed = false

          AND j.global_status = 'APPROVED'
          AND jcm.local_status = 'APPROVED'

          AND (
              NOT EXISTS (
                  SELECT 1 FROM public.job_eligible_branches jeb
                  WHERE jeb.job_id = p_job_id
              )
              OR EXISTS (
                  SELECT 1
                  FROM public.job_eligible_branches jeb
                  WHERE jeb.job_id = p_job_id
                    AND lower(trim(jeb.branch_name)) = lower(trim(coalesce(s.branch, '')))
              )
          )

          AND coalesce(s.cgpa, 0) >= coalesce(j.min_cgpa, 0)
          AND coalesce(s.active_backlogs, 0) <= coalesce(j.max_backlogs, 0)

          AND (
              j.skills IS NULL
              OR array_length(j.skills, 1) IS NULL
              OR array_length(j.skills, 1) = 0
              OR NOT EXISTS (
                  SELECT 1
                  FROM unnest(j.skills) req_skill
                  WHERE NOT EXISTS (
                      SELECT 1
                      FROM unnest(coalesce(s.skills, '{}'::text[])) stud_skill
                      WHERE public.normalize_skill(stud_skill) = public.normalize_skill(req_skill)
                  )
              )
          )
    )
    INTO v_eligible;

    RETURN coalesce(v_eligible, false);
END;
$$;
