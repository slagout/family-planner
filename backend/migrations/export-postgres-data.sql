/**
 * PostgreSQL Data Export Script
 * 
 * This script extracts all data from PostgreSQL in a format suitable for
 * migration to MongoDB. Generates JSON output that can be imported directly.
 * 
 * Usage:
 *   PGHOST=localhost PGUSER=fp_user PGPASSWORD=password psql family_planner < export-postgres-data.sql > data_export.json
 */

-- Set output formatting for JSON
\set QUIET on
\pset format json

-- Function to export users
SELECT 'users' as collection, json_agg(json_build_object(
    '_id', id::text,
    'email', email,
    'passwordHash', password_hash,
    'displayName', display_name,
    'krogerToken', kroger_token,
    'createdAt', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedAt', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
)) as data
FROM users;

-- Export recipes with nested ingredients
SELECT 'recipes' as collection, json_agg(json_build_object(
    '_id', r.id::text,
    'name', r.name,
    'description', r.description,
    'servings', r.servings,
    'prepMinutes', r.prep_minutes,
    'cookMinutes', r.cook_minutes,
    'tags', r.tags,
    'ingredients', COALESCE(json_agg(
        json_build_object(
            'name', ri.name,
            'quantity', ri.quantity,
            'unit', ri.unit,
            'krogerUpc', ri.kroger_upc
        )
    ) FILTER (WHERE ri.id IS NOT NULL), '[]'::json),
    'createdBy', r.created_by::text,
    'createdAt', to_char(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedAt', to_char(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
)) as data
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
GROUP BY r.id;

-- Export pantry items
SELECT 'pantry_items' as collection, json_agg(json_build_object(
    '_id', id::text,
    'userId', user_id::text,
    'name', name,
    'quantity', quantity,
    'unit', unit,
    'createdAt', to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedAt', to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
)) as data
FROM pantry_items;

-- Export weekly menus with nested menu items
SELECT 'weekly_menus' as collection, json_agg(json_build_object(
    '_id', wm.id::text,
    'userId', wm.user_id::text,
    'weekNumber', wm.week_number,
    'year', wm.year,
    'meals', COALESCE(json_agg(
        json_build_object(
            'dayOfWeek', mi.day_of_week,
            'recipeId', mi.recipe_id::text,
            'mealType', 'dinner'
        )
    ) FILTER (WHERE mi.id IS NOT NULL), '[]'::json),
    'createdAt', to_char(wm.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedAt', to_char(wm.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
)) as data
FROM weekly_menu wm
LEFT JOIN menu_item mi ON wm.id = mi.weekly_menu_id
GROUP BY wm.id;
