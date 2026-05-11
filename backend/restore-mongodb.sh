#!/bin/bash
#
# MongoDB Restore Script
# Performs disaster recovery from backup with verification
#
# Usage:
#   ./restore-mongodb.sh /path/to/backup-archive.gz
#   ./restore-mongodb.sh /path/to/backup-archive.gz family_planner_recovery
#

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup_archive> [target_database]"
    echo "Example: $0 backup-20240101_120000.archive family_planner"
    exit 1
fi

BACKUP_ARCHIVE="$1"
TARGET_DB="${2:-family_planner}"
RECOVERY_DIR="/tmp/recovery-$(date +%s)"

echo "═══════════════════════════════════════════════════"
echo "⚠️  DISASTER RECOVERY INITIATED"
echo "═══════════════════════════════════════════════════"
echo "Backup: $BACKUP_ARCHIVE"
echo "Target: $TARGET_DB"
echo ""

# Verify backup archive exists
if [ ! -f "$BACKUP_ARCHIVE" ]; then
    echo "✗ Error: Backup archive not found: $BACKUP_ARCHIVE"
    exit 1
fi

# Verify backup integrity if checksum exists
CHECKSUM_FILE="${BACKUP_ARCHIVE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
    echo "🔐 Verifying backup integrity..."
    if sha256sum -c "$CHECKSUM_FILE"; then
        echo "✓ Backup integrity verified"
    else
        echo "✗ Error: Backup integrity check failed"
        echo "This backup may be corrupted. Proceed? (yes/no)"
        read -r proceed
        if [ "$proceed" != "yes" ]; then
            exit 1
        fi
    fi
fi

# Check MongoDB connection
echo "🔌 Checking MongoDB connection..."
if ! mongo --version &> /dev/null; then
    echo "✗ Error: mongo client not found"
    exit 1
fi

# Attempt connection
if ! mongo --quiet --eval "db.version()" > /dev/null 2>&1; then
    echo "⚠ Warning: Cannot connect to MongoDB"
    echo "Make sure MongoDB is running. Continue? (yes/no)"
    read -r proceed
    if [ "$proceed" != "yes" ]; then
        exit 1
    fi
fi

echo ""
echo "📋 Recovery Steps:"
echo "1️⃣  Create backup of current database (pre-recovery)"
echo "2️⃣  Drop target database"
echo "3️⃣  Restore from backup archive"
echo "4️⃣  Verify restored data"
echo "5️⃣  Create indexes"

echo ""
echo "⚠️  WARNING: This will OVERWRITE the current database: $TARGET_DB"
echo "Confirm recovery? (yes/no)"
read -r confirm
if [ "$confirm" != "yes" ]; then
    echo "Recovery cancelled."
    exit 0
fi

# Step 1: Backup current database
echo ""
echo "1️⃣  Creating backup of current database..."
CURRENT_BACKUP="/backup/pre-recovery-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$(dirname "$CURRENT_BACKUP")"
if mongodump --db $TARGET_DB --archive="$CURRENT_BACKUP.archive" --gzip 2>/dev/null; then
    echo "✓ Current database backed up: $CURRENT_BACKUP"
else
    echo "⚠ Warning: Could not backup current database (may not exist yet)"
fi

# Step 2: Drop target database
echo ""
echo "2️⃣  Dropping database: $TARGET_DB..."
if mongo $TARGET_DB --quiet --eval "db.dropDatabase();" 2>/dev/null; then
    echo "✓ Database dropped"
else
    echo "⚠ Warning: Database may not exist"
fi

# Step 3: Restore from archive
echo ""
echo "3️⃣  Restoring from backup..."
mkdir -p "$RECOVERY_DIR"

if mongorestore --archive="$BACKUP_ARCHIVE" --gzip \
    --nsFrom='family_planner.*' --nsTo="$TARGET_DB.*" \
    --dir="$RECOVERY_DIR" 2>/dev/null; then
    echo "✓ Restore completed"
else
    echo "✗ Error: Restore failed"
    exit 1
fi

# Step 4: Verify restored data
echo ""
echo "4️⃣  Verifying restored data..."
COLLECTIONS_COUNT=$(mongo $TARGET_DB --quiet --eval "db.getCollectionNames().length")
echo "✓ Collections restored: $COLLECTIONS_COUNT"

# Sample verification queries
echo ""
echo "📊 Data verification:"
mongo $TARGET_DB --quiet --eval "
    const stats = {
        users: db.users.count(),
        recipes: db.recipes.count(),
        pantry_items: db.pantry_items.count(),
        weekly_menus: db.weekly_menus.count(),
        audit_logs: db.audit_logs.count(),
        transactions: db.transactions.count()
    };
    Object.entries(stats).forEach(([col, count]) => {
        print('  ' + col + ': ' + count + ' documents');
    });
" 2>/dev/null || echo "✗ Could not verify collections"

# Step 5: Recreate indexes
echo ""
echo "5️⃣  Creating indexes..."

mongo $TARGET_DB --quiet << 'INDEXES'
// Users indexes
db.users.createIndex({ email: 1 }, { unique: true, background: true });
db.users.createIndex({ keycloakId: 1 }, { sparse: true, background: true });
db.users.createIndex({ createdAt: -1 }, { background: true });

// Recipes indexes
db.recipes.createIndex({ name: "text", description: "text" }, { background: true });
db.recipes.createIndex({ tags: 1 }, { background: true });
db.recipes.createIndex({ createdBy: 1, createdAt: -1 }, { background: true });

// Pantry items indexes
db.pantry_items.createIndex({ userId: 1 }, { background: true });
db.pantry_items.createIndex({ userId: 1, name: 1 }, { unique: true, background: true });
db.pantry_items.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true, background: true });

// Weekly menus indexes
db.weekly_menus.createIndex({ userId: 1 }, { background: true });
db.weekly_menus.createIndex({ userId: 1, weekNumber: 1, year: 1 }, { unique: true, background: true });

// Audit logs indexes
db.audit_logs.createIndex({ collectionName: 1, timestamp: -1 }, { background: true });
db.audit_logs.createIndex({ userId: 1, timestamp: -1 }, { background: true });
db.audit_logs.createIndex({ documentId: 1, timestamp: -1 }, { background: true });
db.audit_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000, background: true });

print("✓ Indexes created");
INDEXES

echo ""
echo "🧹 Cleaning up..."
rm -rf "$RECOVERY_DIR"

echo ""
echo "═══════════════════════════════════════════════════"
echo "✓ Recovery completed successfully"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Run verification script: npx ts-node scripts/verify-migration.ts"
echo "2. Test application connectivity"
echo "3. Monitor application logs for errors"
echo "4. If issues occur, rollback using: $CURRENT_BACKUP"
echo ""
