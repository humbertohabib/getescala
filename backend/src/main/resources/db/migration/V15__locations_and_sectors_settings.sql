ALTER TABLE locations
  ADD COLUMN code text,
  ADD COLUMN cep text,
  ADD COLUMN street text,
  ADD COLUMN street_number text,
  ADD COLUMN complement text,
  ADD COLUMN neighborhood text,
  ADD COLUMN city text,
  ADD COLUMN state text,
  ADD COLUMN notes text,
  ADD COLUMN latitude numeric(10, 7),
  ADD COLUMN longitude numeric(10, 7),
  ADD COLUMN time_zone text,
  ADD COLUMN enabled boolean NOT NULL DEFAULT true;

ALTER TABLE sectors
  ADD COLUMN code text,
  ADD COLUMN enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS locations_tenant_enabled_name_idx ON locations (tenant_id, enabled, name);
CREATE INDEX IF NOT EXISTS sectors_tenant_enabled_name_idx ON sectors (tenant_id, enabled, name);
CREATE INDEX IF NOT EXISTS sectors_tenant_location_enabled_name_idx ON sectors (tenant_id, location_id, enabled, name);

CREATE UNIQUE INDEX IF NOT EXISTS locations_tenant_code_uniq
  ON locations (tenant_id, code)
  WHERE code IS NOT NULL AND code <> '';

CREATE UNIQUE INDEX IF NOT EXISTS sectors_tenant_location_code_uniq
  ON sectors (tenant_id, location_id, code)
  WHERE code IS NOT NULL AND code <> '';
