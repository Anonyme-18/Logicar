
-- ENUMS
CREATE TYPE public.quote_status AS ENUM ('DRAFT','SENT','ACCEPTED','REJECTED','CONVERTED');
CREATE TYPE public.invoice_status AS ENUM ('UNPAID','PAID','PARTIALLY_PAID','OVERDUE','CANCELLED');

-- shared updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.artisan_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  address text,
  city text,
  country text,
  tax_identifier text,
  logo_url text,
  currency text NOT NULL DEFAULT 'XOF',
  quote_terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artisan_profiles TO authenticated;
GRANT ALL ON public.artisan_profiles TO service_role;
ALTER TABLE public.artisan_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.artisan_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.artisan_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  company_name text,
  email text,
  phone text,
  address text,
  city text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_user ON public.clients(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clients" ON public.clients FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DOCUMENT COUNTERS
CREATE TABLE public.document_counters (
  user_id uuid NOT NULL,
  kind text NOT NULL,
  year int NOT NULL,
  seq int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, kind, year)
);
GRANT ALL ON public.document_counters TO service_role;
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_document_number(_user_id uuid, _kind text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _year int := EXTRACT(YEAR FROM now())::int; _seq int; _prefix text;
BEGIN
  INSERT INTO public.document_counters(user_id, kind, year, seq)
  VALUES (_user_id, _kind, _year, 1)
  ON CONFLICT (user_id, kind, year) DO UPDATE SET seq = public.document_counters.seq + 1
  RETURNING seq INTO _seq;
  _prefix := CASE WHEN _kind = 'quote' THEN 'DEV' ELSE 'FAC' END;
  RETURN _prefix || '-' || _year::text || '-' || lpad(_seq::text, 4, '0');
END; $$;

-- QUOTES
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  quote_number text NOT NULL,
  status public.quote_status NOT NULL DEFAULT 'DRAFT',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  notes text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  shared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quote_number)
);
CREATE INDEX idx_quotes_user ON public.quotes(user_id);
CREATE INDEX idx_quotes_client ON public.quotes(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quotes" ON public.quotes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(14,2) NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quote_items_quote ON public.quote_items(quote_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quote items" ON public.quote_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.user_id = auth.uid()));

-- INVOICES
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  quote_id uuid UNIQUE REFERENCES public.quotes(id) ON DELETE SET NULL,
  quote_number_ref text,
  invoice_number text NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'UNPAID',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  locked boolean NOT NULL DEFAULT true,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, invoice_number)
);
CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own invoices select" ON public.invoices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own invoices insert" ON public.invoices FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own invoices update" ON public.invoices FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(14,2) NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
GRANT SELECT ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own invoice items select" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.user_id = auth.uid()));

-- IMMUTABILITY GUARD: locked invoices cannot change content
CREATE OR REPLACE FUNCTION public.guard_invoice_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.locked THEN
    IF NEW.client_id IS DISTINCT FROM OLD.client_id
      OR NEW.total IS DISTINCT FROM OLD.total
      OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
      OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
      OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
      OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
      OR NEW.notes IS DISTINCT FROM OLD.notes
      OR NEW.locked IS DISTINCT FROM OLD.locked THEN
      RAISE EXCEPTION 'Cette facture est verrouillee : son contenu ne peut plus etre modifie.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_invoice_immutable BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_immutable();

CREATE OR REPLACE FUNCTION public.guard_invoice_items_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _locked boolean;
BEGIN
  SELECT locked INTO _locked FROM public.invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF _locked AND TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Les lignes d''une facture verrouillee ne peuvent pas etre modifiees.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_invoice_items_immutable BEFORE UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_items_immutable();

