export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
}

export interface AuthPayload {
  userId: string;
  /** Alias for userId — populated by all auth middleware for cross-compatibility */
  id: string;
  email: string;
  displayName?: string | null;
  roles: string[];
  keycloakSubject?: string;
}

export interface Recipe {
  id: number;
  name: string;
  description?: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  tags: string[];
  createdBy?: string;
  createdAt: string;
}

export interface RecipeIngredient {
  id: number;
  recipeId: number;
  name: string;
  quantity: number;
  unit?: string;
  krogerUpc?: string;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

export interface PantryItem {
  id: number;
  userId: string;
  name: string;
  quantity: number;
  unit?: string;
  updatedAt: string;
}

export interface WeeklyMenu {
  id: number;
  userId: string;
  weekNumber: number;
  year: number;
  createdAt: string;
}

export interface MenuItem {
  id: number;
  weeklyMenuId: number;
  recipeId: number;
  dayOfWeek: string;
}

export interface MissingIngredient {
  name: string;
  quantity: number;
  unit?: string;
  krogerUpc?: string;
}

export interface MealPlanDay {
  day: string;
  recipe: Pick<Recipe, 'id' | 'name' | 'description' | 'prepMinutes' | 'cookMinutes' | 'tags'>;
}

export interface MealPlanResponse {
  menu: {
    id: number;
    weekNumber: number;
    year: number;
    days: MealPlanDay[];
  };
  missingIngredients: MissingIngredient[];
  krogerCartId?: string;
  krogerUnmatchedItems?: string[];
  krogerMessage?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
