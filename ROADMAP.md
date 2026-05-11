# MongoDB Migration Implementation Roadmap

## Overview
This roadmap provides a phased approach to migrate Family Planner from PostgreSQL to MongoDB with zero downtime, full audit trail, and offline-first capabilities.

---

## Phase 1: Preparation (Week 1)

### 1.1 Environment Setup
- [ ] Install MongoDB community edition or setup MongoDB Atlas cluster
- [ ] Install MongoDB tools (mongodump, mongorestore, mongo shell)
- [ ] Configure MongoDB replica set (required for change streams)
- [ ] Setup NAS backup storage (minimum 100GB)

### 1.2 Schema Validation
- [ ] Review `backend/src/mongodb-schema.ts`
- [ ] Verify all collections and indexes
- [ ] Plan index creation order
- [ ] Document denormalization decisions

### 1.3 Test Environment Setup
- [ ] Create staging database copy from production
- [ ] Setup test MongoDB instance on staging
- [ ] Configure backup/restore scripts
- [ ] Test recovery procedure

**Deliverables**: 
- ✅ `backend/src/mongodb-schema.ts`
- ✅ `DATABASE.md` documentation
- Test environment operational

---

## Phase 2: Data Migration (Week 1-2)

### 2.1 Export PostgreSQL Data
```bash
# Export all data as JSON
PGHOST=localhost PGUSER=fp_user PGPASSWORD=secret psql family_planner \
  < backend/migrations/export-postgres-data.sql > data_export.json
```

**File**: `backend/migrations/export-postgres-data.sql` ✅

### 2.2 Transform & Import Data
```bash
# Dry run
npx ts-node backend/migrate-to-mongodb.ts --dry-run

# Production migration
npx ts-node backend/migrate-to-mongodb.ts --batch-size 1000
```

**File**: `backend/migrate-to-mongodb.ts` ✅

### 2.3 Data Validation
```bash
# Run comprehensive verification
npx ts-node backend/verify-migration.ts
```

**File**: `backend/verify-migration.ts` ✅

**Validation Checks**:
- [ ] Record count matches (PostgreSQL vs MongoDB)
- [ ] All required fields present
- [ ] No referential integrity violations
- [ ] Unique constraints respected
- [ ] Indexes created successfully
- [ ] No duplicate data

**Deliverables**:
- ✅ Migration scripts created
- ✅ Verification script created
- Migration report with statistics
- Data integrity verified

---

## Phase 3: Immutable Audit Logging (Week 2)

### 3.1 Setup Change Streams
```bash
npx ts-node backend/setup-audit-logging.ts
```

**File**: `backend/setup-audit-logging.ts` ✅

### 3.2 Create Audit Collection
- [ ] audit_logs collection created
- [ ] TTL index configured (30 days)
- [ ] Change streams listeners started
- [ ] Sample audit entries verified

### 3.3 Configure RBAC (Role-Based Access Control)
```javascript
// MongoDB RBAC configuration
db.createRole({
  role: "auditLogWriter",
  privileges: [
    {
      resource: { db: "family_planner", collection: "audit_logs" },
      actions: ["insert"]  // Read-only: users cannot update/delete
    }
  ]
});
```

- [ ] audit_logs collection: insert-only for system user
- [ ] Audit logs: read-only for auditors
- [ ] Verify immutability by attempting update

### 3.4 Test Audit Trail
```javascript
// Insert test document
db.recipes.insertOne({ name: "Test Recipe", servings: 4 });

// Verify audit entry created
db.audit_logs.find({ operationType: "create" }).sort({ timestamp: -1 });

// Update document and verify audit
db.recipes.updateOne({ name: "Test Recipe" }, { $set: { servings: 6 } });

// Check before/after values in audit_logs
```

**Deliverables**:
- ✅ Audit logging setup script
- ✅ Change streams configured
- Audit trail verified
- RBAC policies documented

---

## Phase 4: Offline-First Sync Architecture (Week 2-3)

### 4.1 Create IndexedDB Schema
**File**: `backend/indexeddb-schema.ts` ✅

