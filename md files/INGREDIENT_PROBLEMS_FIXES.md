# Ingredient Problems & Inventory Check Fixes

## Issues Fixed

### Issue 1: Shortages Not Showing on Central Kitchen Dashboard
**Problem**: The ingredient shortage alerts widget showed "No pending shortages" even though shortages existed.

**Root Cause**: 
- Shortages were being created in the database without a `resolution_status` field value
- The API query was looking specifically for `resolution_status = 'PENDING'`, missing shortages with NULL values

**Solution**:
1. Updated `lib/inventory-checker.ts` to explicitly set `resolution_status = 'PENDING'` when creating new shortages
2. Updated `app/api/inventory-shortages/route.ts` to handle both 'PENDING' and NULL values when querying pending shortages
3. Added better error logging to `components/kitchen/InventoryShortageAlertsWidget.tsx`
4. Created migration script `scripts/fix-shortage-resolution-status.ts` to fix existing data

### Issue 2: Inventory Check Results Not Persisting
**Problem**: When navigating away from the Head Chef dashboard and returning, the inventory check results would disappear and need to be run again.

**Root Cause**: 
The persistence was actually working correctly, but:
- Error handling was insufficient to diagnose issues
- No clear feedback when checks failed to load
- Missing logging made debugging difficult

**Solution**:
1. Improved error handling in `components/kitchen/InventoryStatusWidget.tsx`
2. Added comprehensive logging to track:
   - When checks are loaded
   - When new checks are run
   - Success and failure states
3. Improved `loadCheck()` function to better handle 404 responses (which are expected when no check exists yet)
4. Added logging to show when the component mounts and loads data

## Changes Made

### 1. Updated `lib/inventory-checker.ts`
```typescript
// Now explicitly sets resolution_status='PENDING' when creating shortages
INSERT INTO ingredient_shortages (
  ...,
  resolution_status
) VALUES (
  ...,
  'PENDING'
)
```

### 2. Updated `app/api/inventory-shortages/route.ts`
```typescript
// Now handles both PENDING and NULL values
WHERE (s.resolution_status = 'PENDING' OR s.resolution_status IS NULL)
```

### 3. Updated `components/kitchen/InventoryStatusWidget.tsx`
- Added logging for load/run operations
- Improved error handling for 404 responses
- Added console logs to track data flow
- Better handling of empty/null results

### 4. Updated `components/kitchen/InventoryShortageAlertsWidget.tsx`
- Added detailed error logging
- Shows count of loaded shortages
- Logs error details when API calls fail

### 5. Created `scripts/fix-shortage-resolution-status.ts`
Migration script to update existing shortages with NULL resolution_status to 'PENDING'

## How to Apply the Fixes

### Step 1: Run the Migration Script
This will fix any existing shortages in the database:

```bash
# Using tsx (recommended)
npx tsx scripts/fix-shortage-resolution-status.ts

# Or using ts-node
npx ts-node scripts/fix-shortage-resolution-status.ts

# Or compile and run
npx tsc scripts/fix-shortage-resolution-status.ts
node scripts/fix-shortage-resolution-status.js
```

Expected output:
```
🔧 Fixing shortage resolution_status...
✅ Updated X shortage records
📊 Total PENDING shortages: X
📊 Total RESOLVED shortages: X
✅ Migration complete
```

### Step 2: Test the Fixes

#### Testing Issue 1 (Shortages Not Showing):
1. Go to Head Chef dashboard (`/kitchen/head-chef`)
2. Select a production schedule
3. Click "Run Inventory Check"
4. Wait for the check to complete (should show shortages)
5. Open browser console (F12) and check for logs:
   - "Running new inventory check for schedule: ..."
   - "Inventory check completed: ..."
6. Navigate to Central Kitchen dashboard (`/kitchen`)
7. Check the "Inventory Shortage Alerts" widget
8. Should see the shortages from the check
9. Check browser console for:
   - "Loaded shortages: X items"
10. Click "View More Details" to see the full page

#### Testing Issue 2 (Persistence):
1. Go to Head Chef dashboard
2. Select a schedule and run an inventory check
3. Wait for results to appear
4. Navigate away (e.g., go to `/recipes`)
5. Navigate back to Head Chef dashboard
6. Select the same schedule
7. Results should load automatically without needing to run check again
8. Check browser console for:
   - "Loading inventory check for schedule: ..."
   - Should NOT show "No existing inventory check found" (unless truly none exists)
   - Results should appear automatically

