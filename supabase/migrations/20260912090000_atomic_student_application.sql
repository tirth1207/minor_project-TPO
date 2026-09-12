-- Keep application creation and initial round creation atomic.
-- SECURITY INVOKER preserves the caller's existing RLS permissions.
CREATE OR REPLACE FUNCTION public.create_student_application(
  p_student_id uuid,
  p_job_college_map_id uuid,
  p_mock_score numeric,
  p_round_names jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_application_id uuid;
  v_round_name text;
BEGIN
  INSERT INTO public.applications (
    student_id,
    job_college_map_id,
    mock_score,
    status
  )
  VALUES (
    p_student_id,
    p_job_college_map_id,
    p_mock_score,
    'APPLIED'
  )
  RETURNING id INTO v_application_id;

  IF jsonb_typeof(p_round_names) = 'array'
     AND jsonb_array_length(p_round_names) > 0 THEN
    FOR v_round_name IN
      SELECT value #>> '{}'
      FROM jsonb_array_elements(p_round_names)
    LOOP
      IF v_round_name IS NULL OR btrim(v_round_name) = '' THEN
        v_round_name := 'Interview Round';
      END IF;

      INSERT INTO public.application_rounds (
        application_id,
        round_name,
        status
      )
      VALUES (
        v_application_id,
        v_round_name,
        'PENDING'
      );
    END LOOP;
  ELSE
    INSERT INTO public.application_rounds (application_id, round_name, status)
    VALUES
      (v_application_id, 'Resume Screening', 'PENDING'),
      (v_application_id, 'Technical Interview', 'PENDING'),
      (v_application_id, 'HR Round', 'PENDING');
  END IF;

  RETURN v_application_id;
END;
$$;

COMMENT ON FUNCTION public.create_student_application(uuid, uuid, numeric, jsonb)
IS 'Atomically creates a student application and its initial application rounds.';
