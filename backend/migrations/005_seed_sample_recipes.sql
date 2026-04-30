-- Migration: 005_seed_sample_recipes
-- Only insert if recipes table is empty
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM recipes) = 0 THEN

    -- ============================================================
    -- DINNERS
    -- ============================================================
    INSERT INTO recipes (name, description, servings, prep_minutes, cook_minutes, tags) VALUES
      ('Spaghetti Bolognese', 'Classic Italian meat sauce over pasta', 4, 15, 45, ARRAY['italian','dinner']),
      ('Chicken Stir Fry', 'Quick wok-fried chicken with vegetables', 4, 20, 15, ARRAY['quick','asian','dinner']),
      ('Beef Tacos', 'Seasoned ground beef in crispy shells', 4, 10, 20, ARRAY['mexican','dinner','quick']),
      ('Baked Salmon', 'Herb-crusted salmon with lemon', 4, 10, 25, ARRAY['seafood','healthy','dinner']),
      ('Chicken Tikka Masala', 'Creamy spiced chicken curry', 4, 20, 40, ARRAY['indian','dinner']),
      ('Vegetable Stir Fry', 'Colorful mixed vegetables in garlic sauce', 4, 15, 10, ARRAY['vegetarian','quick','asian']),
      ('Beef Burgers', 'Juicy homemade burgers with fixings', 4, 15, 20, ARRAY['american','dinner']),
      ('Lemon Herb Chicken', 'Roasted chicken thighs with herbs', 4, 10, 35, ARRAY['dinner','healthy']),
      ('Shrimp Pasta', 'Garlic butter shrimp with linguine', 4, 10, 20, ARRAY['seafood','dinner','quick']),
      ('Mushroom Risotto', 'Creamy arborio rice with mushrooms', 4, 10, 35, ARRAY['vegetarian','italian','dinner']),
      ('Pulled Pork Sandwiches', 'Slow-cooked BBQ pulled pork', 6, 15, 480, ARRAY['american','dinner']),
      ('Thai Green Curry', 'Coconut milk curry with vegetables', 4, 15, 25, ARRAY['thai','vegetarian','dinner']),
      ('Chicken Fajitas', 'Sizzling chicken strips with peppers', 4, 15, 20, ARRAY['mexican','quick','dinner']),

    -- ============================================================
    -- LUNCHES
    -- ============================================================
      ('Caesar Salad with Chicken', 'Grilled chicken over romaine with Caesar dressing', 2, 15, 15, ARRAY['lunch','healthy']),
      ('Turkey Club Sandwich', 'Triple-decker sandwich with turkey and bacon', 2, 10, 0, ARRAY['lunch','quick']),
      ('Tomato Basil Soup', 'Creamy roasted tomato soup with fresh basil', 4, 10, 30, ARRAY['vegetarian','lunch','soup']),
      ('Chicken Quesadillas', 'Crispy quesadillas with chicken and cheese', 4, 10, 15, ARRAY['mexican','lunch','quick']),

    -- ============================================================
    -- BREAKFASTS
    -- ============================================================
      ('Pancakes', 'Fluffy buttermilk pancakes', 4, 10, 20, ARRAY['breakfast','vegetarian']),
      ('Veggie Omelette', 'Fluffy omelette with bell peppers and cheese', 2, 10, 10, ARRAY['breakfast','vegetarian','quick']),
      ('Avocado Toast', 'Toasted sourdough with smashed avocado', 2, 5, 5, ARRAY['breakfast','vegetarian','quick']);

    -- ============================================================
    -- INGREDIENTS for Recipe 1: Spaghetti Bolognese
    -- ============================================================
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Ground beef', 1.0, 'lbs', '0021000613205' FROM recipes WHERE name = 'Spaghetti Bolognese';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Spaghetti pasta', 12.0, 'oz', NULL FROM recipes WHERE name = 'Spaghetti Bolognese';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Tomato sauce', 24.0, 'oz', '0001111042513' FROM recipes WHERE name = 'Spaghetti Bolognese';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Onion', 1.0, 'pcs', NULL FROM recipes WHERE name = 'Spaghetti Bolognese';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Garlic', 3.0, 'cloves', NULL FROM recipes WHERE name = 'Spaghetti Bolognese';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Olive oil', 2.0, 'tbsp', NULL FROM recipes WHERE name = 'Spaghetti Bolognese';

    -- Chicken Stir Fry
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Chicken breast', 1.5, 'lbs', '0021000013204' FROM recipes WHERE name = 'Chicken Stir Fry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Broccoli', 2.0, 'cups', NULL FROM recipes WHERE name = 'Chicken Stir Fry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Bell pepper', 2.0, 'pcs', NULL FROM recipes WHERE name = 'Chicken Stir Fry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Soy sauce', 3.0, 'tbsp', NULL FROM recipes WHERE name = 'Chicken Stir Fry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Garlic', 2.0, 'cloves', NULL FROM recipes WHERE name = 'Chicken Stir Fry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Sesame oil', 1.0, 'tbsp', NULL FROM recipes WHERE name = 'Chicken Stir Fry';

    -- Beef Tacos
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Ground beef', 1.0, 'lbs', '0021000613205' FROM recipes WHERE name = 'Beef Tacos';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Taco shells', 12.0, 'pcs', NULL FROM recipes WHERE name = 'Beef Tacos';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Shredded cheese', 1.0, 'cups', NULL FROM recipes WHERE name = 'Beef Tacos';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Salsa', 1.0, 'cups', NULL FROM recipes WHERE name = 'Beef Tacos';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Taco seasoning', 1.0, 'packet', NULL FROM recipes WHERE name = 'Beef Tacos';

    -- Baked Salmon
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Salmon fillets', 1.5, 'lbs', NULL FROM recipes WHERE name = 'Baked Salmon';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Lemon', 2.0, 'pcs', NULL FROM recipes WHERE name = 'Baked Salmon';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Garlic', 3.0, 'cloves', NULL FROM recipes WHERE name = 'Baked Salmon';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Olive oil', 2.0, 'tbsp', NULL FROM recipes WHERE name = 'Baked Salmon';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Fresh dill', 2.0, 'tbsp', NULL FROM recipes WHERE name = 'Baked Salmon';

    -- Chicken Tikka Masala
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Chicken breast', 2.0, 'lbs', '0021000013204' FROM recipes WHERE name = 'Chicken Tikka Masala';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Heavy cream', 1.0, 'cups', NULL FROM recipes WHERE name = 'Chicken Tikka Masala';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Tomato sauce', 14.0, 'oz', '0001111042513' FROM recipes WHERE name = 'Chicken Tikka Masala';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Garam masala', 2.0, 'tbsp', NULL FROM recipes WHERE name = 'Chicken Tikka Masala';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Garlic', 4.0, 'cloves', NULL FROM recipes WHERE name = 'Chicken Tikka Masala';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Onion', 1.0, 'pcs', NULL FROM recipes WHERE name = 'Chicken Tikka Masala';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Greek yogurt', 0.5, 'cups', NULL FROM recipes WHERE name = 'Chicken Tikka Masala';

    -- Vegetable Stir Fry
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Broccoli', 2.0, 'cups', NULL FROM recipes WHERE name = 'Vegetable Stir Fry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Bell pepper', 2.0, 'pcs', NULL FROM recipes WHERE name = 'Vegetable Stir Fry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Snap peas', 1.0, 'cups', NULL FROM recipes WHERE name = 'Vegetable Stir Fry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Soy sauce', 3.0, 'tbsp', NULL FROM recipes WHERE name = 'Vegetable Stir Fry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Garlic', 2.0, 'cloves', NULL FROM recipes WHERE name = 'Vegetable Stir Fry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Sesame oil', 1.0, 'tbsp', NULL FROM recipes WHERE name = 'Vegetable Stir Fry';

    -- Beef Burgers
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Ground beef', 1.5, 'lbs', '0021000613205' FROM recipes WHERE name = 'Beef Burgers';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Burger buns', 4.0, 'pcs', NULL FROM recipes WHERE name = 'Beef Burgers';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Cheddar cheese', 4.0, 'slices', NULL FROM recipes WHERE name = 'Beef Burgers';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Lettuce', 0.5, 'head', NULL FROM recipes WHERE name = 'Beef Burgers';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Tomato', 1.0, 'pcs', NULL FROM recipes WHERE name = 'Beef Burgers';

    -- Lemon Herb Chicken
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Chicken thighs', 2.0, 'lbs', NULL FROM recipes WHERE name = 'Lemon Herb Chicken';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Lemon', 2.0, 'pcs', NULL FROM recipes WHERE name = 'Lemon Herb Chicken';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Garlic', 4.0, 'cloves', NULL FROM recipes WHERE name = 'Lemon Herb Chicken';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Olive oil', 3.0, 'tbsp', NULL FROM recipes WHERE name = 'Lemon Herb Chicken';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Fresh rosemary', 2.0, 'sprigs', NULL FROM recipes WHERE name = 'Lemon Herb Chicken';

    -- Shrimp Pasta
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Large shrimp', 1.0, 'lbs', NULL FROM recipes WHERE name = 'Shrimp Pasta';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Linguine pasta', 12.0, 'oz', NULL FROM recipes WHERE name = 'Shrimp Pasta';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Butter', 4.0, 'tbsp', NULL FROM recipes WHERE name = 'Shrimp Pasta';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Garlic', 4.0, 'cloves', NULL FROM recipes WHERE name = 'Shrimp Pasta';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Lemon', 1.0, 'pcs', NULL FROM recipes WHERE name = 'Shrimp Pasta';

    -- Mushroom Risotto
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Arborio rice', 1.5, 'cups', NULL FROM recipes WHERE name = 'Mushroom Risotto';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Mushrooms', 8.0, 'oz', NULL FROM recipes WHERE name = 'Mushroom Risotto';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Chicken broth', 4.0, 'cups', NULL FROM recipes WHERE name = 'Mushroom Risotto';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Parmesan cheese', 0.5, 'cups', NULL FROM recipes WHERE name = 'Mushroom Risotto';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Butter', 3.0, 'tbsp', NULL FROM recipes WHERE name = 'Mushroom Risotto';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Onion', 1.0, 'pcs', NULL FROM recipes WHERE name = 'Mushroom Risotto';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'White wine', 0.5, 'cups', NULL FROM recipes WHERE name = 'Mushroom Risotto';

    -- Pulled Pork Sandwiches
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Pork shoulder', 4.0, 'lbs', NULL FROM recipes WHERE name = 'Pulled Pork Sandwiches';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'BBQ sauce', 2.0, 'cups', NULL FROM recipes WHERE name = 'Pulled Pork Sandwiches';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Burger buns', 6.0, 'pcs', NULL FROM recipes WHERE name = 'Pulled Pork Sandwiches';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Coleslaw mix', 1.0, 'bag', NULL FROM recipes WHERE name = 'Pulled Pork Sandwiches';

    -- Thai Green Curry
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Coconut milk', 14.0, 'oz', NULL FROM recipes WHERE name = 'Thai Green Curry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Green curry paste', 2.0, 'tbsp', NULL FROM recipes WHERE name = 'Thai Green Curry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Broccoli', 2.0, 'cups', NULL FROM recipes WHERE name = 'Thai Green Curry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Bell pepper', 1.0, 'pcs', NULL FROM recipes WHERE name = 'Thai Green Curry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Snap peas', 1.0, 'cups', NULL FROM recipes WHERE name = 'Thai Green Curry';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Jasmine rice', 2.0, 'cups', NULL FROM recipes WHERE name = 'Thai Green Curry';

    -- Chicken Fajitas
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Chicken breast', 1.5, 'lbs', '0021000013204' FROM recipes WHERE name = 'Chicken Fajitas';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Bell pepper', 3.0, 'pcs', NULL FROM recipes WHERE name = 'Chicken Fajitas';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Onion', 1.0, 'pcs', NULL FROM recipes WHERE name = 'Chicken Fajitas';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Flour tortillas', 8.0, 'pcs', NULL FROM recipes WHERE name = 'Chicken Fajitas';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Fajita seasoning', 2.0, 'tbsp', NULL FROM recipes WHERE name = 'Chicken Fajitas';

    -- Caesar Salad with Chicken
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Chicken breast', 0.5, 'lbs', '0021000013204' FROM recipes WHERE name = 'Caesar Salad with Chicken';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Romaine lettuce', 1.0, 'head', NULL FROM recipes WHERE name = 'Caesar Salad with Chicken';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Caesar dressing', 0.25, 'cups', NULL FROM recipes WHERE name = 'Caesar Salad with Chicken';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Croutons', 1.0, 'cups', NULL FROM recipes WHERE name = 'Caesar Salad with Chicken';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Parmesan cheese', 0.25, 'cups', NULL FROM recipes WHERE name = 'Caesar Salad with Chicken';

    -- Turkey Club Sandwich
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Sliced turkey', 0.5, 'lbs', NULL FROM recipes WHERE name = 'Turkey Club Sandwich';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Bacon', 6.0, 'strips', NULL FROM recipes WHERE name = 'Turkey Club Sandwich';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Sandwich bread', 6.0, 'slices', NULL FROM recipes WHERE name = 'Turkey Club Sandwich';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Lettuce', 0.25, 'head', NULL FROM recipes WHERE name = 'Turkey Club Sandwich';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Tomato', 1.0, 'pcs', NULL FROM recipes WHERE name = 'Turkey Club Sandwich';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Mayonnaise', 2.0, 'tbsp', NULL FROM recipes WHERE name = 'Turkey Club Sandwich';

    -- Tomato Basil Soup
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Crushed tomatoes', 28.0, 'oz', NULL FROM recipes WHERE name = 'Tomato Basil Soup';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Heavy cream', 0.5, 'cups', NULL FROM recipes WHERE name = 'Tomato Basil Soup';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Fresh basil', 0.25, 'cups', NULL FROM recipes WHERE name = 'Tomato Basil Soup';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Onion', 1.0, 'pcs', NULL FROM recipes WHERE name = 'Tomato Basil Soup';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Garlic', 3.0, 'cloves', NULL FROM recipes WHERE name = 'Tomato Basil Soup';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Chicken broth', 2.0, 'cups', NULL FROM recipes WHERE name = 'Tomato Basil Soup';

    -- Chicken Quesadillas
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Chicken breast', 1.0, 'lbs', '0021000013204' FROM recipes WHERE name = 'Chicken Quesadillas';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Flour tortillas', 8.0, 'pcs', NULL FROM recipes WHERE name = 'Chicken Quesadillas';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Shredded cheese', 2.0, 'cups', NULL FROM recipes WHERE name = 'Chicken Quesadillas';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Salsa', 0.5, 'cups', NULL FROM recipes WHERE name = 'Chicken Quesadillas';

    -- Pancakes
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'All-purpose flour', 2.0, 'cups', NULL FROM recipes WHERE name = 'Pancakes';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Milk', 1.5, 'cups', NULL FROM recipes WHERE name = 'Pancakes';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Eggs', 2.0, 'pcs', NULL FROM recipes WHERE name = 'Pancakes';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Butter', 2.0, 'tbsp', NULL FROM recipes WHERE name = 'Pancakes';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Maple syrup', 0.25, 'cups', NULL FROM recipes WHERE name = 'Pancakes';

    -- Veggie Omelette
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Eggs', 3.0, 'pcs', NULL FROM recipes WHERE name = 'Veggie Omelette';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Bell pepper', 0.5, 'pcs', NULL FROM recipes WHERE name = 'Veggie Omelette';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Mushrooms', 4.0, 'oz', NULL FROM recipes WHERE name = 'Veggie Omelette';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Cheddar cheese', 2.0, 'oz', NULL FROM recipes WHERE name = 'Veggie Omelette';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Butter', 1.0, 'tbsp', NULL FROM recipes WHERE name = 'Veggie Omelette';

    -- Avocado Toast
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Sourdough bread', 2.0, 'slices', NULL FROM recipes WHERE name = 'Avocado Toast';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Avocado', 1.0, 'pcs', NULL FROM recipes WHERE name = 'Avocado Toast';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Lemon', 0.5, 'pcs', NULL FROM recipes WHERE name = 'Avocado Toast';
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc)
    SELECT id, 'Red pepper flakes', 0.25, 'tsp', NULL FROM recipes WHERE name = 'Avocado Toast';

  END IF;
END $$;