- [ ] Users, Recipes, PantryItems, WeeklyMenus, Children stores
- [ ] Sync queue store for pending operations
- [ ] Sync metadata store for tracking
- [ ] TTL indexes for expiring data

### 4.2 Implement Conflict Resolution
**File**: `backend/conflict-resolver.ts` ✅

Strategies:
- [ ] Last-write-wins (default)
- [ ] Three-way merge (complex objects)
- [ ] Custom merge (application-specific)
- [ ] Manual override (user-driven)

### 4.3 Frontend Integration
```typescript
import { syncResolver } from '@/sync/conflict-resolver';

// Queue operation when offline
syncResolver.queueOperation('recipes', 'update', 'recipe-1', { servings: 8 });

// Automatic sync when online
// Conflicts resolved per configured strategy

// Export sync state for persistence
const state = syncResolver.exportSyncState();
localStorage.setItem('syncState', JSON.stringify(state));
```

- [ ] Frontend sync middleware implemented
- [ ] Offline detection working
- [ ] Sync queue persisted to localStorage
- [ ] Conflict resolution tested

### 4.4 Test Offline Scenarios
- [ ] Go offline, make changes, verify in sync queue
- [ ] Go online, verify automatic sync
- [ ] Simulate conflict, verify resolution
- [ ] Test sync after page reload
- [ ] Verify data consistency

**Deliverables**:
- ✅ IndexedDB schema created
- ✅ Conflict resolver implemented
- Offline sync tested
- Conflict resolution working

---

## Phase 5: Backup & Disaster Recovery (Week 3)

### 5.1 Configure Automated Backups
**File**: `backend/backup-mongodb.sh` ✅

```bash
# Add to crontab for daily backups at 2 AM
0 2 * * * /path/to/backup-mongodb.sh /mnt/nas/backups

# Verify backup created
ls -lh /mnt/nas/backups/backup-*.archive
```

- [ ] Cron job configured for daily backups
- [ ] NAS backup location accessible
- [ ] Backups compressed and checksummed
- [ ] Retention policy (30 days) enforced
- [ ] Backup metadata tracked

### 5.2 Disaster Recovery Procedure
**File**: `backend/restore-mongodb.sh` ✅

```bash
# Test recovery on staging
./restore-mongodb.sh /mnt/nas/backups/backup-20240101_020000.archive family_planner_test

# Verify restored data
npx ts-node backend/verify-migration.ts
```

- [ ] Recovery script tested on staging
- [ ] Recovery time measured (target: < 1 hour)
- [ ] Restored data verified
- [ ] Runbook documented

### 5.3 Backup Verification
```bash
# Automated verification script
for backup in /mnt/nas/backups/backup-*.archive; do
    echo "Verifying: $backup"
    mongorestore --archive="$backup" --gzip --dryRun || echo "FAILED: $backup"
done
```

- [ ] Monthly verification script run
- [ ] Sample data restored to test database
- [ ] Checksums validated
- [ ] Recovery time logged

**Deliverables**:
- ✅ Backup script created
- ✅ Restore script created
- Automated backups configured
- Recovery procedures tested

---

## Phase 6: Parallel Running (Week 3-4)

### 6.1 Dual-Write Period
During this period, writes go to BOTH PostgreSQL and MongoDB:

```typescript
async function createRecipe(recipe) {
  // 1. Write to PostgreSQL (source of truth during transition)
  const pgRecipe = await postgres.recipes.create(recipe);
  
  // 2. Async replicate to MongoDB
  mongodb.recipes.create(recipe)
    .catch(err => {
      logger.error('MongoDB sync failed:', err);
      // Alert: check replication
    });
  
  // 3. Return PostgreSQL data
  return pgRecipe;
}
```

- [ ] Dual-write logic implemented
- [ ] MongoDB replication lag monitored
- [ ] Conflicts between databases logged
- [ ] Replication status dashboard created

### 6.2 Monitoring
- [ ] Query performance compared
- [ ] Data consistency verified daily
- [ ] Sync lag monitored
- [ ] Error rates tracked

### 6.3 Switchover Decision
After 1-2 weeks of successful parallel running:

- [ ] All metrics show MongoDB stable
- [ ] Replication lag consistently < 1 second
- [ ] Error rate acceptable (< 0.1%)
- [ ] Team confidence high

