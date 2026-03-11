ALTER TABLE tenants
  ADD COLUMN stripe_customer_id text,
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN stripe_subscription_status text,
  ADD COLUMN stripe_seat_limit integer,
  ADD COLUMN stripe_current_period_end timestamptz,
  ADD COLUMN stripe_cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE INDEX tenants_stripe_customer_id_idx ON tenants (stripe_customer_id);
CREATE INDEX tenants_stripe_subscription_id_idx ON tenants (stripe_subscription_id);
