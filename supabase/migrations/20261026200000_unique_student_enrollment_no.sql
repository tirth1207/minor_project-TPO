-- Ensure enrollment numbers remain unique even when concurrent registrations race.
-- Fail the migration explicitly if existing data needs to be reconciled first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.student_profiles
    GROUP BY lower(btrim(enrollment_no))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate student enrollment numbers exist; reconcile them before applying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_enrollment_no_unique_idx
  ON public.student_profiles (lower(btrim(enrollment_no)));
