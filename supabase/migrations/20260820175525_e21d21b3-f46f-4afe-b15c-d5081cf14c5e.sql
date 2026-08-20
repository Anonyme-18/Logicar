
REVOKE ALL ON FUNCTION public.next_document_number(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.convert_quote_to_invoice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_public_quote(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_quote(text) TO anon, authenticated;
CREATE POLICY "counters service only" ON public.document_counters FOR SELECT TO service_role USING (true);
