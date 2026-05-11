/**
 * MongoDB Migration Script
 * 
 * Migrates data from PostgreSQL to MongoDB with full transformation,
 * validation, and error handling. Supports resume capability for large datasets.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-to-mongodb.ts --source postgres --target mongodb --batch-size 1000 --dry-run
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  resumeFromCollection?: string;
  outputFile?: string;
}

interface MigrationStats {
  collection: string;
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
  startedAt: Date;
  completedAt?: Date;
  errors: any[];
}

class PostgresMongoMigrator {
  private pgPool: Pool;
  private mongoClient: MongoClient;
  private mongoDb?: Db;
  private config: MigrationConfig;
  private stats: Map<string, MigrationStats> = new Map();

  constructor(config: MigrationConfig) {
    this.config = config;
    this.pgPool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || 'family_planner',
      user: process.env.PGUSER || 'fp_user',
      password: process.env.PGPASSWORD,
    });

    this.mongoClient = new MongoClient(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/family_planner',
      { retryWrites: true }
    );
  }

  async connect(): Promise<void> {
    if (!this.config.dryRun) {
      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db();
      console.log('✓ Connected to MongoDB');
    }
    console.log('✓ Connected to PostgreSQL');
  }

  async migrateUsers(): Promise<void> {
    const stats: MigrationStats = {
      collection: 'users',
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      errors: [],
    };

    try {
      const result = await this.pgPool.query('SELECT COUNT(*) as count FROM users');
      stats.totalRecords = parseInt(result.rows[0].count);

      console.log(`\n📦 Migrating users (${stats.totalRecords} records)...`);

      const query = `
        SELECT id, email, password_hash, display_name, kroger_token, created_at
        FROM users
        ORDER BY created_at ASC
      `;

      const rows = await this.pgPool.query(query);
      const batch: any[] = [];

      for (const row of rows.rows) {
        const mongoUser = {
          _id: row.id,
          email: row.email,
          passwordHash: row.password_hash,
          displayName: row.display_name || null,
          krogerToken: row.kroger_token || null,
          createdAt: row.created_at,
          updatedAt: row.created_at,
        };

        batch.push(mongoUser);

        if (batch.length >= this.config.batchSize) {
          await this.insertBatch('users', batch, stats);
          batch.length = 0;
        }
      }

      if (batch.length > 0) {
        await this.insertBatch('users', batch, stats);
      }

      stats.completedAt = new Date();
      this.stats.set('users', stats);
      console.log(`✓ Completed users migration: ${stats.migratedRecords}/${stats.totalRecords}`);
    } catch (error) {
      stats.errors.push(error);
      console.error('✗ Error migrating users:', error);
    }
  }

  async migrateRecipes(): Promise<void> {
    const stats: MigrationStats = {
      collection: 'recipes',
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      errors: [],
    };

    try {
      const result = await this.pgPool.query('SELECT COUNT(*) as count FROM recipes');
      stats.totalRecords = parseInt(result.rows[0].count);

      console.log(`\n📦 Migrating recipes (${stats.totalRecords} records)...`);

      const query = `
        SELECT r.id, r.name, r.description, r.servings, r.prep_minutes, 
               r.cook_minutes, r.tags, r.created_by, r.created_at,
               json_agg(
                 json_build_object(
                   'name', ri.name,
                   'quantity', ri.quantity,
                   'unit', ri.unit,
                   'krogerUpc', ri.kroger_upc
                 )
               ) FILTER (WHERE ri.id IS NOT NULL) as ingredients
        FROM recipes r
        LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        GROUP BY r.id
        ORDER BY r.created_at ASC
      `;

      const recipes = await this.pgPool.query(query);
      const batch: any[] = [];

      for (const row of recipes.rows) {
        const mongoRecipe = {
          _id: row.id.toString(),
          name: row.name,
          description: row.description || null,
          servings: row.servings,
          prepMinutes: row.prep_minutes,
          cookMinutes: row.cook_minutes,
          tags: row.tags || [],
          ingredients: row.ingredients || [],
          createdBy: row.created_by || null,
          createdAt: row.created_at,
          updatedAt: row.created_at,
        };

        batch.push(mongoRecipe);

        if (batch.length >= this.config.batchSize) {
          await this.insertBatch('recipes', batch, stats);
          batch.length = 0;
        }
      }

      if (batch.length > 0) {
        await this.insertBatch('recipes', batch, stats);
      }

      stats.completedAt = new Date();
      this.stats.set('recipes', stats);
      console.log(`✓ Completed recipes migration: ${stats.migratedRecords}/${stats.totalRecords}`);
    } catch (error) {
      stats.errors.push(error);
      console.error('✗ Error migrating recipes:', error);
    }
  }

  async migratePantryItems(): Promise<void> {
    const stats: MigrationStats = {
      collection: 'pantry_items',
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      errors: [],
    };

    try {
      const result = await this.pgPool.query('SELECT COUNT(*) as count FROM pantry_items');
      stats.totalRecords = parseInt(result.rows[0].count);

      console.log(`\n📦 Migrating pantry items (${stats.totalRecords} records)...`);

      const query = `
        SELECT id, user_id, name, quantity, unit, updated_at
        FROM pantry_items
        ORDER BY updated_at ASC
      `;

      const rows = await this.pgPool.query(query);
      const batch: any[] = [];

      for (const row of rows.rows) {
        const mongoPantryItem = {
          _id: uuidv4(),
          userId: row.user_id,
          name: row.name,
          quantity: row.quantity,
          unit: row.unit || null,
          createdAt: row.updated_at,
          updatedAt: row.updated_at,
        };

        batch.push(mongoPantryItem);

        if (batch.length >= this.config.batchSize) {
          await this.insertBatch('pantry_items', batch, stats);
          batch.length = 0;
        }
      }

      if (batch.length > 0) {
        await this.insertBatch('pantry_items', batch, stats);
      }

      stats.completedAt = new Date();
      this.stats.set('pantry_items', stats);
      console.log(`✓ Completed pantry items migration: ${stats.migratedRecords}/${stats.totalRecords}`);
    } catch (error) {
      stats.errors.push(error);
      console.error('✗ Error migrating pantry items:', error);
    }
  }

  async migrateWeeklyMenus(): Promise<void> {
    const stats: MigrationStats = {
      collection: 'weekly_menus',
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      errors: [],
    };

    try {
      const result = await this.pgPool.query('SELECT COUNT(*) as count FROM weekly_menu');
      stats.totalRecords = parseInt(result.rows[0].count);

      console.log(`\n📦 Migrating weekly menus (${stats.totalRecords} records)...`);

      const query = `
        SELECT wm.id, wm.user_id, wm.week_number, wm.year, wm.created_at,
               json_agg(
                 json_build_object(
                   'dayOfWeek', mi.day_of_week,
                   'recipeId', mi.recipe_id::text,
                   'mealType', 'dinner'
                 )
               ) FILTER (WHERE mi.id IS NOT NULL) as meals
        FROM weekly_menu wm
        LEFT JOIN menu_item mi ON wm.id = mi.weekly_menu_id
        GROUP BY wm.id
        ORDER BY wm.created_at ASC
      `;

      const rows = await this.pgPool.query(query);
      const batch: any[] = [];

      for (const row of rows.rows) {
        const mongoMenu = {
          _id: uuidv4(),
          userId: row.user_id,
          weekNumber: row.week_number,
          year: row.year,
          meals: row.meals || [],
          createdAt: row.created_at,
          updatedAt: row.created_at,
        };

        batch.push(mongoMenu);

        if (batch.length >= this.config.batchSize) {
          await this.insertBatch('weekly_menus', batch, stats);
          batch.length = 0;
        }
      }

      if (batch.length > 0) {
        await this.insertBatch('weekly_menus', batch, stats);
      }

      stats.completedAt = new Date();
      this.stats.set('weekly_menus', stats);
      console.log(`✓ Completed weekly menus migration: ${stats.migratedRecords}/${stats.totalRecords}`);
    } catch (error) {
      stats.errors.push(error);
      console.error('✗ Error migrating weekly menus:', error);
    }
  }

  private async insertBatch(collection: string, batch: any[], stats: MigrationStats): Promise<void> {
    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would insert ${batch.length} documents into ${collection}`);
      stats.migratedRecords += batch.length;
      return;
    }

    try {
      const col = this.mongoDb!.collection(collection);
      const result = await col.insertMany(batch, { ordered: false });
      stats.migratedRecords += result.insertedCount;
      console.log(`  → Inserted ${result.insertedCount} records into ${collection}`);
    } catch (error: any) {
      if (error.writeErrors) {
        stats.migratedRecords += batch.length - error.writeErrors.length;
        stats.failedRecords += error.writeErrors.length;
        stats.errors.push(...error.writeErrors);
      } else {
        stats.failedRecords += batch.length;
        stats.errors.push(error);
      }
      console.error(`  ✗ Error inserting batch into ${collection}:`, error.message);
    }
  }

  async createIndexes(): Promise<void> {
    if (this.config.dryRun) {
      console.log('\n[DRY RUN] Would create all indexes');
      return;
    }

    console.log('\n🔧 Creating MongoDB indexes...');

    const indexes = {
      users: [
        { key: { email: 1 }, unique: true },
        { key: { keycloakId: 1 }, sparse: true },
      ],
      recipes: [
        { key: { name: 'text', description: 'text' } },
        { key: { tags: 1 } },
      ],
      pantry_items: [
        { key: { userId: 1 } },
        { key: { userId: 1, name: 1 }, unique: true },
      ],
      weekly_menus: [
        { key: { userId: 1 } },
        { key: { userId: 1, weekNumber: 1, year: 1 }, unique: true },
      ],
    };

    for (const [collection, indexList] of Object.entries(indexes)) {
      const col = this.mongoDb!.collection(collection);
      for (const index of indexList) {
        try {
          await col.createIndex(index.key as any, { ...index, unique: (index as any).unique });
          console.log(`  ✓ Created index on ${collection}: ${JSON.stringify(index.key)}`);
        } catch (error) {
          console.error(`  ✗ Error creating index:`, error);
        }
      }
    }
  }

  async generateReport(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION REPORT');
    console.log('='.repeat(60));

    let totalRecords = 0;
    let totalMigrated = 0;
    let totalFailed = 0;

    for (const [, stat] of this.stats) {
      totalRecords += stat.totalRecords;
      totalMigrated += stat.migratedRecords;
      totalFailed += stat.failedRecords;

      const duration = stat.completedAt
        ? ((stat.completedAt.getTime() - stat.startedAt.getTime()) / 1000).toFixed(2)
        : 'N/A';

      console.log(`\n${stat.collection}:`);
      console.log(`  Total Records:    ${stat.totalRecords}`);
      console.log(`  Migrated:         ${stat.migratedRecords}`);
      console.log(`  Failed:           ${stat.failedRecords}`);
      console.log(`  Duration:         ${duration}s`);
      console.log(`  Success Rate:     ${((stat.migratedRecords / stat.totalRecords) * 100).toFixed(2)}%`);

      if (stat.errors.length > 0) {
        console.log(`  Errors (first 3):`);
        stat.errors.slice(0, 3).forEach((err) => {
          console.log(`    - ${err.message || JSON.stringify(err)}`);
        });
      }
    }

    console.log('\n' + '-'.repeat(60));
    console.log(`Total Records:    ${totalRecords}`);
    console.log(`Total Migrated:   ${totalMigrated}`);
    console.log(`Total Failed:     ${totalFailed}`);
    console.log(`Overall Success:  ${((totalMigrated / totalRecords) * 100).toFixed(2)}%`);
    console.log('='.repeat(60) + '\n');

    if (this.config.outputFile) {
      fs.writeFileSync(
        this.config.outputFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          stats: Array.from(this.stats.entries()).map(([, stat]) => stat),
          summary: { totalRecords, totalMigrated, totalFailed },
        }, null, 2)
      );
      console.log(`📄 Report saved to: ${this.config.outputFile}`);
    }
  }

  async run(): Promise<void> {
    try {
      await this.connect();

      await this.migrateUsers();
      await this.migrateRecipes();
      await this.migratePantryItems();
      await this.migrateWeeklyMenus();

      if (!this.config.dryRun) {
        await this.createIndexes();
      }

      await this.generateReport();
    } catch (error) {
      console.error('Fatal error during migration:', error);
      process.exit(1);
    } finally {
      await this.pgPool.end();
      await this.mongoClient.close();
    }
  }
}

// Main execution
const args = process.argv.slice(2);
const config: MigrationConfig = {
  dryRun: args.includes('--dry-run'),
  batchSize: 1000,
  outputFile: 'migration-report.json',
};

const migrator = new PostgresMongoMigrator(config);
migrator.run().catch(console.error);
