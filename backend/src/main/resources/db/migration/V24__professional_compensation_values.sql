CREATE TABLE professional_compensation_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  professional_id uuid NOT NULL REFERENCES professionals (id),
  period_start date NOT NULL,
  period_end date,
  unit text NOT NULL,
  value_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (unit IN ('HOUR', 'MONTH')),
  CHECK (value_cents >= 0),
  CHECK (period_end IS NULL OR period_end >= period_start)
);

CREATE INDEX professional_comp_values_tenant_professional_idx ON professional_compensation_values (tenant_id, professional_id);
CREATE INDEX professional_comp_values_tenant_period_idx ON professional_compensation_values (tenant_id, period_start, period_end);
