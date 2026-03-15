ALTER TABLE users
  ADD COLUMN auth_provider text NOT NULL DEFAULT 'PASSWORD';

ALTER TABLE users
  ADD CONSTRAINT users_auth_provider_check CHECK (auth_provider IN ('PASSWORD', 'GOOGLE'));
