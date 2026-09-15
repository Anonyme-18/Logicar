CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Better Auth core tables.
CREATE TABLE auth_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id uuid NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE
);
CREATE INDEX auth_session_user_id_idx ON auth_session(user_id);

CREATE TABLE auth_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, account_id)
);
CREATE INDEX auth_account_user_id_idx ON auth_account(user_id);

CREATE TABLE auth_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_verification_identifier_idx ON auth_verification(identifier);

CREATE TYPE quote_status AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED');
CREATE TYPE invoice_status AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');

CREATE TABLE artisan_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  address text,
  city text,
  country text,
  tax_identifier text,
  logo_url text,
  currency text NOT NULL DEFAULT 'XOF' CHECK (currency IN ('XOF', 'XAF', 'EUR', 'USD')),
  quote_terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
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
CREATE INDEX clients_user_id_idx ON clients(user_id);

CREATE TABLE document_counters (
  user_id uuid NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('quote', 'invoice')),
  year int NOT NULL,
  seq int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, kind, year)
);

CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  quote_number text NOT NULL,
  status quote_status NOT NULL DEFAULT 'DRAFT',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  notes text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  shared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quote_number),
  CHECK (valid_until IS NULL OR valid_until >= issue_date)
);
CREATE INDEX quotes_user_id_idx ON quotes(user_id);

CREATE TABLE quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(14,2) NOT NULL CHECK (line_total = round(quantity * unit_price, 2)),
  position int NOT NULL DEFAULT 0
);
CREATE INDEX quote_items_quote_id_idx ON quote_items(quote_id);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  quote_id uuid UNIQUE REFERENCES quotes(id) ON DELETE SET NULL,
  quote_number_ref text,
  invoice_number text NOT NULL,
  status invoice_status NOT NULL DEFAULT 'UNPAID',
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
CREATE INDEX invoices_user_id_idx ON invoices(user_id);

CREATE OR REPLACE FUNCTION validate_document_client_owner()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = NEW.client_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Client invalide pour cet utilisateur.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER quotes_client_owner BEFORE INSERT OR UPDATE OF client_id, user_id ON quotes
FOR EACH ROW EXECUTE FUNCTION validate_document_client_owner();
CREATE TRIGGER invoices_client_owner BEFORE INSERT OR UPDATE OF client_id, user_id ON invoices
FOR EACH ROW EXECUTE FUNCTION validate_document_client_owner();

CREATE OR REPLACE FUNCTION guard_invoice_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.locked AND (NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.total IS DISTINCT FROM OLD.total OR NEW.subtotal IS DISTINCT FROM OLD.subtotal OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number OR NEW.issue_date IS DISTINCT FROM OLD.issue_date OR NEW.quote_id IS DISTINCT FROM OLD.quote_id OR NEW.notes IS DISTINCT FROM OLD.notes OR NEW.locked IS DISTINCT FROM OLD.locked) THEN
    RAISE EXCEPTION 'Cette facture est verrouillée.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invoices_immutable BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION guard_invoice_immutable();

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(14,2) NOT NULL CHECK (line_total = round(quantity * unit_price, 2)),
  position int NOT NULL DEFAULT 0
);
CREATE INDEX invoice_items_invoice_id_idx ON invoice_items(invoice_id);

CREATE OR REPLACE FUNCTION guard_invoice_items_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT locked FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id)) AND TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Les lignes d''une facture verrouillée ne peuvent pas être modifiées.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER invoice_items_immutable BEFORE UPDATE OR DELETE ON invoice_items
FOR EACH ROW EXECUTE FUNCTION guard_invoice_items_immutable();

CREATE TABLE document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER artisan_profiles_updated BEFORE UPDATE ON artisan_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER clients_updated BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER quotes_updated BEFORE UPDATE ON quotes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER invoices_updated BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION next_document_number(p_user_id uuid, p_kind text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE current_year int := EXTRACT(YEAR FROM now())::int; next_seq int; prefix text;
BEGIN
  INSERT INTO document_counters(user_id, kind, year, seq)
  VALUES (p_user_id, p_kind, current_year, 1)
  ON CONFLICT (user_id, kind, year)
  DO UPDATE SET seq = document_counters.seq + 1
  RETURNING seq INTO next_seq;
  prefix := CASE WHEN p_kind = 'quote' THEN 'DEV' ELSE 'FAC' END;
  RETURN prefix || '-' || current_year::text || '-' || lpad(next_seq::text, 4, '0');
END;
$$;