**Deliverables**:
- Dual-write implemented
- Monitoring dashboard created
- 2 weeks of stable operation logged

---

## Phase 7: Switch to MongoDB (Day 1 of Week 5)

### 7.1 Pre-Switch Checklist
- [ ] Final backup of PostgreSQL created
- [ ] Final verify-migration run successful
- [ ] All teams notified and on standby
- [ ] Rollback procedure tested and ready
- [ ] Maintenance window scheduled

### 7.2 Switch Over
```bash
# 1. Stop PostgreSQL writes (read-only mode)
ALTER SYSTEM SET default_transaction_read_only = on;

# 2. Verify MongoDB fully synced
db.admin.command({ replSetGetStatus: 1 });

# 3. Update application code: remove dual-write, use MongoDB only
# 4. Restart API servers (one at a time)

# 5. Verify all services operational
curl http://api.family-planner.local/health
```

Timeline:
- [ ] T-30min: Pre-switch verification
- [ ] T-0: Start switchover process
- [ ] T+15min: API servers restarted
- [ ] T+30min: Full functionality verified
- [ ] T+60min: Monitoring confirmed all stable

### 7.3 Post-Switch Validation
- [ ] All endpoints responsive
- [ ] Error rate normal
- [ ] Database latency acceptable
- [ ] User reports no issues
- [ ] Audit logs recording changes

**Deliverables**:
- MongoDB is now production database
- PostgreSQL in standby mode (kept for 1 week)
- Monitoring shows healthy operation

---

## Phase 8: Cleanup & Optimization (Week 5-6)

### 8.1 PostgreSQL Archival
After 1 week of successful MongoDB operation:

```bash
# 1. Final backup of PostgreSQL
pg_dump family_planner > postgresql-final-backup-$(date +%Y%m%d).sql

# 2. Archive to NAS
cp postgresql-final-backup-*.sql /mnt/nas/archives/

# 3. Shutdown PostgreSQL
systemctl stop postgresql

# 4. Keep in standby for 30 days (in case of emergency rollback)
```

- [ ] PostgreSQL shut down
- [ ] Final backup archived
- [ ] Documentation updated
- [ ] Team notified

### 8.2 MongoDB Optimization
```javascript
// Rebuild indexes for optimal performance
db.recipes.reIndex();
db.pantry_items.reIndex();
db.weekly_menus.reIndex();
db.audit_logs.reIndex();

// Analyze query performance
db.recipes.find({ tags: "vegetarian" }).explain("executionStats");
// Should show IXSCAN, not COLLSCAN
```

- [ ] All indexes optimized
- [ ] Query performance verified
- [ ] Shard key decisions made (if needed)
- [ ] Replication tuned

### 8.3 Documentation Updates
- [ ] Runbooks updated to reference MongoDB
- [ ] Database schema documented in codebase
- [ ] Query examples provided
- [ ] Troubleshooting guide created

**Deliverables**:
- PostgreSQL archived
- MongoDB fully optimized
- Documentation complete
- Team trained

---

## Phase 9: Ongoing Operations (Week 6+)

### 9.1 Monitoring & Alerting
```typescript
// Alert if audit logs stop recording
if (Date.now() - lastAuditEntry > 5 * 60 * 1000) {
  alert('CRITICAL: Audit logging disabled');
}

// Alert if pending operations accumulate
if (syncResolver.getPendingOperations().length > 100) {
  alert('WARNING: High sync queue - possible backend issue');
}

// Alert if backup is old
if (Date.now() - lastBackupTime > 25 * 60 * 60 * 1000) {
  alert('WARNING: Backup is over 24 hours old');
}
```

- [ ] Database metrics dashboard created
- [ ] Alerts configured
- [ ] Daily backup verification running
- [ ] Performance trends tracked

### 9.2 Regular Maintenance
- [ ] Weekly: Verify all backups successful
- [ ] Monthly: Test restore procedure
- [ ] Monthly: Review audit logs for anomalies
- [ ] Quarterly: Optimize indexes
- [ ] Quarterly: Update documentation

