CREATE TABLE segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL REFERENCES segments (id),
  name text NOT NULL,
  user_term text NOT NULL,
  shift_term text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (segment_id, name)
);

ALTER TABLE tenants ADD COLUMN organization_type_id uuid REFERENCES organization_types (id);

INSERT INTO segments (name) VALUES ('Saúde') ON CONFLICT DO NOTHING;
INSERT INTO segments (name) VALUES ('Outros') ON CONFLICT DO NOTHING;

WITH s AS (SELECT id FROM segments WHERE name = 'Saúde')
INSERT INTO organization_types (segment_id, name, user_term, shift_term)
SELECT s.id, v.name, v.user_term, v.shift_term
FROM s
CROSS JOIN (
  VALUES
    ('Hospital', 'profissional', 'plantão'),
    ('Cooperativa', 'profissional', 'plantão'),
    ('Grupo médico', 'profissional', 'plantão'),
    ('Secretaria de Saúde', 'profissional', 'plantão'),
    ('Clínica', 'profissional', 'plantão')
) AS v(name, user_term, shift_term)
ON CONFLICT DO NOTHING;

WITH s AS (SELECT id FROM segments WHERE name = 'Outros')
INSERT INTO organization_types (segment_id, name, user_term, shift_term)
SELECT s.id, 'Outro', 'usuário', 'turno'
FROM s
ON CONFLICT DO NOTHING;

UPDATE tenants t
SET organization_type_id = ot.id
FROM organization_types ot
WHERE t.organization_type_id IS NULL
  AND t.institution_type IS NOT NULL
  AND ot.name = t.institution_type;

UPDATE tenants t
SET organization_type_id = ot.id
FROM organization_types ot
WHERE t.organization_type_id IS NULL
  AND ot.name = 'Outro';