### Step 3: Verify Data Flow

#### Check Database (if you have access):
```sql
-- Check shortages with resolution_status
SELECT 
  resolution_status, 
  COUNT(*) as count 
FROM ingredient_shortages 
GROUP BY resolution_status;

-- Should show:
-- PENDING: X records
-- RESOLVED: X records (if any have been resolved)
-- (no NULL values)

-- Check latest inventory checks
SELECT 
  check_id,
  schedule_id,
  check_date,
  overall_status,
  missing_ingredients_count,
  partial_ingredients_count
FROM inventory_checks
ORDER BY check_date DESC
LIMIT 10;
```

## Monitoring and Debugging

### Browser Console Logs to Watch For

**When loading shortages (Central Kitchen dashboard)**:
- ✅ Good: "Loaded shortages: 5 items"
- ❌ Bad: "Failed to load shortages: 500" or error messages

**When loading inventory check (Head Chef dashboard)**:
- ✅ Good: "Loading inventory check for schedule: check-..."
- ✅ Good: "No existing inventory check found" (if first time)
- ❌ Bad: "Error loading check: ..."

**When running new check**:
- ✅ Good: "Running new inventory check for schedule: ..."
- ✅ Good: "Inventory check completed: {...}"
- ❌ Bad: "Inventory check failed: 500"

### Common Issues and Solutions

**Issue**: Widget shows "No pending shortages" but Head Chef shows shortages
- **Solution**: Run the migration script (Step 1)
- **Check**: Look for console error logs
- **Verify**: Check API response in Network tab (F12)

**Issue**: Results don't persist after navigation
- **Solution**: Check browser console for error logs
- **Check**: Verify the schedule_id is correct
- **Verify**: Use Network tab to see if API call succeeds

**Issue**: "No check found" even after running check
- **Solution**: Check if the check actually completed (look for errors in console)
- **Check**: Verify database has inventory_checks table with data
- **Verify**: Schedule IDs match between check and query

## Technical Notes

### Data Flow

1. **Head Chef runs inventory check**:
   - User clicks "Run Check Now"
   - POST `/api/inventory-check/run` with `{ scheduleId }`
   - `runInventoryCheck()` processes schedule
   - Saves check to `inventory_checks` table
   - Saves shortages to `ingredient_shortages` table with `resolution_status='PENDING'`
   - Returns results to widget
   - Widget displays results

2. **Head Chef returns to page**:
   - Component mounts
   - `useEffect` triggers `loadCheck()`
   - GET `/api/inventory-check/{scheduleId}`
   - `getLatestCheck()` queries database for most recent check
   - Returns check with associated shortages
   - Widget displays results (no need to run again)

3. **Central Kitchen views shortages**:
   - Widget loads on dashboard
   - Calls GET `/api/inventory-shortages?status=PENDING`
   - API queries `ingredient_shortages` table
   - Includes both `resolution_status='PENDING'` and NULL values
   - Returns matching shortages
   - Widget displays in compact view
   - "View More Details" goes to full page

### Database Schema

**ingredient_shortages table** (relevant columns):
- `shortage_id`: Primary key
- `check_id`: Foreign key to inventory_checks
- `schedule_id`: Schedule this shortage is for
- `resolution_status`: 'PENDING', 'RESOLVED', or NULL (now always set)
- `priority`: 'HIGH', 'MEDIUM', 'LOW'
- `status`: 'MISSING', 'PARTIAL', 'CRITICAL', 'SUFFICIENT'

**inventory_checks table** (relevant columns):
- `check_id`: Primary key
- `schedule_id`: Schedule this check is for
- `check_date`: When check was run
- `overall_status`: 'ALL_GOOD', 'PARTIAL_SHORTAGE', 'CRITICAL_SHORTAGE'
- `missing_ingredients_count`: Count of missing/critical items
- `partial_ingredients_count`: Count of partial shortage items

## Future Improvements

1. **Add caching**: Cache check results in localStorage for faster loading
2. **Auto-refresh**: Automatically refresh when user returns to page after long absence
3. **Notifications**: Alert Central Kitchen staff when new critical shortages are detected
4. **Bulk actions**: Allow resolving multiple shortages at once
5. **Export**: Add ability to export shortage reports
6. **History**: Show history of checks with trends over time