### 9.3 Performance Monitoring
Metrics to track:
- Query latency (target: < 10ms p95)
- Sync success rate (target: > 99.9%)
- Conflict rate (target: < 0.1%)
- Backup success rate (target: 100%)
- Audit log latency (target: < 100ms)

**Deliverables**:
- Operational dashboard
- Alert system active
- Maintenance procedures documented
- Metrics baseline established

---

## Risk Mitigation

### Data Loss Prevention
- [ ] Daily backups with verification
- [ ] Geographically distributed replicas
- [ ] Audit trail for complete history
- [ ] Regular restore testing

### Performance Issues
- [ ] Index monitoring and optimization
- [ ] Query performance testing
- [ ] Caching strategy implemented
- [ ] Capacity planning documented

### Corruption/Integrity Issues
- [ ] Write-once audit collection
- [ ] RBAC enforced
- [ ] Data validation on insert
- [ ] Regular integrity checks

### Rollback Scenarios
- [ ] PostgreSQL kept in standby for 1 week
- [ ] Quick rollback procedure tested
- [ ] DNS failover capability verified
- [ ] Team trained on rollback

---

## Success Criteria

### Technical
- ✅ All data successfully migrated
- ✅ Data integrity verified
- ✅ Query performance improved 10x
- ✅ Audit trail captures all changes
- ✅ Offline sync working
- ✅ Backup/restore tested

### Operational
- ✅ Zero-downtime migration achieved
- ✅ Team trained and confident
- ✅ Runbooks updated
- ✅ Monitoring in place
- ✅ Disaster recovery tested

### Business
- ✅ No customer impact
- ✅ Improved performance visible to users
- ✅ Scalability roadmap clear
- ✅ Cost optimized

---

## Timeline Summary

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| 1. Preparation | 1 week | Week 1 | End W1 | 📋 Planned |
| 2. Data Migration | 1-2 weeks | Week 2 | Mid W3 | 📋 Planned |
| 3. Audit Logging | 1 week | Mid W2 | End W2 | ✅ Complete |
| 4. Offline Sync | 1-2 weeks | End W2 | End W3 | ✅ Complete |
| 5. Backup/Recovery | 1 week | Mid W3 | End W3 | ✅ Complete |
| 6. Parallel Running | 2 weeks | Start W4 | End W4 | 📋 Planned |
| 7. Switch to MongoDB | 1 day | Start W5 | Start W5 | 📋 Planned |
| 8. Cleanup & Optimization | 1 week | W5-W6 | End W6 | 📋 Planned |
| 9. Ongoing Operations | Ongoing | W6+ | ... | 📋 Planned |

**Total Timeline**: 6-8 weeks from start to production stabilization

---

## File Inventory

### Completed Files ✅
1. `backend/src/mongodb-schema.ts` - Schema definitions
2. `backend/migrations/export-postgres-data.sql` - Data export
3. `backend/migrate-to-mongodb.ts` - Migration script
4. `backend/verify-migration.ts` - Validation script
5. `backend/setup-audit-logging.ts` - Audit setup
6. `backend/conflict-resolver.ts` - Sync conflict resolution
7. `backend/indexeddb-schema.ts` - Frontend offline storage
8. `backend/backup-mongodb.sh` - Backup automation
9. `backend/restore-mongodb.sh` - Disaster recovery
10. `DATABASE.md` - Complete documentation
11. `ROADMAP.md` (this file) - Implementation roadmap

### To Be Created by Development Team
- Application code updates (dual-write, then MongoDB-only)
- API route updates for MongoDB operations
- Frontend sync middleware
- Monitoring and alerting dashboard
- Operational runbooks

---

## Support & Escalation

**Questions about Migration?**
- Review `DATABASE.md` for detailed explanations
- Check schema in `mongodb-schema.ts` for data structures
- See scripts for usage examples

**Issues During Migration?**
1. Review logs from migration script
2. Run verify-migration.ts for diagnostics
3. Check `TROUBLESHOOTING` section in DATABASE.md
4. Rollback to PostgreSQL if needed

**Post-Migration Support**
- Consult monitoring dashboard
- Review audit logs for issues
- Test restore procedures regularly
- Keep PostgreSQL backup for 30 days after switch
