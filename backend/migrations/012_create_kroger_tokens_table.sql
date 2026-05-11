CREATE TABLE IF NOT EXISTS kroger_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  access_token TEXT NOT NULL,   -- TODO: encrypt with AES-256-GCM in production
  refresh_token TEXT NOT NULL,  -- TODO: encrypt with AES-256-GCM in production
  expires_at TIMESTAMPTZ NOT NULL,
  location_id VARCHAR(20),      -- preferred Kroger store location
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kroger_tokens_user_id ON kroger_tokens(user_id);
