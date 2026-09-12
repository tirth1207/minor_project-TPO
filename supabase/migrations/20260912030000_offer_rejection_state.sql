-- Keep application state consistent with the student's offer decision.
-- ACCEPTED remains handled by the existing placement cascade trigger.
-- REJECTED offers move the associated application out of OFFERED so the
-- company/student UI cannot represent a rejected offer as still active.

CREATE OR REPLACE FUNCTION public.respond_to_offer(
  p_offer_id uuid,
  p_status public.offer_status_type
)
RETURNS public.offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student_id uuid;
  v_offer public.offers;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_status NOT IN ('ACCEPTED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid offer decision';
  END IF;

  SELECT a.student_id
    INTO v_student_id
  FROM public.offers o
  JOIN public.applications a ON a.id = o.application_id
  JOIN public.student_profiles s ON s.id = a.student_id
  WHERE o.id = p_offer_id
    AND s.user_id = auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Offer not found or unauthorized';
  END IF;

  PERFORM 1
  FROM public.student_profiles
  WHERE id = v_student_id
  FOR UPDATE;

  SELECT *
    INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF v_offer.status IS DISTINCT FROM 'EXTENDED' THEN
    RAISE EXCEPTION 'Offer is no longer available for a decision';
  END IF;

  UPDATE public.offers
  SET status = p_status
  WHERE id = p_offer_id
    AND status = 'EXTENDED'
  RETURNING * INTO v_offer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer state changed while processing the decision';
  END IF;

  IF p_status = 'REJECTED' THEN
    UPDATE public.applications
    SET status = 'REJECTED'
    WHERE id = v_offer.application_id
      AND status = 'OFFERED';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Application state is inconsistent with the offer';
    END IF;
  END IF;

  RETURN v_offer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_offer(uuid, public.offer_status_type) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.respond_to_offer(uuid, public.offer_status_type) FROM anon;
