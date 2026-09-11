-- P0 state consistency and security hardening.
-- All write-side placement transitions are serialized in the database.

CREATE OR REPLACE FUNCTION public.create_company_offer(
  p_application_id uuid,
  p_ctc_offered numeric
)
RETURNS public.offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_status public.application_status_type;
  v_offer public.offers;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_ctc_offered IS NULL OR p_ctc_offered <= 0 THEN
    RAISE EXCEPTION 'CTC must be a positive value';
  END IF;

  SELECT jp.company_id, a.status
    INTO v_company_id, v_status
  FROM public.applications a
  JOIN public.job_college_mappings jcm ON jcm.id = a.job_college_map_id
  JOIN public.job_postings jp ON jp.id = jcm.job_id
  JOIN public.company_profiles cp ON cp.id = jp.company_id
  WHERE a.id = p_application_id
    AND cp.user_id = auth.uid()
  FOR UPDATE OF a;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Application not found or unauthorized';
  END IF;

  IF v_status IS DISTINCT FROM 'SHORTLISTED' THEN
    RAISE EXCEPTION 'Only shortlisted applications can receive an offer';
  END IF;

  INSERT INTO public.offers (application_id, ctc_offered, status)
  VALUES (p_application_id, p_ctc_offered, 'EXTENDED')
  RETURNING * INTO v_offer;

  UPDATE public.applications
  SET status = 'OFFERED'
  WHERE id = p_application_id
    AND status = 'SHORTLISTED';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application state changed while extending the offer';
  END IF;

  RETURN v_offer;
END;
$$;

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

  -- Serialize all decisions for this student. This prevents two concurrent
  -- offers from both being accepted before the placement cascade runs.
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

  RETURN v_offer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_offer(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(uuid, public.offer_status_type) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_company_offer(uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.respond_to_offer(uuid, public.offer_status_type) FROM anon;

-- SECURITY DEFINER helpers must never inherit a caller-controlled search_path.
ALTER FUNCTION public.check_student_eligibility(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.get_job_applicant_count(uuid) SET search_path = '';
ALTER FUNCTION public.get_student_id_by_user_id(uuid) SET search_path = '';
ALTER FUNCTION public.get_company_id_by_user_id(uuid) SET search_path = '';
ALTER FUNCTION public.get_job_id_by_mapping_id(uuid) SET search_path = '';
ALTER FUNCTION public.check_company_view_student(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_college_admin_view_student(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_mentor_view_student(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_mentor_update_student(uuid, uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_job_mapped_to_college(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_job_mapped_and_approved(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_user_can_view_job(uuid, uuid, varchar, uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_company_owns_job(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_company_owns_mapping(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_college_admin_view_application(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_student_owns_application(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_company_owns_application(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.check_company_view_mock(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.sync_user_meta_to_auth() SET search_path = '';
ALTER FUNCTION public.handle_critical_profile_update() SET search_path = '';
ALTER FUNCTION public.check_company_active_before_job_post() SET search_path = '';
ALTER FUNCTION public.handle_offer_acceptance() SET search_path = '';
ALTER FUNCTION public.validate_student_mentor() SET search_path = '';
ALTER FUNCTION public.notify_student_profile_status_change() SET search_path = '';
ALTER FUNCTION public.notify_job_approval_status_change() SET search_path = '';
ALTER FUNCTION public.notify_application_status_change() SET search_path = '';
ALTER FUNCTION public.notify_offer_status_change() SET search_path = '';
ALTER FUNCTION public.notify_interview_scheduling() SET search_path = '';
ALTER FUNCTION public.create_notification(uuid, varchar, text) SET search_path = '';

-- These helpers are used by RLS and authenticated application code. They must
-- not be callable by unauthenticated clients.
REVOKE ALL ON FUNCTION public.check_student_eligibility(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_job_applicant_count(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_student_id_by_user_id(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_company_id_by_user_id(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_job_id_by_mapping_id(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_company_view_student(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_college_admin_view_student(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_mentor_view_student(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_mentor_update_student(uuid, uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_job_mapped_to_college(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_job_mapped_and_approved(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_user_can_view_job(uuid, uuid, varchar, uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_company_owns_job(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_company_owns_mapping(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_college_admin_view_application(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_student_owns_application(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_company_owns_application(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_company_view_mock(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.check_student_eligibility(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_applicant_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_id_by_user_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_id_by_user_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_id_by_mapping_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_company_view_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_college_admin_view_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_mentor_view_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_mentor_update_student(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_job_mapped_to_college(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_job_mapped_and_approved(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_can_view_job(uuid, uuid, varchar, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_company_owns_job(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_company_owns_mapping(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_college_admin_view_application(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_student_owns_application(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_company_owns_application(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_company_view_mock(uuid, uuid) TO authenticated;
