ALTER TABLE professionals
  ADD COLUMN birth_date date,
  ADD COLUMN cpf text,
  ADD COLUMN prefix text,
  ADD COLUMN profession text,
  ADD COLUMN specialties text,
  ADD COLUMN department text,
  ADD COLUMN admission_date date,
  ADD COLUMN registration_type text,
  ADD COLUMN professional_registration text,
  ADD COLUMN cep text,
  ADD COLUMN street text,
  ADD COLUMN address_number text,
  ADD COLUMN neighborhood text,
  ADD COLUMN complement text,
  ADD COLUMN state text,
  ADD COLUMN city text,
  ADD COLUMN country text,
  ADD COLUMN code text,
  ADD COLUMN notes text,
  ADD COLUMN details text,
  ADD COLUMN photo_file_name text,
  ADD COLUMN photo_content_type text,
  ADD COLUMN photo_data bytea;

CREATE TABLE professional_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  professional_id uuid NOT NULL REFERENCES professionals (id),
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX professional_emergency_contacts_tenant_professional_idx
  ON professional_emergency_contacts (tenant_id, professional_id);
