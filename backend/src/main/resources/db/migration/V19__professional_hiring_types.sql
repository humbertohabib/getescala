CREATE TABLE professional_hiring_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants (id),
  organization_type_id uuid REFERENCES organization_types (id),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (tenant_id IS NOT NULL OR organization_type_id IS NOT NULL),
  CHECK (NOT (tenant_id IS NOT NULL AND organization_type_id IS NOT NULL)),
  UNIQUE (tenant_id, name),
  UNIQUE (organization_type_id, name)
);

CREATE INDEX professional_hiring_types_tenant_idx ON professional_hiring_types (tenant_id);
CREATE INDEX professional_hiring_types_org_type_idx ON professional_hiring_types (organization_type_id);

INSERT INTO professional_hiring_types (organization_type_id, name, sort_order)
SELECT ot.id, v.name, v.sort_order
FROM organization_types ot
CROSS JOIN (
  VALUES
    ('CLT', 10),
    ('Estatutário', 20),
    ('PJ', 30),
    ('RT Temporário', 40),
    ('Cooperado', 50),
    ('Não Cooperado', 60),
    ('Graduação', 70),
    ('Pós-Graduação', 80)
) AS v(name, sort_order)
ON CONFLICT DO NOTHING;
