CREATE TABLE shift_situations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  code text NOT NULL,
  name text NOT NULL,
  requires_coverage boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code),
  UNIQUE (tenant_id, name)
);

INSERT INTO shift_situations (tenant_id, code, name, requires_coverage, is_system)
SELECT t.id, v.code, v.name, v.requires_coverage, v.is_system
FROM tenants t
CROSS JOIN (
  VALUES
    ('DESIGNADO', 'Designado', false, true),
    ('FALTA_JUSTIFICADA', 'Falta Justificada', true, false),
    ('FALTA_NAO_JUSTIFICADA', 'Falta Não Justificada', true, false),
    ('FERIADO', 'Feriado', false, false),
    ('FERIAS', 'Férias', false, false),
    ('FOLGA', 'Folga', false, false),
    ('TROCADO', 'Trocado', true, false)
) AS v(code, name, requires_coverage, is_system)
WHERE NOT EXISTS (
  SELECT 1
  FROM shift_situations ss
  WHERE ss.tenant_id = t.id AND ss.code = v.code
);

ALTER TABLE shifts
  ADD COLUMN fixed_professional_id uuid;

UPDATE shifts
SET fixed_professional_id = professional_id
WHERE fixed_professional_id IS NULL;

ALTER TABLE shifts
  ADD COLUMN situation_code text NOT NULL DEFAULT 'DESIGNADO';

ALTER TABLE shifts
  ADD CONSTRAINT shifts_situation_fk FOREIGN KEY (tenant_id, situation_code) REFERENCES shift_situations (tenant_id, code);

CREATE INDEX shift_situations_tenant_name_idx ON shift_situations (tenant_id, name);
CREATE INDEX shifts_tenant_situation_start_idx ON shifts (tenant_id, situation_code, start_time);
