/**
 * MongoDB Migration Verification Script
 * 
 * Validates data integrity after migration from PostgreSQL to MongoDB.
 * Checks: record counts, referential integrity, data transformations, indexes.
 * 
 * Usage:
 *   npx ts-node scripts/verify-migration.ts --compare-mode --output report.json
 */

import { MongoClient, Db } from 'mongodb';
import { Pool } from 'pg';

interface VerificationResult {
  collection: string;
  checks: CheckResult[];
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  timestamp: Date;
}

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  expected: any;
  actual: any;
  message: string;
}

class MigrationVerifier {
  private pgPool: Pool;
  private mongoClient: MongoClient;
  private mongoDb?: Db;
  private results: VerificationResult[] = [];

  constructor() {
    this.pgPool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || 'family_planner',
      user: process.env.PGUSER || 'fp_user',
      password: process.env.PGPASSWORD,
    });

    this.mongoClient = new MongoClient(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/family_planner'
    );
  }

  async connect(): Promise<void> {
    await this.mongoClient.connect();
    this.mongoDb = this.mongoClient.db();
    console.log('✓ Connected to MongoDB and PostgreSQL');
  }

  async verifyUsers(): Promise<void> {
    console.log('\n🔍 Verifying users collection...');
    const result: VerificationResult = {
      collection: 'users',
      checks: [],
      overallStatus: 'PASS',
      timestamp: new Date(),
    };

    try {
      // Check 1: Record count matches
      const pgCount = await this.pgPool.query('SELECT COUNT(*) FROM users');
      const mongoCount = await this.mongoDb!.collection('users').countDocuments();

      const countCheck: CheckResult = {
        name: 'Record Count Match',
        status: pgCount.rows[0].count === mongoCount ? 'PASS' : 'FAIL',
        expected: pgCount.rows[0].count,
        actual: mongoCount,
        message: `PostgreSQL has ${pgCount.rows[0].count} users, MongoDB has ${mongoCount}`,
      };
      result.checks.push(countCheck);

      // Check 2: Email uniqueness
      const mongoEmails = await this.mongoDb!
        .collection('users')
        .aggregate([{ $group: { _id: '$email', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }])
        .toArray();

      const uniqueCheck: CheckResult = {
        name: 'Email Uniqueness',
        status: mongoEmails.length === 0 ? 'PASS' : 'FAIL',
        expected: 0,
        actual: mongoEmails.length,
        message: `Found ${mongoEmails.length} duplicate email entries`,
      };
      result.checks.push(uniqueCheck);

      // Check 3: Required fields present
      const usersWithMissingFields = await this.mongoDb!
        .collection('users')
        .find({ $or: [{ email: { $exists: false } }, { passwordHash: { $exists: false } }] })
        .count();

      const fieldsCheck: CheckResult = {
        name: 'Required Fields Present',
        status: usersWithMissingFields === 0 ? 'PASS' : 'FAIL',
        expected: 0,
        actual: usersWithMissingFields,
        message: `Found ${usersWithMissingFields} users with missing required fields`,
      };
      result.checks.push(fieldsCheck);

      // Check 4: Timestamp integrity
      const invalidTimestamps = await this.mongoDb!
        .collection('users')
        .find({ $or: [{ createdAt: { $exists: false } }, { updatedAt: { $exists: false } }] })
        .count();

      const timestampCheck: CheckResult = {
        name: 'Timestamp Fields',
        status: invalidTimestamps === 0 ? 'PASS' : 'FAIL',
        expected: 0,
        actual: invalidTimestamps,
        message: `Found ${invalidTimestamps} users with missing timestamps`,
      };
      result.checks.push(timestampCheck);
    } catch (error) {
      result.overallStatus = 'FAIL';
      console.error('Error verifying users:', error);
    }

    result.overallStatus = result.checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL';
    this.results.push(result);
  }

  async verifyRecipes(): Promise<void> {
    console.log('\n🔍 Verifying recipes collection...');
    const result: VerificationResult = {
      collection: 'recipes',
      checks: [],
      overallStatus: 'PASS',
      timestamp: new Date(),
    };

    try {
      // Check 1: Record count
      const pgCount = await this.pgPool.query('SELECT COUNT(*) FROM recipes');
      const mongoCount = await this.mongoDb!.collection('recipes').countDocuments();

      const countCheck: CheckResult = {
        name: 'Record Count Match',
        status: pgCount.rows[0].count === mongoCount ? 'PASS' : 'FAIL',
        expected: pgCount.rows[0].count,
        actual: mongoCount,
        message: `PostgreSQL has ${pgCount.rows[0].count} recipes, MongoDB has ${mongoCount}`,
      };
      result.checks.push(countCheck);

      // Check 2: Ingredients nested correctly
      const recipesWithoutIngredients = await this.mongoDb!
        .collection('recipes')
        .find({ ingredients: { $exists: false } })
        .count();

      const ingredientsCheck: CheckResult = {
        name: 'Nested Ingredients Present',
        status: recipesWithoutIngredients === 0 ? 'PASS' : 'FAIL',
        expected: 0,
        actual: recipesWithoutIngredients,
        message: `Found ${recipesWithoutIngredients} recipes without ingredients array`,
      };
      result.checks.push(ingredientsCheck);

      // Check 3: Required recipe fields
      const recipesWithMissingFields = await this.mongoDb!
        .collection('recipes')
        .find({
          $or: [
            { name: { $exists: false } },
            { servings: { $exists: false } },
            { prepMinutes: { $exists: false } },
            { cookMinutes: { $exists: false } },
          ],
        })
        .count();

      const fieldsCheck: CheckResult = {
        name: 'Required Recipe Fields',
        status: recipesWithMissingFields === 0 ? 'PASS' : 'FAIL',
        expected: 0,
        actual: recipesWithMissingFields,
        message: `Found ${recipesWithMissingFields} recipes with missing required fields`,
      };
      result.checks.push(fieldsCheck);

      // Check 4: Tag array consistency
      const recipesWithInvalidTags = await this.mongoDb!
        .collection('recipes')
        .find({ tags: { $not: { $type: 'array' } } })
        .count();

      const tagsCheck: CheckResult = {
        name: 'Tags Array Format',
        status: recipesWithInvalidTags === 0 ? 'PASS' : 'FAIL',
        expected: 0,
        actual: recipesWithInvalidTags,
        message: `Found ${recipesWithInvalidTags} recipes with invalid tags format`,
      };
      result.checks.push(tagsCheck);
    } catch (error) {
      result.overallStatus = 'FAIL';
      console.error('Error verifying recipes:', error);
    }

    result.overallStatus = result.checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL';
    this.results.push(result);
  }

  async verifyPantryItems(): Promise<void> {
    console.log('\n🔍 Verifying pantry_items collection...');
    const result: VerificationResult = {
      collection: 'pantry_items',
      checks: [],
      overallStatus: 'PASS',
      timestamp: new Date(),
    };

    try {
      // Check 1: Record count
      const pgCount = await this.pgPool.query('SELECT COUNT(*) FROM pantry_items');
      const mongoCount = await this.mongoDb!.collection('pantry_items').countDocuments();

      const countCheck: CheckResult = {
        name: 'Record Count Match',
        status: pgCount.rows[0].count === mongoCount ? 'PASS' : 'FAIL',
        expected: pgCount.rows[0].count,
        actual: mongoCount,
        message: `PostgreSQL has ${pgCount.rows[0].count} items, MongoDB has ${mongoCount}`,
      };
      result.checks.push(countCheck);

      // Check 2: User ID foreign key validity
      const validUsers = await this.mongoDb!.collection('users').distinct('_id');
      const invalidUserIds = await this.mongoDb!
        .collection('pantry_items')
        .find({ userId: { $nin: validUsers } })
        .count();

      const fkCheck: CheckResult = {
        name: 'Foreign Key Validity (userId)',
        status: invalidUserIds === 0 ? 'PASS' : 'FAIL',
        expected: 0,
        actual: invalidUserIds,
        message: `Found ${invalidUserIds} pantry items with invalid userId references`,
      };
      result.checks.push(fkCheck);

      // Check 3: Quantity validation
      const negativeQuantities = await this.mongoDb!
        .collection('pantry_items')
        .find({ quantity: { $lt: 0 } })
        .count();

      const quantityCheck: CheckResult = {
        name: 'Quantity Non-Negative',
        status: negativeQuantities === 0 ? 'PASS' : 'FAIL',
        expected: 0,
        actual: negativeQuantities,
        message: `Found ${negativeQuantities} pantry items with negative quantities`,
      };
      result.checks.push(quantityCheck);
    } catch (error) {
      result.overallStatus = 'FAIL';
      console.error('Error verifying pantry items:', error);
    }

    result.overallStatus = result.checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL';
    this.results.push(result);
  }

  async verifyWeeklyMenus(): Promise<void> {
    console.log('\n🔍 Verifying weekly_menus collection...');
    const result: VerificationResult = {
      collection: 'weekly_menus',
      checks: [],
      overallStatus: 'PASS',
      timestamp: new Date(),
    };

    try {
      // Check 1: Record count
      const pgCount = await this.pgPool.query('SELECT COUNT(*) FROM weekly_menu');
      const mongoCount = await this.mongoDb!.collection('weekly_menus').countDocuments();

      const countCheck: CheckResult = {
        name: 'Record Count Match',
        status: pgCount.rows[0].count === mongoCount ? 'PASS' : 'FAIL',
        expected: pgCount.rows[0].count,
        actual: mongoCount,
        message: `PostgreSQL has ${pgCount.rows[0].count} menus, MongoDB has ${mongoCount}`,
      };
      result.checks.push(countCheck);

      // Check 2: Meal entries nested
      const menusWithoutMeals = await this.mongoDb!
        .collection('weekly_menus')
        .find({ meals: { $exists: false } })
        .count();

      const mealsCheck: CheckResult = {
        name: 'Meals Nested Correctly',
        status: menusWithoutMeals === 0 ? 'PASS' : 'FAIL',
        expected: 0,
        actual: menusWithoutMeals,
        message: `Found ${menusWithoutMeals} menus without meals array`,
      };
      result.checks.push(mealsCheck);

      // Check 3: Valid week numbers
      const invalidWeekNumbers = await this.mongoDb!
        .collection('weekly_menus')
        .find({ $or: [{ weekNumber: { $lt: 1 } }, { weekNumber: { $gt: 53 } }] })
        .count();

      const weekCheck: CheckResult = {
        name: 'Valid Week Numbers (1-53)',
        status: invalidWeekNumbers === 0 ? 'PASS' : 'FAIL',
        expected: 0,
        actual: invalidWeekNumbers,
        message: `Found ${invalidWeekNumbers} menus with invalid week numbers`,
      };
      result.checks.push(weekCheck);
    } catch (error) {
      result.overallStatus = 'FAIL';
      console.error('Error verifying weekly menus:', error);
    }

    result.overallStatus = result.checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL';
    this.results.push(result);
  }

  async verifyIndexes(): Promise<void> {
    console.log('\n🔍 Verifying MongoDB indexes...');
    const result: VerificationResult = {
      collection: 'indexes',
      checks: [],
      overallStatus: 'PASS',
      timestamp: new Date(),
    };

    try {
      const requiredIndexes = {
        users: ['email', 'keycloakId'],
        recipes: ['name', 'tags'],
        pantry_items: ['userId'],
        weekly_menus: ['userId'],
      };

      for (const [collection, expectedIndexes] of Object.entries(requiredIndexes)) {
        const indexes = await this.mongoDb!.collection(collection).listIndexes().toArray();
        const indexNames = indexes.map((idx) => Object.keys(idx.key)[0]);

        const missingIndexes = expectedIndexes.filter((exp) => !indexNames.includes(exp));

        const indexCheck: CheckResult = {
          name: `${collection} Indexes`,
          status: missingIndexes.length === 0 ? 'PASS' : 'WARNING',
          expected: expectedIndexes,
          actual: indexNames,
          message: missingIndexes.length === 0 ? 'All indexes present' : `Missing indexes: ${missingIndexes.join(', ')}`,
        };
        result.checks.push(indexCheck);
      }
    } catch (error) {
      result.overallStatus = 'FAIL';
      console.error('Error verifying indexes:', error);
    }

    result.overallStatus =
      result.checks.every((c) => c.status !== 'FAIL') && result.checks.some((c) => c.status === 'PASS')
        ? 'PASS'
        : 'FAIL';
    this.results.push(result);
  }

  generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 MIGRATION VERIFICATION REPORT');
    console.log('='.repeat(80));

    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    let warningChecks = 0;

    for (const result of this.results) {
      console.log(`\n${result.collection.toUpperCase()} [${result.overallStatus}]`);
      console.log('-'.repeat(80));

      for (const check of result.checks) {
        totalChecks++;
        if (check.status === 'PASS') passedChecks++;
        if (check.status === 'FAIL') failedChecks++;
        if (check.status === 'WARNING') warningChecks++;

        const statusIcon = check.status === 'PASS' ? '✓' : check.status === 'FAIL' ? '✗' : '⚠';
        console.log(`${statusIcon} ${check.name}`);
        console.log(`  Expected: ${check.expected} | Actual: ${check.actual}`);
        console.log(`  ${check.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Total Checks: ${totalChecks} | Passed: ${passedChecks} | Failed: ${failedChecks} | Warnings: ${warningChecks}`);
    console.log(`Success Rate: ${((passedChecks / totalChecks) * 100).toFixed(2)}%`);
    console.log('='.repeat(80) + '\n');
  }

  async run(): Promise<void> {
    try {
      await this.connect();
      await this.verifyUsers();
      await this.verifyRecipes();
      await this.verifyPantryItems();
      await this.verifyWeeklyMenus();
      await this.verifyIndexes();
      this.generateReport();
    } catch (error) {
      console.error('Verification failed:', error);
      process.exit(1);
    } finally {
      await this.pgPool.end();
      await this.mongoClient.close();
    }
  }
}

const verifier = new MigrationVerifier();
verifier.run().catch(console.error);
