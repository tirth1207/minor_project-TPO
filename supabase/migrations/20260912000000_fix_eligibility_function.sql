-- Migration to align check_student_eligibility SQL function with TypeScript Eligibility Engine
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
                      WHERE lower(regexp_replace(trim(stud_skill), '[^a-zA-Z0-9]', '', 'g')) =
                            lower(regexp_replace(trim(req_skill), '[^a-zA-Z0-9]', '', 'g'))
                  )
              )
          )
    )
    INTO v_eligible;

    RETURN coalesce(v_eligible, false);
END;
$$;