-- EVENT LOG
CREATE TABLE public.document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_entity ON public.document_events(entity_type, entity_id);
GRANT SELECT, INSERT ON public.document_events TO authenticated;
GRANT ALL ON public.document_events TO service_role;
ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events select" ON public.document_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own events insert" ON public.document_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ATOMIC CONVERSION QUOTE -> INVOICE
CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(_quote_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _q public.quotes%ROWTYPE; _invoice_id uuid; _number text; _sum numeric(14,2);
BEGIN
  SELECT * INTO _q FROM public.quotes WHERE id = _quote_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Devis introuvable.'; END IF;
  IF _q.status = 'CONVERTED' THEN RAISE EXCEPTION 'Ce devis a deja ete transforme en facture.'; END IF;
  IF _q.status <> 'ACCEPTED' THEN RAISE EXCEPTION 'Seul un devis accepte peut etre transforme en facture.'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE quote_id = _quote_id) THEN
    RAISE EXCEPTION 'Une facture existe deja pour ce devis.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quote_items WHERE quote_id = _quote_id) THEN
    RAISE EXCEPTION 'Ce devis ne contient aucune ligne.';
  END IF;

  SELECT COALESCE(SUM(ROUND(quantity * unit_price, 2)), 0) INTO _sum
    FROM public.quote_items WHERE quote_id = _quote_id;

  _number := public.next_document_number(_q.user_id, 'invoice');

  INSERT INTO public.invoices (user_id, client_id, quote_id, quote_number_ref, invoice_number,
                               status, issue_date, notes, subtotal, total, locked)
  VALUES (_q.user_id, _q.client_id, _q.id, _q.quote_number, _number,
          'UNPAID', CURRENT_DATE, _q.notes, _sum, _sum, true)
  RETURNING id INTO _invoice_id;

  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, line_total, position)
  SELECT _invoice_id, description, quantity, unit_price, ROUND(quantity * unit_price, 2), position
  FROM public.quote_items WHERE quote_id = _quote_id ORDER BY position;

  IF (SELECT COALESCE(SUM(line_total),0) FROM public.invoice_items WHERE invoice_id = _invoice_id) <> _sum THEN
    RAISE EXCEPTION 'Incoherence de total lors de la conversion.';
  END IF;

  UPDATE public.quotes SET status = 'CONVERTED' WHERE id = _quote_id;

  INSERT INTO public.document_events (user_id, entity_type, entity_id, event_type, metadata)
  VALUES (_q.user_id, 'invoice', _invoice_id, 'CONVERTED_FROM_QUOTE',
          jsonb_build_object('quote_id', _quote_id, 'quote_number', _q.quote_number));

  RETURN _invoice_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid) TO authenticated;

-- PUBLIC QUOTE VIEW BY TOKEN (read-only, no auth)
CREATE OR REPLACE FUNCTION public.get_public_quote(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _q public.quotes%ROWTYPE; _result jsonb;
BEGIN
  SELECT * INTO _q FROM public.quotes WHERE public_token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'quote', jsonb_build_object(
      'quote_number', _q.quote_number, 'status', _q.status, 'issue_date', _q.issue_date,
      'valid_until', _q.valid_until, 'notes', _q.notes, 'subtotal', _q.subtotal, 'total', _q.total),
    'client', (SELECT jsonb_build_object('name', c.name, 'company_name', c.company_name,
        'email', c.email, 'phone', c.phone, 'address', c.address, 'city', c.city)
      FROM public.clients c WHERE c.id = _q.client_id),
    'artisan', (SELECT jsonb_build_object('business_name', p.business_name, 'full_name', p.full_name,
        'phone', p.phone, 'email', p.email, 'address', p.address, 'city', p.city,
        'country', p.country, 'tax_identifier', p.tax_identifier, 'logo_url', p.logo_url,
        'currency', p.currency, 'quote_terms', p.quote_terms)
      FROM public.artisan_profiles p WHERE p.user_id = _q.user_id),
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('description', i.description,
        'quantity', i.quantity, 'unit_price', i.unit_price, 'line_total', i.line_total)
        ORDER BY i.position) FROM public.quote_items i WHERE i.quote_id = _q.id), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_public_quote(text) TO anon, authenticated;
