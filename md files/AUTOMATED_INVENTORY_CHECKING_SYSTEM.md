# Automated Inventory Checking System

## Overview

The Automated Inventory Checking System compares production schedule requirements against Central Kitchen inventory and automatically flags missing or insufficient ingredients to the head office. This eliminates manual inventory checking by the head chef and ensures proactive identification of shortages before production begins.

---

## Key Features

### ✅ Automated Ingredient Extraction
- Recursively extracts all ingredients from recipes (including sub-recipes)
- Scales quantities based on production requirements
- Handles adjusted quantities (when head chef has modified production amounts)
- Aggregates ingredients across multiple production items

### ✅ Intelligent Inventory Comparison
- Compares required ingredients against latest Central Kitchen inventory
- Fuzzy matching for ingredient names
- Unit standardization (converts KG/GM, L/ML automatically)
- Calculates shortfalls with percentage analysis

### ✅ Smart Shortage Detection
- **Status Classification:**
  - MISSING: 0 available
  - CRITICAL: >80% shortage
  - PARTIAL: 20-80% shortage
  - SUFFICIENT: Enough in stock

- **Priority Calculation:**
  - HIGH: Production ≤1 day OR completely missing OR critical shortage
  - MEDIUM: Production 2-3 days OR partial shortage
  - LOW: Production >3 days OR minor shortage

### ✅ Head Chef Dashboard
- Visual day-by-day inventory status (traffic light system)
- 🟢 Green: All ingredients available
- 🟡 Amber: Partial shortages
- 🔴 Red: Missing critical ingredients
- Expandable details for each day
- One-click inventory checks
- Detailed shortage breakdowns

### ✅ Central Kitchen Alert System
- Real-time shortage alerts
- Priority-sorted view (HIGH → MEDIUM → LOW)
- Detailed shortage information
- Resolution workflow with multiple action types
- Audit trail of resolutions

---

## System Architecture

### Database Tables

#### 1. `inventory_checks`
Stores history of all inventory checks performed.

```sql
- check_id: Unique check identifier
- schedule_id: Production schedule being checked
- production_dates: Array of dates being checked
- status: COMPLETED, FAILED, IN_PROGRESS
- total_ingredients_required: Total ingredient count
- missing_ingredients_count: Number missing/critical
- partial_ingredients_count: Number with partial shortages
- sufficient_ingredients_count: Number with sufficient stock
- overall_status: ALL_GOOD, PARTIAL_SHORTAGE, CRITICAL_SHORTAGE
- checked_by: User who ran the check (or 'system')
- check_type: MANUAL or AUTOMATIC
```

#### 2. `ingredient_shortages`
Stores specific ingredient shortages found in each check.

```sql
- shortage_id: Unique shortage identifier
- check_id: Links to inventory_checks
- schedule_id: Production schedule
- production_date: When ingredient is needed
- ingredient_name: Name from recipe
- inventory_item_name: Matched inventory item
- required_quantity: Amount needed
- available_quantity: Amount in stock
- shortfall_amount: Calculated shortage
- unit: Unit of measurement (GM, ML, UNIT)
- status: MISSING, PARTIAL, CRITICAL, SUFFICIENT
- priority: HIGH, MEDIUM, LOW
- affected_recipes: JSON array of recipe names
- affected_production_items: JSON array of production items
- resolution_status: PENDING, ACKNOWLEDGED, ORDERED, RESOLVED, CANNOT_FULFILL
- resolved_by: User who resolved
- resolved_at: Resolution timestamp
- resolution_action: ORDERED, IN_STOCK_ERROR, SUBSTITUTED, RESCHEDULED, CANCELLED
- resolution_notes: Details about resolution
```

#### 3. `ingredient_mappings`
Maps recipe ingredient names to inventory item names (for improved matching).

```sql
- mapping_id: Unique mapping identifier
- recipe_ingredient_name: Name as it appears in recipes
- inventory_item_name: Name as it appears in inventory
- category: Ingredient category
- unit_conversion_factor: For unit conversions
- base_unit: Standard unit to use
- aliases: JSON array of alternative names
- notes: Additional information
```

---

## Core Logic

### Ingredient Extraction Process

1. **Get Production Schedule**
   - Load schedule from database
   - Identify all production items for the week

2. **Extract Recipe Ingredients**
   - For each production item:
     - Load recipe from database
     - Extract main ingredients
     - For sub-recipe references, recursively extract their ingredients
     - Scale all quantities based on production amount (and adjusted quantity if applicable)

