-- Student offer decisions must go through the transactional RPC so two
-- concurrent accepts cannot race outside the student-row lock.
DROP POLICY IF EXISTS "Students can update own offers (accept/reject)" ON public.offers;
