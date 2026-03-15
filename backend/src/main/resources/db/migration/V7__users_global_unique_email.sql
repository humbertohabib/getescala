ALTER TABLE users ADD COLUMN IF NOT EXISTS email_global_key text;

WITH ranked AS (
  SELECT
    id,
    lower(trim(email)) AS email_key,
    row_number() OVER (PARTITION BY lower(trim(email)) ORDER BY created_at ASC, id ASC) AS rn
  FROM users
)
UPDATE users u
SET email_global_key = ranked.email_key
FROM ranked
WHERE u.id = ranked.id
  AND ranked.rn = 1
  AND (u.email_global_key IS NULL OR u.email_global_key = '');

CREATE UNIQUE INDEX IF NOT EXISTS users_email_global_key_uniq ON users (email_global_key);
