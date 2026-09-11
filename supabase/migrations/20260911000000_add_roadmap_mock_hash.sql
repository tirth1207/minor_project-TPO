-- Keep career-roadmap cache invalidation tied to evaluated mock history.
ALTER TABLE public.student_career_roadmaps
  ADD COLUMN IF NOT EXISTS mocks_hash text;

CREATE INDEX IF NOT EXISTS idx_student_career_roadmaps_student_id
  ON public.student_career_roadmaps(student_id);
