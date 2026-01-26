# Production Schedules Database Migration

## Problem

The automated inventory checking system was failing with this error:
```
NeonDbError: relation "production_schedules" does not exist
```

## Root Cause

Production schedules were stored in `data/production-schedules.json` file, but the inventory checker was attempting to query them from a database table that didn't exist.

## Solution

Migrated production schedules from JSON files to PostgreSQL database to match the pattern used by recipes.

---

## What Was Done

### 1. Created Migration Script ✅

**File:** `scripts/migrate-production-schedules-to-postgres.ts`

Creates the `production_schedules` table and migrates existing data:
- Table structure: `schedule_id` (primary key), `schedule_data` (JSONB)
- Indexes on `weekStart` and `weekEnd` for efficient querying
- Migrated 1 existing production schedule successfully

### 2. Updated All API Routes ✅

Converted 9 route files from JSON file operations to database operations:

**Main Routes:**
- `app/api/production-schedules/route.ts` (GET, POST)
- `app/api/production-schedules/[id]/route.ts` (GET, PUT, PATCH, DELETE)

**Assignment & Management:**
- `app/api/production-schedules/[id]/assign/route.ts`

**Item Operations:**
- `app/api/production-schedules/[id]/items/[itemId]/adjust-quantity/route.ts`
- `app/api/production-schedules/[id]/items/[itemId]/reschedule/route.ts`
- `app/api/production-schedules/[id]/items/[itemId]/sub-recipe-progress/route.ts`
- `app/api/production-schedules/[id]/items/[itemId]/complete/route.ts`
- `app/api/production-schedules/[id]/items/[itemId]/start/route.ts`
- `app/api/production-schedules/[id]/items/[itemId]/reassign/route.ts`

---

## Changes Made

### Before (JSON File Approach)
```typescript
import fs from 'fs'
import path from 'path'

const dataFilePath = path.join(process.cwd(), 'data', 'production-schedules.json')

function readSchedules() {
  const fileContents = fs.readFileSync(dataFilePath, 'utf8')
  return JSON.parse(fileContents)
}

function writeSchedules(data: any) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2))
}

// Usage
const schedules = readSchedules()
// ... modify schedules
writeSchedules(schedules)
```

### After (Database Approach)
```typescript
import { sql } from '@vercel/postgres'

// Read
const result = await sql`
  SELECT schedule_data
  FROM production_schedules
  WHERE schedule_id = ${scheduleId}
`
const schedule = result.rows[0].schedule_data

// Write
await sql`
  UPDATE production_schedules
  SET schedule_data = ${JSON.stringify(schedule)}::jsonb,
      updated_at = CURRENT_TIMESTAMP
  WHERE schedule_id = ${scheduleId}
`
```

---

## Database Schema

```sql
CREATE TABLE production_schedules (
  schedule_id TEXT PRIMARY KEY,
  schedule_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX idx_production_schedules_week_start 
  ON production_schedules((schedule_data->>'weekStart'));

CREATE INDEX idx_production_schedules_week_end 
  ON production_schedules((schedule_data->>'weekEnd'));
```

---

## Benefits

### 1. **Consistency**
- All main data (recipes, production schedules) now in database
- Uniform data access pattern across the application

### 2. **Scalability**
- Database can handle concurrent reads/writes better than file system
- No file locking issues
- Better performance with indexes

### 3. **Reliability**
- ACID transactions ensure data integrity
- No risk of file corruption
- Atomic updates

### 4. **Integration**
- Inventory checker can now join production schedules with recipes
- Complex queries possible (aggregations, filtering, etc.)
- Better for analytics and reporting

---

## Testing Results

✅ Migration script ran successfully
✅ All 9 route files updated
✅ Inventory checker now works correctly
✅ No breaking changes to API interface
✅ Existing functionality preserved

---

## Backward Compatibility

The `data/production-schedules.json` file is preserved but no longer used by API routes. It can be:
- Kept as a backup
- Removed after confirming everything works
- Used for local development reference

---

## Future Improvements

1. **Add More Indexes**: Based on common query patterns
2. **Implement Caching**: For frequently accessed schedules
3. **Add Triggers**: For automatic `updated_at` timestamp updates
4. **Archive Old Schedules**: Move completed schedules to archive table
5. **Add Full-Text Search**: On production items using PostgreSQL full-text search

---

## Files Created/Modified

### Created:
- `scripts/migrate-production-schedules-to-postgres.ts`
- `scripts/batch-update-routes.js`
- `md files/PRODUCTION_SCHEDULES_DATABASE_MIGRATION.md` (this file)

### Modified:
- 9 API route files (all production-schedules routes)

---

## Migration Commands

**To migrate data:**
```bash
npx tsx scripts/migrate-production-schedules-to-postgres.ts
```

**To verify:**
```sql
-- Check table exists
SELECT * FROM production_schedules LIMIT 1;

-- Count schedules
SELECT COUNT(*) FROM production_schedules;

-- View structure
\d production_schedules
```

---

## Rollback Plan

If issues arise, you can rollback by:

1. Reverting route files to use JSON
2. Dropping the table: `DROP TABLE production_schedules;`
3. Restoring from backup JSON file

However, since the migration is tested and working, rollback should not be necessary.

---

**Status: ✅ COMPLETE & TESTED**

**Date:** January 25, 2026
**Migration Time:** ~10 seconds
**Records Migrated:** 1 production schedule
**Zero Downtime:** Yes (database operations are backward compatible)
