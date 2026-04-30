-- Migration: 002_create_recipe_ingredients_table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id          SERIAL PRIMARY KEY,
    recipe_id   INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    quantity    NUMERIC(10,3) NOT NULL,
    unit        VARCHAR(50),
    kroger_upc  VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_ri_recipe_id ON recipe_ingredients(recipe_id);