3. **Unit Standardization**
   - Convert all weights to grams (GM)
   - Convert all volumes to milliliters (ML)
   - Keep counts as UNIT
   - Apply conversion factors:
     - 1 KG = 1000 GM
     - 1 L = 1000 ML
     - 1 LB = 453.592 GM
     - etc.

4. **Aggregation**
   - Group ingredients by name and unit
   - Sum quantities across all production items
   - Track sources (which recipes use each ingredient)

### Inventory Comparison

1. **Get Latest Inventory**
   - Query `branch_inventory` table for Central Kitchen
   - Filter by most recent `inventory_date`
   - Load all items with quantities

2. **Match Ingredients**
   - For each required ingredient:
     - Try exact name match first
     - Check ingredient_mappings table
     - Fall back to fuzzy matching (contains/partial match)

3. **Calculate Shortfalls**
   - Convert inventory quantity to base unit
   - Compare: `shortfall = required - available`
   - Calculate percentage: `(shortfall / required) * 100`

4. **Classify Status & Priority**
   - Determine status based on availability
   - Calculate priority based on production date and severity
   - Only create shortage records for insufficient items

### Saving Results

1. **Create Check Record**
   - Generate unique check_id
   - Save check metadata to `inventory_checks` table
   - Record overall status and counts

2. **Create Shortage Records**
   - For each shortage, create record in `ingredient_shortages` table
   - Include all details: quantities, status, priority, affected recipes
   - Set initial resolution_status to PENDING

---

## API Endpoints

### POST `/api/inventory-check/run`
Run an inventory check for a production schedule.

**Request Body:**
```json
{
  "scheduleId": "week-2026-01-19",
  "userId": "1" // optional
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "checkId": "check-week-2026-01-19-1737789123456",
    "scheduleId": "week-2026-01-19",
    "productionDates": ["2026-01-19", "2026-01-20", ...],
    "overall": "CRITICAL_SHORTAGE",
    "totalIngredients": 150,
    "missing": 5,
    "partial": 12,
    "sufficient": 133,
    "shortages": [ /* array of shortage details */ ],
    "inventoryDate": "2026-01-25"
  }
}
```

### GET `/api/inventory-check/[scheduleId]`
Get the latest inventory check result for a schedule.

**Response:**
```json
{
  "success": true,
  "result": { /* same as above */ }
}
```

### GET `/api/inventory-shortages`
Get pending inventory shortages.

**Query Parameters:**
- `status` (default: PENDING) - Filter by resolution status
- `scheduleId` - Filter by specific schedule
- `priority` - Filter by priority level (HIGH, MEDIUM, LOW)

**Response:**
```json
{
  "success": true,
  "shortages": [ /* array of shortage records */ ]
}
```

### PATCH `/api/inventory-shortages/[shortageId]/resolve`
Resolve a specific shortage.

**Request Body:**
```json
{
  "resolutionStatus": "RESOLVED",
  "resolutionAction": "ORDERED",
  "resolutionNotes": "Ordered from supplier, arriving tomorrow",
  "resolvedBy": "1"
}
```

**Response:**
```json
{
  "success": true,
  "shortage": { /* updated shortage record */ }
}
```

---

## UI Components

### 1. InventoryStatusWidget (Head Chef Dashboard)
**Location:** Head Chef dashboard

**Features:**
- Shows overall inventory status summary
- Day-by-day breakdown with traffic light indicators
- Expandable sections for each day
- Detailed shortage information
- One-click "Run Check Now" button
- Visual progress indicators

**Usage:**
```tsx
import { InventoryStatusWidget } from '@/components/kitchen/InventoryStatusWidget'

<InventoryStatusWidget 
  scheduleId="week-2026-01-19"
  scheduleName="Week of Jan 19-24, 2026"
/>
```

### 2. InventoryShortageAlertsWidget (Central Kitchen Dashboard)
**Location:** Central Kitchen dashboard

**Features:**
- Real-time shortage alerts
- Priority-grouped view (HIGH/MEDIUM/LOW)
- Auto-refresh every 30 seconds
- Detailed shortage cards
- Resolution workflow modal
- Multiple resolution action types
- Notes field for resolution details

**Usage:**
```tsx
import { InventoryShortageAlertsWidget } from '@/components/kitchen/InventoryShortageAlertsWidget'

<InventoryShortageAlertsWidget />
```

---

## Setup Instructions

### 1. Create Database Tables

