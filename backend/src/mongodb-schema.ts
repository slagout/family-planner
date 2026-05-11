/**
 * MongoDB Collection Schemas and Index Definitions
 * 
 * This module defines the structure and indexes for all MongoDB collections
 * used in the Family Planner application. Schemas are defined using TypeScript
 * interfaces for type safety, with corresponding MongoDB index configurations.
 */

// ============================================================================
// COLLECTION: users
// ============================================================================
export interface MongoUser {
  _id: string; // UUID
  email: string;
  passwordHash: string;
  displayName?: string;
  keycloakId?: string; // Keycloak user ID for SSO
  krogerToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// COLLECTION: children
// ============================================================================
export interface Child {
  _id: string; // UUID
  userId: string; // Parent user ID
  name: string;
  dateOfBirth: Date;
  allergies: string[];
  dietaryRestrictions: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// COLLECTION: recipes
// ============================================================================
export interface Recipe {
  _id: string; // UUID or numeric ID
  name: string;
  description?: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  tags: string[];
  ingredients: RecipeIngredient[];
  createdBy?: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit?: string;
  krogerUpc?: string; // Kroger Universal Product Code
}

// ============================================================================
// COLLECTION: pantry_items
// ============================================================================
export interface PantryItem {
  _id: string; // UUID
  userId: string;
  name: string;
  quantity: number;
  unit?: string;
  expiresAt?: Date; // Optional: expiration date for perishables
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// COLLECTION: weekly_menus
// ============================================================================
export interface WeeklyMenu {
  _id: string; // UUID
  userId: string;
  weekNumber: number;
  year: number;
  meals: MealEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MealEntry {
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  recipeId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings?: number;
}

// ============================================================================
// COLLECTION: chores
// ============================================================================
export interface Chore {
  _id: string; // UUID
  userId: string; // Parent who created it
  childId?: string; // Assigned to this child
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  rewardPoints?: number;
  dueDate?: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// COLLECTION: transactions (IMMUTABLE)
// ============================================================================
export interface Transaction {
  _id: string; // UUID
  userId: string;
  childId?: string;
  type: 'reward' | 'spending' | 'adjustment';
  amount: number;
  description: string;
  choreId?: string; // If tied to a chore completion
  createdAt: Date;
  // Note: No updatedAt - this collection is immutable
}

// ============================================================================
// COLLECTION: audit_logs (IMMUTABLE, Write-Once)
// ============================================================================
export interface AuditLog {
  _id: string; // UUID
  collectionName: string; // Name of affected collection
  operationType: 'create' | 'update' | 'delete';
  userId: string; // Who made the change
  documentId: string; // ID of affected document
  beforeValues?: Record<string, any>; // For updates/deletes
  afterValues?: Record<string, any>; // For creates/updates
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  // Note: No updatedAt - this collection is immutable
}

// ============================================================================
// MongoDB Index Configurations
// ============================================================================

export const mongoDBIndexes = {
  users: [
    { key: { email: 1 }, unique: true },
    { key: { keycloakId: 1 }, sparse: true },
    { key: { createdAt: -1 } },
  ],

  children: [
    { key: { userId: 1 }, },
    { key: { userId: 1, createdAt: -1 } },
  ],

  recipes: [
    { key: { name: 'text', description: 'text' }, weights: { name: 10, description: 5 } },
    { key: { tags: 1 } },
    { key: { createdBy: 1, createdAt: -1 } },
    { key: { createdAt: -1 } },
  ],

  pantry_items: [
    { key: { userId: 1 }, },
    { key: { userId: 1, name: 1 }, unique: true },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, sparse: true }, // TTL for expired items
    { key: { updatedAt: -1 } },
  ],

  weekly_menus: [
    { key: { userId: 1 } },
    { key: { userId: 1, weekNumber: 1, year: 1 }, unique: true },
    { key: { userId: 1, createdAt: -1 } },
  ],

  chores: [
    { key: { userId: 1 } },
    { key: { childId: 1 } },
    { key: { userId: 1, status: 1 } },
    { key: { dueDate: 1 }, sparse: true },
    { key: { status: 1, completedAt: -1 } },
  ],

  transactions: [
    { key: { userId: 1 } },
    { key: { userId: 1, createdAt: -1 } },
    { key: { childId: 1, createdAt: -1 } },
    { key: { type: 1, createdAt: -1 } },
  ],

