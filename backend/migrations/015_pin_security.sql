-- Migration 015: Parental PIN security
-- Adds a bcrypt-hashed PIN to the users table and a short-lived pin_sessions table.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS parental_pin_hash VARCHAR(255);

CREATE TABLE IF NOT EXISTS pin_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(128) UNIQUE NOT NULL,  -- cryptographically random token
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pin_sessions_token      ON pin_sessions(token);
CREATE INDEX idx_pin_sessions_user_id    ON pin_sessions(user_id);
CREATE INDEX idx_pin_sessions_expires_at ON pin_sessions(expires_at);

-- Auto-purge expired sessions (run via cron or on each validation)
-- The application will DELETE expired rows on token lookup, but this function
-- can be called periodically to clean up old rows.
CREATE OR REPLACE FUNCTION purge_expired_pin_sessions() RETURNS void AS $$
BEGIN
  DELETE FROM pin_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
