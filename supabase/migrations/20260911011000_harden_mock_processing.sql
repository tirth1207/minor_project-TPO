-- Ensure the processing lease used by the mock-interview worker exists on all environments.
ALTER TABLE public.mock_interviews
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_mock_interviews_processing
  ON public.mock_interviews (status, updated_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.mock_interviews'::regclass
      AND conname = 'mock_interviews_retry_count_nonnegative'
  ) THEN
    ALTER TABLE public.mock_interviews
      ADD CONSTRAINT mock_interviews_retry_count_nonnegative
      CHECK (retry_count >= 0);
  END IF;
END
$$;