-- Ensure the processing lease used by the mock-interview worker exists on all environments.
ALTER TABLE public.mock_interviews
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_mock_interviews_processing
  ON public.mock_interviews (status, updated_at);

ALTER TABLE public.mock_interviews
  ADD CONSTRAINT mock_interviews_retry_count_nonnegative
  CHECK (retry_count >= 0);
