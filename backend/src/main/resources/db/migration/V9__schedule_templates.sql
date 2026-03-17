CREATE TABLE schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  sector_id uuid NOT NULL REFERENCES sectors (id),
  name text NOT NULL,
  weeks_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sector_id, name)
);

CREATE TABLE schedule_template_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  template_id uuid NOT NULL REFERENCES schedule_templates (id) ON DELETE CASCADE,
  week_index integer NOT NULL,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  end_day_offset smallint NOT NULL DEFAULT 0,
  professional_id uuid REFERENCES professionals (id),
  value_cents integer,
  currency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE schedule_templates
  ADD CONSTRAINT schedule_templates_weeks_count_check CHECK (weeks_count >= 1 AND weeks_count <= 12);

ALTER TABLE schedule_template_shifts
  ADD CONSTRAINT schedule_template_shifts_week_index_check CHECK (week_index >= 1 AND week_index <= 12);

ALTER TABLE schedule_template_shifts
  ADD CONSTRAINT schedule_template_shifts_day_of_week_check CHECK (day_of_week >= 1 AND day_of_week <= 7);

ALTER TABLE schedule_template_shifts
  ADD CONSTRAINT schedule_template_shifts_end_day_offset_check CHECK (end_day_offset >= 0 AND end_day_offset <= 1);

CREATE INDEX schedule_templates_tenant_sector_idx ON schedule_templates (tenant_id, sector_id);
CREATE INDEX schedule_template_shifts_template_idx ON schedule_template_shifts (tenant_id, template_id, week_index, day_of_week, start_time);
