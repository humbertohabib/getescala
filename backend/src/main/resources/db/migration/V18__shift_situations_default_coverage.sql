INSERT INTO shift_situations (tenant_id, code, name, requires_coverage, is_system)
SELECT t.id, v.code, v.name, v.requires_coverage, v.is_system
FROM tenants t
CROSS JOIN (
  VALUES
    ('DESIGNADO', 'Designado', true, true),
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

UPDATE shift_situations SET requires_coverage = true WHERE code IN ('DESIGNADO', 'FALTA_JUSTIFICADA', 'FALTA_NAO_JUSTIFICADA', 'TROCADO');
UPDATE shift_situations SET requires_coverage = false WHERE code IN ('FERIADO', 'FERIAS', 'FOLGA');
UPDATE shift_situations SET is_system = true WHERE code = 'DESIGNADO';
