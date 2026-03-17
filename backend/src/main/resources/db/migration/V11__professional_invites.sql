CREATE TABLE professional_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  professional_id uuid NOT NULL REFERENCES professionals (id),
  email text NOT NULL,
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz NOT NULL,
  created_by_user_id uuid REFERENCES users (id),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX professional_invites_token_hash_uniq ON professional_invites (token_hash);
CREATE INDEX professional_invites_tenant_email_idx ON professional_invites (tenant_id, email);
