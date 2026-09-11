-- create_notification is an internal SECURITY DEFINER helper used only by
-- database triggers. It must not be callable by API clients.
REVOKE ALL ON FUNCTION public.create_notification(uuid, varchar, text) FROM public, anon, authenticated;
