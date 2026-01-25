# Branch Inventory System Setup

## Summary

The Branch Inventory system has been successfully set up to sync inventory data from SharePoint Excel files to your Neon PostgreSQL database. Currently configured for **Central Kitchen** only.

## What Was Created

### 1. Database Table: `branch_inventory`

**Table Structure:**
```sql
CREATE TABLE branch_inventory (
    id SERIAL PRIMARY KEY,
    inventory_date DATE NOT NULL,
    branch VARCHAR(100) NOT NULL,
    item VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity DECIMAL(10, 2),
    unit VARCHAR(50),
    product_expiry_date DATE,
    unit_cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    source_file VARCHAR(255),
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_branch_inventory UNIQUE (inventory_date, branch, item)
);
```

**Indexes created for performance:**
- `idx_branch_inventory_branch` - Query by branch
- `idx_branch_inventory_date` - Query by date
- `idx_branch_inventory_item` - Query by item
- `idx_branch_inventory_category` - Query by category

**Status:** ✅ Created and deployed to Neon database

### 2. Sync Script: `scripts/sync-branch-inventory.js`

**Purpose:** Downloads the Central Kitchen inventory Excel file from SharePoint and syncs it to the database.

**Features:**
- Downloads from SharePoint using Microsoft Graph API
- Reads the specific "inventory" sheet from the Excel file
- Validates data (skips rows without date or item)
- Uses UPSERT logic (updates existing records, inserts new ones)
- Warns about cost calculation mismatches
- Logs sync history to `sync_logs` table
- Detailed progress reporting

**Expected Excel Headers:**
- Inventory Date
- Branch (optional, will default to "Central Kitchen")
- Item
- Category
- Quantity
- Unit
- Product Expiry Date
- Unit Cost
- Total Cost

### 3. GitHub Action: `.github/workflows/sync-branch-inventory.yml`

**Schedule:** Runs every **Sunday at midnight Dubai time** (8PM UTC Saturday)

**Manual Trigger:** Available via "Actions" tab → "Sync Branch Inventory" → "Run workflow"

**Environment Variables Used:**
- `SHAREPOINT_TENANT_ID`
- `SHAREPOINT_CLIENT_ID`
- `SHAREPOINT_CLIENT_SECRET`
- `SHAREPOINT_DRIVE_ID`
- `SHAREPOINT_BRANCH_CK_FILE_ID` (newly added)
- `DATABASE_URL`

## Configuration

### GitHub Secrets

You've already added:
- ✅ `SHAREPOINT_BRANCH_CK_FILE_ID` = `0142VGRQH6HOP3BN3YDBDYKUZMZTJCV6YB`

Existing secrets (already configured):
- ✅ `SHAREPOINT_TENANT_ID`
- ✅ `SHAREPOINT_CLIENT_ID`
- ✅ `SHAREPOINT_CLIENT_SECRET`
- ✅ `SHAREPOINT_DRIVE_ID`
- ✅ `DATABASE_URL`

### SharePoint File Details

**File:** `Branch_Daily_Closing Central_Kitchen.xlsx`
**Sheet:** `inventory`
**File ID:** `0142VGRQH6HOP3BN3YDBDYKUZMZTJCV6YB`
**Branch:** Central Kitchen

## How to Test

### Option 1: Manual Trigger in GitHub Actions (Recommended)

1. Go to your repository on GitHub
2. Click on **"Actions"** tab
3. Select **"Sync Branch Inventory"** workflow
4. Click **"Run workflow"** button
5. Keep "Dry run mode" as **false**
6. Click green **"Run workflow"** button
7. Watch the logs to see the sync progress

### Option 2: Wait for Scheduled Run

The workflow will automatically run every **Sunday at midnight Dubai time**.

## How It Works

### UPSERT Logic

The sync uses **UPSERT** (insert or update) logic based on a unique constraint:
- **Unique Key:** `(inventory_date, branch, item)`
- If a record with the same date, branch, and item exists: **UPDATE** it
- If no matching record exists: **INSERT** new record

This means:
- ✅ You can run the sync multiple times without creating duplicates
- ✅ Updated inventory data will overwrite old data
- ✅ Historical data is preserved (different dates are separate records)

### Data Validation

The script automatically:
- ✅ Skips rows without `inventory_date` or `item`
- ✅ Validates that `total_cost ≈ quantity × unit_cost`
- ✅ Logs warnings for mismatched calculations
- ✅ Converts Excel dates to proper SQL dates
- ✅ Trims whitespace from text fields

## Querying the Data

