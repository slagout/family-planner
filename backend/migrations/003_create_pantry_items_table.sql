-- Migration: 003_create_pantry_items_table
CREATE TABLE IF NOT EXISTS pantry_items (
    id         SERIAL PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    quantity   NUMERIC(10,3) NOT NULL DEFAULT 0,
    unit       VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, name, unit)
);

CREATE INDEX IF NOT EXISTS idx_pantry_user ON pantry_items(user_id);
