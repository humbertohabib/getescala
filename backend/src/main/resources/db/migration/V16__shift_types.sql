CREATE TABLE shift_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  code text NOT NULL,
  name text NOT NULL,
  color text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code),
  UNIQUE (tenant_id, name)
);

INSERT INTO shift_types (tenant_id, code, name, color, is_system)
SELECT t.id, 'NORMAL', 'Normal', '#64748b', true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM shift_types st WHERE st.tenant_id = t.id AND st.code = 'NORMAL'
);

INSERT INTO shift_types (tenant_id, code, name, color, is_system)
SELECT t.id, 'NOTURNO', 'Noturno', '#4f46e5', false
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM shift_types st WHERE st.tenant_id = t.id AND st.code = 'NOTURNO'
);

INSERT INTO shift_types (tenant_id, code, name, color, is_system)
SELECT t.id, 'FIM_DE_SEMANA', 'Fim de semana', '#f97316', false
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM shift_types st WHERE st.tenant_id = t.id AND st.code = 'FIM_DE_SEMANA'
);

INSERT INTO shift_types (tenant_id, code, name, color, is_system)
SELECT t.id, 'FERIADO', 'Feriado', '#dc2626', false
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM shift_types st WHERE st.tenant_id = t.id AND st.code = 'FERIADO'
);

INSERT INTO shift_types (tenant_id, code, name, color, is_system)
SELECT t.id, 'OUTRO', 'Outro', '#0f172a', false
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM shift_types st WHERE st.tenant_id = t.id AND st.code = 'OUTRO'
);

ALTER TABLE schedule_template_shifts
  DROP CONSTRAINT IF EXISTS schedule_template_shifts_kind_check;

ALTER TABLE schedule_template_shifts
  ADD CONSTRAINT schedule_template_shifts_kind_fk FOREIGN KEY (tenant_id, kind) REFERENCES shift_types (tenant_id, code);

ALTER TABLE shifts
  ADD COLUMN kind text NOT NULL DEFAULT 'NORMAL';

ALTER TABLE shifts
  ADD CONSTRAINT shifts_kind_fk FOREIGN KEY (tenant_id, kind) REFERENCES shift_types (tenant_id, code);

CREATE INDEX shift_types_tenant_name_idx ON shift_types (tenant_id, name);
CREATE INDEX shifts_tenant_kind_start_idx ON shifts (tenant_id, kind, start_time);
