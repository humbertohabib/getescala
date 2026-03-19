CREATE TABLE bonus_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  name text NOT NULL,
  value_kind text NOT NULL,
  value_cents integer,
  value_bps integer,
  bonus_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bonus_rules_tenant_idx ON bonus_rules (tenant_id);
