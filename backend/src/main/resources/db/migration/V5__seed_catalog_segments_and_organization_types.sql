INSERT INTO segments (name) VALUES ('Saúde') ON CONFLICT DO NOTHING;
INSERT INTO segments (name) VALUES ('Educação') ON CONFLICT DO NOTHING;
INSERT INTO segments (name) VALUES ('Religioso') ON CONFLICT DO NOTHING;
INSERT INTO segments (name) VALUES ('Operações') ON CONFLICT DO NOTHING;
INSERT INTO segments (name) VALUES ('Serviços') ON CONFLICT DO NOTHING;

WITH s AS (SELECT id FROM segments WHERE name = 'Saúde')
INSERT INTO organization_types (segment_id, name, user_term, shift_term)
SELECT s.id, v.name, v.user_term, v.shift_term
FROM s
CROSS JOIN (
  VALUES
    ('hospitais', 'profissionais', 'plantões'),
    ('clínicas', 'profissionais', 'plantões'),
    ('home care', 'profissionais', 'plantões'),
    ('cooperativas médicas', 'profissionais', 'plantões'),
    ('laboratórios', 'profissionais', 'plantões')
) AS v(name, user_term, shift_term)
ON CONFLICT DO NOTHING;

WITH s AS (SELECT id FROM segments WHERE name = 'Educação')
INSERT INTO organization_types (segment_id, name, user_term, shift_term)
SELECT s.id, v.name, v.user_term, v.shift_term
FROM s
CROSS JOIN (
  VALUES
    ('escolas', 'colaboradores', 'turnos'),
    ('universidades', 'colaboradores', 'turnos'),
    ('cursos', 'colaboradores', 'turnos')
) AS v(name, user_term, shift_term)
ON CONFLICT DO NOTHING;

WITH s AS (SELECT id FROM segments WHERE name = 'Religioso')
INSERT INTO organization_types (segment_id, name, user_term, shift_term)
SELECT s.id, v.name, v.user_term, v.shift_term
FROM s
CROSS JOIN (
  VALUES
    ('igrejas', 'voluntários', 'escalas'),
    ('voluntários', 'voluntários', 'escalas')
) AS v(name, user_term, shift_term)
ON CONFLICT DO NOTHING;

WITH s AS (SELECT id FROM segments WHERE name = 'Operações')
INSERT INTO organization_types (segment_id, name, user_term, shift_term)
SELECT s.id, v.name, v.user_term, v.shift_term
FROM s
CROSS JOIN (
  VALUES
    ('suporte técnico', 'equipe', 'turnos'),
    ('equipes de TI', 'equipe', 'turnos'),
    ('equipes de campo', 'equipe', 'turnos'),
    ('equipes industriais', 'equipe', 'turnos')
) AS v(name, user_term, shift_term)
ON CONFLICT DO NOTHING;

WITH s AS (SELECT id FROM segments WHERE name = 'Serviços')
INSERT INTO organization_types (segment_id, name, user_term, shift_term)
SELECT s.id, v.name, v.user_term, v.shift_term
FROM s
CROSS JOIN (
  VALUES
    ('segurança', 'equipe', 'turnos'),
    ('portaria', 'equipe', 'turnos'),
    ('manutenção', 'equipe', 'turnos'),
    ('call centers', 'equipe', 'turnos')
) AS v(name, user_term, shift_term)
ON CONFLICT DO NOTHING;