  audit_logs: [
    { key: { collectionName: 1, timestamp: -1 } },
    { key: { userId: 1, timestamp: -1 } },
    { key: { documentId: 1, timestamp: -1 } },
    { key: { timestamp: 1 }, expireAfterSeconds: 2592000 }, // TTL: 30 days
  ],
};

// ============================================================================
// IndexedDB Schema (for offline/frontend sync)
// ============================================================================

export interface IndexedDBSchema {
  users: MongoUser[];
  recipes: Recipe[];
  pantry_items: PantryItem[];
  weekly_menus: WeeklyMenu[];
  children: Child[];
  sync_queue: SyncQueueItem[];
}

export interface SyncQueueItem {
  _id: string;
  collectionName: string;
  operationType: 'create' | 'update' | 'delete';
  documentId: string;
  payload: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
}

// ============================================================================
// Data Transformation Mappings (PostgreSQL → MongoDB)
// ============================================================================

export const postgresMongoMapping = {
  users: {
    postgresql: {
      table: 'users',
      fields: ['id', 'email', 'password_hash', 'display_name', 'kroger_token', 'created_at'],
    },
    mongodb: {
      collection: 'users',
      fields: ['_id', 'email', 'passwordHash', 'displayName', 'krogerToken', 'createdAt', 'updatedAt'],
    },
    mapping: {
      id: '_id',
      email: 'email',
      password_hash: 'passwordHash',
      display_name: 'displayName',
      kroger_token: 'krogerToken',
      created_at: 'createdAt',
    },
  },

  recipes: {
    postgresql: {
      table: 'recipes',
      fields: ['id', 'name', 'description', 'servings', 'prep_minutes', 'cook_minutes', 'tags', 'created_by', 'created_at'],
    },
    mongodb: {
      collection: 'recipes',
      fields: ['_id', 'name', 'description', 'servings', 'prepMinutes', 'cookMinutes', 'tags', 'ingredients', 'createdBy', 'createdAt', 'updatedAt'],
    },
    mapping: {
      id: '_id',
      name: 'name',
      description: 'description',
      servings: 'servings',
      prep_minutes: 'prepMinutes',
      cook_minutes: 'cookMinutes',
      tags: 'tags',
      created_by: 'createdBy',
      created_at: 'createdAt',
    },
  },

  recipe_ingredients: {
    postgresql: {
      table: 'recipe_ingredients',
      fields: ['recipe_id', 'name', 'quantity', 'unit', 'kroger_upc'],
    },
    mongodb: {
      collection: 'recipes',
      nested: 'ingredients',
      fields: ['name', 'quantity', 'unit', 'krogerUpc'],
    },
    mapping: {
      name: 'name',
      quantity: 'quantity',
      unit: 'unit',
      kroger_upc: 'krogerUpc',
    },
  },

  pantry_items: {
    postgresql: {
      table: 'pantry_items',
      fields: ['id', 'user_id', 'name', 'quantity', 'unit', 'updated_at'],
    },
    mongodb: {
      collection: 'pantry_items',
      fields: ['_id', 'userId', 'name', 'quantity', 'unit', 'updatedAt'],
    },
    mapping: {
      id: '_id',
      user_id: 'userId',
      name: 'name',
      quantity: 'quantity',
      unit: 'unit',
      updated_at: 'updatedAt',
    },
  },

  weekly_menu: {
    postgresql: {
      table: 'weekly_menu',
      fields: ['id', 'user_id', 'week_number', 'year', 'created_at'],
    },
    mongodb: {
      collection: 'weekly_menus',
      fields: ['_id', 'userId', 'weekNumber', 'year', 'meals', 'createdAt', 'updatedAt'],
    },
    mapping: {
      id: '_id',
      user_id: 'userId',
      week_number: 'weekNumber',
      year: 'year',
      created_at: 'createdAt',
    },
  },

  menu_item: {
    postgresql: {
      table: 'menu_item',
      fields: ['weekly_menu_id', 'recipe_id', 'day_of_week'],
    },
    mongodb: {
      collection: 'weekly_menus',
      nested: 'meals',
      fields: ['dayOfWeek', 'recipeId', 'mealType'],
    },
    mapping: {
      day_of_week: 'dayOfWeek',
      recipe_id: 'recipeId',
    },
  },
};
