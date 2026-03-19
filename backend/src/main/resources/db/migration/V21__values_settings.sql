CREATE TABLE shift_type_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  sector_id uuid NOT NULL REFERENCES sectors (id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  shift_type_code text NOT NULL,
  value_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sector_id, period_start, period_end, shift_type_code)
);

CREATE INDEX shift_type_values_lookup_idx ON shift_type_values (tenant_id, sector_id, period_start, period_end);

CREATE TABLE bonus_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  sector_id uuid NOT NULL REFERENCES sectors (id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  bonus_rule_id uuid NOT NULL REFERENCES bonus_rules (id),
  value_kind text NOT NULL,
  value_cents integer,
  value_bps integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sector_id, period_start, period_end, bonus_rule_id)
);

CREATE INDEX bonus_values_lookup_idx ON bonus_values (tenant_id, sector_id, period_start, period_end);

