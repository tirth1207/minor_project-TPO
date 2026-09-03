-- Allow approved students to apply to visible jobs even when eligibility criteria are not met.
DROP POLICY IF EXISTS "Students can create own applications if eligible" ON public.applications;
DROP POLICY IF EXISTS "Students can create own applications" ON public.applications;

CREATE POLICY "Students can create own applications"
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() = 'STUDENT'
  AND student_id = public.get_student_id_by_user_id(auth.uid())
);

-- Only approval-relevant profile changes require mentor re-verification.
CREATE OR REPLACE FUNCTION public.handle_critical_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name
    OR OLD.enrollment_no IS DISTINCT FROM NEW.enrollment_no
    OR OLD.cgpa IS DISTINCT FROM NEW.cgpa
    OR OLD.active_backlogs IS DISTINCT FROM NEW.active_backlogs
    OR OLD.semester IS DISTINCT FROM NEW.semester
    OR OLD.branch IS DISTINCT FROM NEW.branch
    OR OLD.skills IS DISTINCT FROM NEW.skills
    OR OLD.resume_url IS DISTINCT FROM NEW.resume_url
  THEN
    NEW.profile_status := 'PENDING';
  END IF;

  RETURN NEW;
END;
$$;
