-- Migration: 001_create_recipes_table
CREATE TABLE IF NOT EXISTS recipes (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    servings      INT DEFAULT 4,
    prep_minutes  INT DEFAULT 0,
    cook_minutes  INT DEFAULT 0,
    tags          VARCHAR(50)[],
    created_by    UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING gin(tags);
