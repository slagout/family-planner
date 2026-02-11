-- Migration: 001_create_menu_tables
-- Description: Create weekly_menu and menu_item tables for the menu planner feature.
-- Run this once against your PostgreSQL database.

-- weekly_menu: one row per week (ISO week number + year)
CREATE TABLE IF NOT EXISTS weekly_menu (
    id            SERIAL PRIMARY KEY,
    owner_id      INTEGER NOT NULL REFERENCES users(id),
    year          SMALLINT NOT NULL,
    iso_week      SMALLINT NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- menu_item: one recipe per day (Monday=1 … Sunday=7)
CREATE TABLE IF NOT EXISTS menu_item (
    id            SERIAL PRIMARY KEY,
    menu_id       INTEGER NOT NULL REFERENCES weekly_menu(id) ON DELETE CASCADE,
    day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    recipe_id     INTEGER NOT NULL REFERENCES recipes(id),
    notes         TEXT,
    UNIQUE(menu_id, day_of_week)
);
