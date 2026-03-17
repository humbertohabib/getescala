ALTER TABLE schedule_template_shifts
  ADD COLUMN kind text NOT NULL DEFAULT 'NORMAL';

ALTER TABLE schedule_template_shifts
  ADD CONSTRAINT schedule_template_shifts_kind_check CHECK (kind IN ('NORMAL', 'NOTURNO', 'FIM_DE_SEMANA', 'OUTRO'));

