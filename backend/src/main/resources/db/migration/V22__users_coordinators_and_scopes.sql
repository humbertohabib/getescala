ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text;

UPDATE users
SET full_name = initcap(replace(split_part(email, '@', 1), '.', ' '))
WHERE full_name IS NULL OR btrim(full_name) = '';

CREATE INDEX IF NOT EXISTS users_tenant_full_name_idx ON users (tenant_id, full_name);

INSERT INTO roles (tenant_id, code, name)
SELECT t.id, v.code, v.name
FROM tenants t
CROSS JOIN (
  VALUES
    ('USER', 'Usuário'),
    ('ADMIN', 'Administrador'),
    ('COORDINATOR', 'Coordenador'),
    ('VIEWER', 'Visualizador')
) AS v(code, name)
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.tenant_id = u.tenant_id AND r.code = 'USER'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.tenant_id = u.tenant_id AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS user_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  user_id uuid NOT NULL REFERENCES users (id),
  scope_type text NOT NULL,
  location_id uuid REFERENCES locations (id),
  sector_id uuid REFERENCES sectors (id),
  group_id uuid REFERENCES groups (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (scope_type IN ('LOCATION', 'SECTOR', 'GROUP')),
  CHECK (
    (scope_type = 'LOCATION' AND location_id IS NOT NULL AND sector_id IS NULL AND group_id IS NULL)
    OR (scope_type = 'SECTOR' AND sector_id IS NOT NULL AND location_id IS NULL AND group_id IS NULL)
    OR (scope_type = 'GROUP' AND group_id IS NOT NULL AND location_id IS NULL AND sector_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS user_scopes_tenant_user_idx ON user_scopes (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS user_scopes_tenant_type_idx ON user_scopes (tenant_id, scope_type);

CREATE UNIQUE INDEX IF NOT EXISTS user_scopes_user_location_uniq
  ON user_scopes (user_id, location_id) WHERE scope_type = 'LOCATION';

CREATE UNIQUE INDEX IF NOT EXISTS user_scopes_user_sector_uniq
  ON user_scopes (user_id, sector_id) WHERE scope_type = 'SECTOR';

CREATE UNIQUE INDEX IF NOT EXISTS user_scopes_user_group_uniq
  ON user_scopes (user_id, group_id) WHERE scope_type = 'GROUP';