Run the migration script to create all necessary tables:

```bash
npx tsx scripts/create-inventory-check-tables.ts
```

This creates:
- `inventory_checks` table
- `ingredient_shortages` table
- `ingredient_mappings` table
- All necessary indexes

### 2. Add Components to Dashboards

**Head Chef Dashboard:**
```tsx
import { InventoryStatusWidget } from '@/components/kitchen/InventoryStatusWidget'

// In your dashboard page:
<InventoryStatusWidget 
  scheduleId={currentSchedule.scheduleId}
  scheduleName={currentSchedule.weekStart}
/>
```

**Central Kitchen Dashboard:**
```tsx
import { InventoryShortageAlertsWidget } from '@/components/kitchen/InventoryShortageAlertsWidget'

// In your dashboard page:
<InventoryShortageAlertsWidget />
```

### 3. Configure Ingredient Mappings (Optional)

For better ingredient matching, you can pre-populate the `ingredient_mappings` table:

```sql
INSERT INTO ingredient_mappings (
  mapping_id, 
  recipe_ingredient_name, 
  inventory_item_name,
  category,
  base_unit
) VALUES (
  'map-1',
  'Chocolate Chips',
  'Chocolate Chip 1KG',
  'Chocolate',
  'GM'
);
```

---

## Usage Workflow

### Head Chef Side

1. **View Production Schedule**
   - Open Head Chef dashboard
   - See current week's production schedule

2. **Check Inventory Status**
   - View "Production Inventory Status" widget
   - See day-by-day breakdown
   - Green days = all clear, Red days = shortages

3. **Review Shortages**
   - Click on days with warnings
   - Expand to see detailed shortage list
   - View which recipes are affected

4. **Take Action**
   - If shortages exist, details are automatically visible
   - Can manually run check with "Run Check Now" button
   - System automatically flags shortages to Central Kitchen

### Central Kitchen Side

1. **Monitor Alerts**
   - Open Central Kitchen dashboard
   - View "Inventory Shortage Alerts" widget
   - See all pending shortages sorted by priority

2. **Review Details**
   - Click "Resolve Shortage" on any alert
   - See full details: quantities, affected recipes, production dates
   - Review priority and status

3. **Resolve Shortage**
   - Select resolution action:
     - **Ordered**: Ingredients ordered from supplier
     - **In Stock Error**: Actually available, inventory was wrong
     - **Substituted**: Using alternative ingredient
     - **Rescheduled**: Production moved to different date
     - **Cancelled**: Cannot fulfill
   - Add notes explaining resolution
   - Click "Resolve Shortage"

4. **Track Resolution**
   - Alert removed from pending list
   - Resolution recorded in database
   - Head chef can see updated status

---

## Example Scenarios

### Scenario 1: Missing Ingredient Detected

**Monday Morning:**
1. System runs automatic check for upcoming week
2. Detects Chocolate Chips: Need 15 KG, Have 0 KG
3. Creates HIGH priority shortage (production tomorrow)
4. Appears on both Head Chef and Central Kitchen dashboards

**Head Chef:**
- Sees red indicator for Tuesday
- Views details: "Chocolate Chips - Missing"
- Knows production may be affected

**Central Kitchen:**
- Receives HIGH priority alert
- Checks warehouse, finds chocolate chips in back storage
- Marks as "Resolved - In Stock Error"
- Adds note: "Located in back storage, updating inventory"

**Result:**
- Alert resolved
- Production proceeds as planned
- Inventory sheet updated to reflect actual stock

### Scenario 2: Partial Shortage

**Wednesday:**
1. Check detects Butter: Need 25 KG, Have 15 KG
2. Creates MEDIUM priority shortage (10 KG short, 40%)
3. Flagged to Central Kitchen

**Central Kitchen:**
- Reviews alert
- Orders 15 KG from supplier (extra 5 KG buffer)
- Marks as "Resolved - Ordered"
- Adds note: "Order #1234, delivery Friday morning"

**Head Chef:**
- Sees status updated to "Ordered, arriving Friday"
- Can proceed with planning or reschedule if needed

### Scenario 3: Cannot Fulfill

**Thursday:**
1. Check detects specialty item completely missing
2. Central Kitchen investigates
3. Supplier out of stock, alternative not available
4. Marks as "Cannot Fulfill"

**Head Chef:**
- Receives notification
- Uses existing reschedule feature to move production
- Updates schedule accordingly

---

## Configuration Options

