CREATE TABLE IF NOT EXISTS user_permissions (
  user_id uuid NOT NULL REFERENCES users (id),
  permission_id uuid NOT NULL REFERENCES permissions (id),
  PRIMARY KEY (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS user_permissions_user_idx ON user_permissions (user_id);
CREATE INDEX IF NOT EXISTS user_permissions_permission_idx ON user_permissions (permission_id);

INSERT INTO permissions (code, name)
VALUES
  ('MANAGE_SHIFTS', 'Gerenciar Plantões'),
  ('MANAGE_SHIFT_VALUE', 'Gerenciar Valor do Plantão'),
  ('MANAGE_VALUE_CONFIGURATION', 'Gerenciar Configuração de valores'),
  ('MANAGE_PROFESSIONALS', 'Gerenciar Profissionais'),
  ('MANAGE_COORDINATORS', 'Gerenciar Coordenadores'),
  ('MANAGE_VIEWERS', 'Gerenciar Visualizadores'),
  ('MANAGE_ALERTS', 'Gerenciar Alertas')
ON CONFLICT DO NOTHING;
