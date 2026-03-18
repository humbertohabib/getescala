CREATE TABLE professional_prefixes (
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

CREATE INDEX professional_prefixes_tenant_idx ON professional_prefixes (tenant_id);
CREATE INDEX professional_prefixes_org_type_idx ON professional_prefixes (organization_type_id);

CREATE TABLE professional_professions (
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

CREATE INDEX professional_professions_tenant_idx ON professional_professions (tenant_id);
CREATE INDEX professional_professions_org_type_idx ON professional_professions (organization_type_id);

CREATE TABLE professional_registration_types (
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

CREATE INDEX professional_registration_types_tenant_idx ON professional_registration_types (tenant_id);
CREATE INDEX professional_registration_types_org_type_idx ON professional_registration_types (organization_type_id);

CREATE TABLE professional_specialties (
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

CREATE INDEX professional_specialties_tenant_idx ON professional_specialties (tenant_id);
CREATE INDEX professional_specialties_org_type_idx ON professional_specialties (organization_type_id);

INSERT INTO professional_prefixes (organization_type_id, name, sort_order)
SELECT ot.id, v.name, v.sort_order
FROM organization_types ot
CROSS JOIN (
  VALUES
    ('Sr.', 10),
    ('Sra.', 20),
    ('Dr.', 30),
    ('Dra.', 40),
    ('Prof.', 50),
    ('Profa.', 60)
) AS v(name, sort_order)
ON CONFLICT DO NOTHING;

INSERT INTO professional_professions (organization_type_id, name, sort_order)
SELECT ot.id, v.name, v.sort_order
FROM organization_types ot
CROSS JOIN (
  VALUES
    ('Profissional', 10),
    ('Coordenador', 20),
    ('Colaborador', 30),
    ('Voluntário', 40)
) AS v(name, sort_order)
ON CONFLICT DO NOTHING;

INSERT INTO professional_registration_types (organization_type_id, name, sort_order)
SELECT ot.id, v.name, v.sort_order
FROM organization_types ot
CROSS JOIN (
  VALUES
    ('Não se aplica', 10),
    ('CRM', 20),
    ('COREN', 30),
    ('CRO', 40),
    ('CRP', 50),
    ('CRF', 60),
    ('CREFITO', 70),
    ('Outro', 80)
) AS v(name, sort_order)
ON CONFLICT DO NOTHING;

INSERT INTO professional_specialties (organization_type_id, name, sort_order)
SELECT ot.id, v.name, v.sort_order
FROM organization_types ot
CROSS JOIN (
  VALUES
    ('Geral', 10),
    ('Administração', 20),
    ('Operações', 30)
) AS v(name, sort_order)
ON CONFLICT DO NOTHING;