### Example Queries

**Get latest inventory for Central Kitchen:**
```sql
SELECT DISTINCT ON (item)
    item,
    category,
    quantity,
    unit,
    product_expiry_date,
    unit_cost,
    total_cost
FROM branch_inventory
WHERE branch = 'Central Kitchen'
ORDER BY item, inventory_date DESC;
```

**Get inventory for a specific date:**
```sql
SELECT *
FROM branch_inventory
WHERE branch = 'Central Kitchen'
  AND inventory_date = '2026-01-25'
ORDER BY category, item;
```

**Get items expiring soon:**
```sql
SELECT 
    item,
    category,
    quantity,
    unit,
    product_expiry_date,
    (product_expiry_date - CURRENT_DATE) as days_until_expiry
FROM branch_inventory
WHERE branch = 'Central Kitchen'
  AND product_expiry_date <= CURRENT_DATE + INTERVAL '7 days'
  AND inventory_date = (
    SELECT MAX(inventory_date) 
    FROM branch_inventory 
    WHERE branch = 'Central Kitchen'
  )
ORDER BY product_expiry_date;
```

**Get total inventory value:**
```sql
SELECT 
    category,
    COUNT(*) as item_count,
    SUM(quantity) as total_quantity,
    SUM(total_cost) as total_value
FROM branch_inventory
WHERE branch = 'Central Kitchen'
  AND inventory_date = (
    SELECT MAX(inventory_date) 
    FROM branch_inventory 
    WHERE branch = 'Central Kitchen'
  )
GROUP BY category
ORDER BY total_value DESC;
```

## Next Steps

### Adding More Branches

When you're ready to add the other branches (Soufouh, YAS, Sharja), you'll need to:

1. **Get the file IDs** (similar to how you got the Central Kitchen ID)
2. **Add to GitHub Secrets:**
   - `SHAREPOINT_BRANCH_SOUFOUH_FILE_ID`
   - `SHAREPOINT_BRANCH_YAS_FILE_ID`
   - `SHAREPOINT_BRANCH_SHARJA_FILE_ID`

3. **Update `sync-branch-inventory.js`** - Add configurations:
```javascript
soufouh: {
  fileIdEnv: 'SHAREPOINT_BRANCH_SOUFOUH_FILE_ID',
  tableName: 'branch_inventory',
  fileName: 'Branch_Mngt V_New_Soufouh.xlsb',
  sheetName: 'inventory',
  branch: 'Soufouh',
  // ... same columns and transform logic
},
// Similar for YAS and Sharja
```

4. **Test with .xlsb files** - The `.xlsb` format should work with the `xlsx` library, but test to confirm

## Monitoring

### Check Sync Logs

```sql
SELECT 
    file_name,
    started_at,
    completed_at,
    status,
    rows_processed,
    error_message,
    (completed_at - started_at) as duration
FROM sync_logs
WHERE file_name LIKE '%Central_Kitchen%'
ORDER BY started_at DESC
LIMIT 10;
```

### Check Latest Sync Status

```sql
SELECT 
    file_name,
    status,
    rows_processed,
    completed_at
FROM sync_logs
WHERE file_name = 'Branch_Daily_Closing Central_Kitchen.xlsx'
ORDER BY started_at DESC
LIMIT 1;
```

## Troubleshooting

### Issue: Sheet "inventory" not found

**Solution:** Check the exact sheet name in the Excel file (case-sensitive). Update `sheetName` in the config if needed.

### Issue: Column headers don't match

**Solution:** The script expects these exact header names:
- Inventory Date
- Item
- Category
- Quantity
- Unit
- Product Expiry Date
- Unit Cost
- Total Cost

If your Excel file has different headers, update the `transform` function in the script.

### Issue: Authentication failed

**Solution:** Verify that all SharePoint credentials in GitHub Secrets are correct and haven't expired.

### Issue: No data synced

**Solution:** Check that:
- The Excel file exists in SharePoint
- The file ID is correct
- The "inventory" sheet contains data
- Rows have both `inventory_date` and `item` values

## Files Created

- ✅ `scripts/create-branch-inventory-table.ts` - Database migration
- ✅ `scripts/sync-branch-inventory.js` - Sync script
- ✅ `.github/workflows/sync-branch-inventory.yml` - GitHub Action workflow
- ✅ `md files/BRANCH_INVENTORY_SETUP.md` - This documentation

## Status: Ready to Deploy! 🚀

The system is fully configured and ready to use. Test it by running the GitHub Action manually to verify everything works as expected.
