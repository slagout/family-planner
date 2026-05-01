-- Migration: 004_create_menu_tables
CREATE TABLE IF NOT EXISTS weekly_menu (
    id           SERIAL PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_number  INT NOT NULL,
    year         INT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, week_number, year)
);

CREATE TABLE IF NOT EXISTS menu_item (
    id             SERIAL PRIMARY KEY,
    weekly_menu_id INT NOT NULL REFERENCES weekly_menu(id) ON DELETE CASCADE,
    recipe_id      INT NOT NULL REFERENCES recipes(id),
    day_of_week    VARCHAR(3) NOT NULL CHECK (day_of_week IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
    UNIQUE(weekly_menu_id, day_of_week)
);