### Safety Buffers
Edit `lib/inventory-checker.ts` to adjust safety margins:

```typescript
// Add buffer percentage to required quantities
const bufferPercent = 0.05 // 5% buffer
const requiredWithBuffer = required * (1 + bufferPercent)
```

### Priority Thresholds
Adjust when shortages are marked as HIGH/MEDIUM/LOW:

```typescript
// Current logic:
if (daysUntilProduction <= 1 || status === 'MISSING') {
  priority = 'HIGH'
} else if (daysUntilProduction <= 3 || status === 'PARTIAL') {
  priority = 'MEDIUM'
}
```

### Auto-refresh Interval
Change how often alerts refresh:

```typescript
// In InventoryShortageAlertsWidget.tsx
const interval = setInterval(loadShortages, 30000) // 30 seconds
```

---

## Troubleshooting

### Ingredient Not Matching
**Problem:** Required ingredient not matching inventory item

**Solutions:**
1. Add entry to `ingredient_mappings` table
2. Check spelling/capitalization differences
3. Review fuzzy matching logic in `findInventoryMatch()`

### Wrong Quantities
**Problem:** Quantities seem incorrect

**Solutions:**
1. Verify recipe yield is correct
2. Check if sub-recipes are properly nested
3. Ensure units are standardized correctly
3. Verify adjusted quantities are being used

### Missing Recipes
**Problem:** "Recipe not found" in logs

**Solutions:**
1. Ensure recipe exists in `recipes` table
2. Check recipe name matches exactly
3. Run recipe migration if needed

### Stale Inventory Data
**Problem:** Inventory data is outdated

**Solutions:**
1. Run inventory sync manually
2. Check last sync date in inventory widget
3. Set up more frequent syncs (daily instead of weekly)

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Manual inventory checks
- ✅ Basic shortage detection
- ✅ Dashboard widgets
- ✅ Resolution workflow

### Phase 2 (Planned)
- [ ] Scheduled automatic checks (daily at 8 AM)
- [ ] Email notifications for HIGH priority shortages
- [ ] Batch resolution (resolve multiple shortages at once)
- [ ] Historical shortage analysis

### Phase 3 (Future)
- [ ] Predictive shortages (forecast based on trends)
- [ ] Integration with procurement system (auto-create POs)
- [ ] Supplier integration (check availability before alerting)
- [ ] Recipe substitution engine (suggest alternatives)
- [ ] Mobile app for warehouse staff
- [ ] Real-time inventory updates (barcode scanning)

---

## Technical Details

### Unit Conversions
All conversions in `lib/inventory-checker.ts`:
- Weight: Everything to grams (GM)
- Volume: Everything to milliliters (ML)
- Count: Kept as UNIT

### Fuzzy Matching Algorithm
1. Exact match (case-insensitive)
2. Check mappings table
3. Partial match (contains/includes)

### Performance Considerations
- Indexes on all foreign keys
- Batch processing for large schedules
- Caching of recipe data (database-level)
- Efficient aggregation algorithms

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review unresolved shortages
- Update ingredient mappings as needed
- Check for stale inventory data

**Monthly:**
- Analyze shortage patterns
- Optimize ingredient matching
- Review and archive old check records

**Quarterly:**
- Audit resolution accuracy
- Update unit conversions if needed
- Review and improve fuzzy matching

---

## Support & Documentation

### Key Files
- `/lib/inventory-checker.ts` - Core checking logic
- `/scripts/create-inventory-check-tables.ts` - Database setup
- `/app/api/inventory-check/` - API endpoints
- `/components/kitchen/InventoryStatusWidget.tsx` - Head Chef UI
- `/components/kitchen/InventoryShortageAlertsWidget.tsx` - Central Kitchen UI

### Database Queries

**Get all pending shortages:**
```sql
SELECT * FROM ingredient_shortages
WHERE resolution_status = 'PENDING'
ORDER BY priority DESC, created_at DESC;
```

**Get check history for a schedule:**
```sql
SELECT * FROM inventory_checks
WHERE schedule_id = 'week-2026-01-19'
ORDER BY check_date DESC;
```

**Most common missing ingredients:**
```sql
SELECT ingredient_name, COUNT(*) as shortage_count
FROM ingredient_shortages
WHERE resolution_status = 'RESOLVED'
GROUP BY ingredient_name
ORDER BY shortage_count DESC
LIMIT 10;
```

---

**Last Updated:** January 25, 2026
**Version:** 1.0.0
**Status:** Production Ready
