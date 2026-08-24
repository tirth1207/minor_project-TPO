-- Migration for Job-Aware AI Mock Interview, Student Career Profiles, and AI Career Roadmaps

-- 1. Create or Update Enum Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mock_interview_type') THEN
        CREATE TYPE public.mock_interview_type AS ENUM ('PRACTICE', 'JOB_REQUIRED');
    END IF;
END $$;

-- 2. Alter public.mock_interviews to support job linkage, snapshots, attempt count, and detailed scoring
ALTER TABLE public.mock_interviews
    ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.job_postings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS job_college_mapping_id uuid REFERENCES public.job_college_mappings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS mock_type public.mock_interview_type NOT NULL DEFAULT 'PRACTICE',
    ADD COLUMN IF NOT EXISTS job_spec_snapshot jsonb,
    ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS mcq_score integer CHECK (mcq_score >= 0 AND mcq_score <= 100),
    ADD COLUMN IF NOT EXISTS theory_score integer CHECK (theory_score >= 0 AND theory_score <= 100),
    ADD COLUMN IF NOT EXISTS coding_score integer CHECK (coding_score >= 0 AND coding_score <= 100),
    ADD COLUMN IF NOT EXISTS skill_scores jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS passed boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_mock_interviews_student_job ON public.mock_interviews(student_id, job_id, mock_type, status);
CREATE INDEX IF NOT EXISTS idx_mock_interviews_student_type ON public.mock_interviews(student_id, mock_type, status);

-- 3. Create student_career_profiles Table
CREATE TABLE IF NOT EXISTS public.student_career_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL UNIQUE REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    dream_job varchar,
    dream_role varchar,
    dream_ctc numeric,
    dream_skills text[] DEFAULT '{}'::text[],
    current_skills text[] DEFAULT '{}'::text[],
    skill_level varchar CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced')),
    target_job_type varchar,
    preferred_work_mode varchar,
    target_timeline varchar,
    target_companies text[] DEFAULT '{}'::text[],
    current_challenges text,
    onboarding_completed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_career_profiles_student_id ON public.student_career_profiles(student_id);

-- 4. Create student_career_roadmaps Table
CREATE TABLE IF NOT EXISTS public.student_career_roadmaps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL UNIQUE REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    roadmap_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    profile_hash varchar,
    jobs_hash varchar,
    generated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_career_roadmaps_student_id ON public.student_career_roadmaps(student_id);

-- 5. Enable RLS and define security policies
ALTER TABLE public.student_career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_career_roadmaps ENABLE ROW LEVEL SECURITY;

-- student_career_profiles Policies
CREATE POLICY "Students can read own career profile"
    ON public.student_career_profiles FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.student_profiles WHERE id = student_id));

CREATE POLICY "Students can insert own career profile"
    ON public.student_career_profiles FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.student_profiles WHERE id = student_id));

CREATE POLICY "Students can update own career profile"
    ON public.student_career_profiles FOR UPDATE
    USING (auth.uid() IN (SELECT user_id FROM public.student_profiles WHERE id = student_id));

-- student_career_roadmaps Policies
CREATE POLICY "Students can read own career roadmap"
    ON public.student_career_roadmaps FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.student_profiles WHERE id = student_id));

CREATE POLICY "Students can manage own career roadmap"
    ON public.student_career_roadmaps FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM public.student_profiles WHERE id = student_id));

-- Trigger for student_career_profiles updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_student_career_profiles_updated_at ON public.student_career_profiles;
CREATE TRIGGER trigger_student_career_profiles_updated_at
    BEFORE UPDATE ON public.student_career_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_student_career_roadmaps_updated_at ON public.student_career_roadmaps;
CREATE TRIGGER trigger_student_career_roadmaps_updated_at
    BEFORE UPDATE ON public.student_career_roadmaps
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
