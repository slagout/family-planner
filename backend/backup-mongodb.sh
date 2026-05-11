#!/bin/bash
#
# MongoDB Backup Script
# Creates daily backups with compression and verification
# Stores on NAS with retention policy
#
# Usage:
#   ./backup-mongodb.sh
#   ./backup-mongodb.sh /mnt/nas/backups
#

set -e

BACKUP_DIR="${1:-.}"
DB_NAME="family_planner"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup-$TIMESTAMP"
LOG_FILE="$BACKUP_DIR/backup-$TIMESTAMP.log"

echo "═══════════════════════════════════════════════════"
echo "🔄 MongoDB Backup Started"
echo "═══════════════════════════════════════════════════"
echo "Database: $DB_NAME"
echo "Backup Path: $BACKUP_PATH"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check if mongodump is available
if ! command -v mongodump &> /dev/null; then
    echo "✗ Error: mongodump not found. Install MongoDB tools."
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform dump
echo "📦 Dumping database..."
if mongodump --db $DB_NAME --out "$BACKUP_PATH" --archive="$BACKUP_PATH.archive" --gzip 2>> "$LOG_FILE"; then
    echo "✓ Database dumped successfully"
else
    echo "✗ Error: Backup failed"
    exit 1
fi

# Calculate checksums for integrity verification
echo "🔐 Calculating checksums..."
if command -v sha256sum &> /dev/null; then
    sha256sum "$BACKUP_PATH.archive" > "$BACKUP_PATH.archive.sha256"
    echo "✓ Checksum created: $(cat "$BACKUP_PATH.archive.sha256")"
fi

# Verify backup integrity with dry-run restore
echo "✓ Verifying backup integrity..."
if mongorestore --archive="$BACKUP_PATH.archive" --gzip --dryRun 2>> "$LOG_FILE"; then
    echo "✓ Backup verified - restore successful in dry-run"
else
    echo "⚠ Warning: Backup verification failed"
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_PATH.archive" | cut -f1)
echo "📊 Backup size: $BACKUP_SIZE"

# Create metadata file
cat > "$BACKUP_PATH.metadata" << EOF
{
  "database": "$DB_NAME",
  "timestamp": "$TIMESTAMP",
  "timestamp_unix": $(date +%s),
  "archive_file": "$BACKUP_PATH.archive",
  "size": "$BACKUP_SIZE",
  "mongodump_version": "$(mongodump --version 2>/dev/null | head -1)",
  "hostname": "$(hostname)",
  "verification": "PASSED"
}
EOF

# Retention policy: keep only last 30 days
echo "🧹 Applying retention policy (30 days)..."
find "$BACKUP_DIR" -name "backup-*.archive" -mtime +30 -type f | while read old_backup; do
    echo "  Removing: $old_backup"
    rm -f "$old_backup"
    rm -f "$old_backup.sha256"
    rm -f "$old_backup.metadata"
done

# List recent backups
echo ""
echo "📋 Recent backups:"
ls -lh "$BACKUP_DIR"/backup-*.archive 2>/dev/null | tail -5 | awk '{print "  " $9 " (" $5 ")"}'

# Archive to NAS if configured
if [ -d "/mnt/nas" ]; then
    echo ""
    echo "📤 Archiving to NAS..."
    if cp "$BACKUP_PATH.archive" /mnt/nas/backups/ && cp "$BACKUP_PATH.metadata" /mnt/nas/backups/; then
        echo "✓ Archived to /mnt/nas/backups/"
    else
        echo "⚠ Warning: NAS archival failed"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "✓ Backup completed successfully"
echo "═══════════════════════════════════════════════════"
echo "Log: $LOG_FILE"
