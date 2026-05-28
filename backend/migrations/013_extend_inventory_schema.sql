-- Migration: 013_extend_inventory_schema
-- Extends pantry_items and creates freezer, refrigerator, bulk cooking tables

-- Extend pantry_items with full tracking columns
ALTER TABLE pantry_items
  ADD COLUMN IF NOT EXISTS upc               VARCHAR(20),
  ADD COLUMN IF NOT EXISTS category          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS expiration_date   DATE,
  ADD COLUMN IF NOT EXISTS location          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS low_qty_threshold NUMERIC(10,3) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS kroger_item_id    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pantry_upc    ON pantry_items(upc)             WHERE upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pantry_expiry ON pantry_items(expiration_date) WHERE expiration_date IS NOT NULL;

-- Freezer items
CREATE TABLE IF NOT EXISTS freezer_items (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upc             VARCHAR(20),
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100),
  quantity        NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit            VARCHAR(50),
  expiration_date DATE,
  freezer_bin     VARCHAR(100),
  sous_vide_ready BOOLEAN DEFAULT false,
  notes           TEXT,
  kroger_item_id  VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freezer_user   ON freezer_items(user_id);
CREATE INDEX IF NOT EXISTS idx_freezer_upc    ON freezer_items(upc)             WHERE upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_freezer_expiry ON freezer_items(expiration_date) WHERE expiration_date IS NOT NULL;

-- Refrigerator items
CREATE TABLE IF NOT EXISTS refrigerator_items (
  id               SERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upc              VARCHAR(20),
  name             VARCHAR(255) NOT NULL,
  category         VARCHAR(100),
  quantity         NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit             VARCHAR(50),
  expiration_date  DATE,
  shelf            VARCHAR(100),
  temperature_zone VARCHAR(50),
  is_dairy_free    BOOLEAN DEFAULT false,
  notes            TEXT,
  kroger_item_id   VARCHAR(100),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fridge_user   ON refrigerator_items(user_id);
CREATE INDEX IF NOT EXISTS idx_fridge_upc    ON refrigerator_items(upc)             WHERE upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fridge_expiry ON refrigerator_items(expiration_date) WHERE expiration_date IS NOT NULL;

-- Bulk cooking batches
CREATE TABLE IF NOT EXISTS bulk_cooking_batches (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_name          VARCHAR(255) NOT NULL,
  recipe_name         VARCHAR(255),
  recipe_id           INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
  prep_date           DATE,
  freeze_date         DATE,
  portions            INTEGER NOT NULL DEFAULT 1,
  storage_location    VARCHAR(100),
  reheat_instructions TEXT,
  meal_plan_date      DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_user      ON bulk_cooking_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_meal_plan ON bulk_cooking_batches(meal_plan_date) WHERE meal_plan_date IS NOT NULL;
