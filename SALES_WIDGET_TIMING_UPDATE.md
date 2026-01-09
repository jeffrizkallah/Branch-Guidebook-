# Sales Widget Timing Update

## Issue Resolved ✅

The Sales Snapshot widget was showing `0` for all metrics because it was querying for "today's" data, but since data syncs at **12:00 AM daily via GitHub Actions**, today's data doesn't exist yet.

## Solution

Changed the widget to display **yesterday's data** instead, which is the most recent synced data available.

## Changes Made

### API Endpoint (`app/api/analytics/summary/route.ts`)

**Before:**
```sql
-- Queried for today's data (empty until midnight sync)
WHERE date = CURRENT_DATE
```

**After:**
```sql
-- Queries for yesterday's data (most recent synced)
WHERE date = CURRENT_DATE - INTERVAL '1 day'
```

### UI Labels (`app/admin/page.tsx`)

**Before:**
- "Today's Revenue"
- "Units Sold Today"
- "Orders Today"
- "vs yesterday"

**After:**
- "Yesterday's Revenue"
- "Units Sold Yesterday"
- "Orders Yesterday"
- "vs day before"

### Added Sync Info

Added a subtitle to the widget:
```
"Showing yesterday's data • Synced daily at 12:00 AM"
```

This helps users understand why they're seeing yesterday's data.

## Data Flow Timeline

```
Day 1 (Jan 8)
├─ Business operations happen
├─ Sales recorded in Odoo
└─ 11:59 PM - End of day

Day 2 (Jan 9)
├─ 12:00 AM - GitHub Action runs
├─ 12:01 AM - Data synced to database
├─ 12:02 AM - Jan 8 data now available
└─ Throughout the day:
    ├─ Widget shows "Yesterday's Revenue" (Jan 8)
    ├─ Comparison: vs Jan 7 ("day before")
    └─ This Month: All days up to Jan 8

Day 2 (Jan 9) - Midnight
├─ 12:00 AM - GitHub Action runs
├─ 12:01 AM - Data synced to database
├─ 12:02 AM - Jan 9 data now available
└─ Jan 10 onwards: Widget shows Jan 9 data
```

## Widget Display Example

**Current Time: Jan 9, 10:00 AM**

```
┌─────────────────────────────────────────────────┐
│ 📊 Sales Snapshot                     [Analytics]│
│ Showing yesterday's data • Synced daily at 12AM │
├─────────────────────────────────────────────────┤
│                                                  │
│ Yesterday's Revenue          This Month         │
│ AED 15,420                  AED 255K            │
│ ↑ +12.5% vs day before      ↑ +172% vs last mo │
│                                                  │
│ Units Sold Yesterday        Orders Yesterday    │
│ 245                         89                  │
│ ↑ +8.3% vs day before       ↓ -5.2% vs day bef │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Technical Details

### SQL Query Changes

**Yesterday's Data (Main Display):**
```sql
SELECT 
  COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
  COALESCE(SUM(qty), 0) as units,
  COUNT(DISTINCT order_number) as orders
FROM odoo_sales
WHERE date = CURRENT_DATE - INTERVAL '1 day'
```

**Day Before Yesterday (For Comparison):**
```sql
SELECT 
  COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
  COALESCE(SUM(qty), 0) as units,
  COUNT(DISTINCT order_number) as orders
FROM odoo_sales
WHERE date = CURRENT_DATE - INTERVAL '2 days'
```

### Percentage Calculation

```javascript
// Shows change from day before yesterday to yesterday
changes: {
  revenue: calcChange(yesterday.revenue, twoDaysAgo.revenue),
  units: calcChange(yesterday.units, twoDaysAgo.units),
  orders: calcChange(yesterday.orders, twoDaysAgo.orders)
}
```

## Why This Works Better

### ✅ Advantages

1. **Always Shows Real Data**
   - Yesterday's data is guaranteed to be synced
   - No more confusing `0` values during the day

2. **More Accurate for Decision Making**
   - Complete 24-hour period data
   - Not showing partial day data

3. **Consistent with Sync Schedule**
   - Aligns with your 12 AM sync timing
   - Users understand the lag

4. **Still Near Real-Time**
   - Only 1 day delay
   - Acceptable for most business decisions

### 🤔 Alternative Approaches Considered

1. **Show Today's Data (Original)**
   - ❌ Shows 0 until midnight
   - ❌ Confusing for users

2. **Show Latest Available Day**
   - ✅ Most flexible
   - ❌ More complex logic
   - ❌ Date label changes dynamically

3. **Show Yesterday + Auto-Refresh**
   - ✅ Current solution
   - ✅ Simple and clear
   - ✅ Works with sync schedule

## Impact on Other Pages

### Admin Analytics Page

The full analytics page (`/admin/analytics`) may need similar updates if it also shows "Today" data. Consider:

1. Updating labels to "Yesterday" 
2. Adjusting date ranges in trend charts
3. Keeping "This Month" as is (works correctly)

### Branch-Level Analytics

Branch-level sales views should also be reviewed for consistency.

## Testing

### Verify the Fix Works

1. **Before Midnight (e.g., Jan 9, 5:00 PM)**
   ```
   Expected: Shows Jan 8 data
   Label: "Yesterday's Revenue"
   Comparison: "vs day before" (Jan 7)
   ```

2. **After Midnight (e.g., Jan 10, 1:00 AM)**
   ```
   Expected: Shows Jan 9 data
   Label: "Yesterday's Revenue"
   Comparison: "vs day before" (Jan 8)
   ```

3. **This Month Totals**
   ```
   Should include all days from start of month to yesterday
   ```

### Test Queries

Run these in your database to verify:

```sql
-- Check yesterday's data exists
SELECT 
  date,
  COUNT(*) as records,
  SUM(price_subtotal_with_tax) as total_revenue
FROM odoo_sales
WHERE date = CURRENT_DATE - INTERVAL '1 day'
GROUP BY date;

-- Check day before yesterday for comparison
SELECT 
  date,
  COUNT(*) as records,
  SUM(price_subtotal_with_tax) as total_revenue
FROM odoo_sales
WHERE date = CURRENT_DATE - INTERVAL '2 days'
GROUP BY date;
```

## Future Enhancements

### Option 1: Real-Time Today Data (If Needed)

If you want to show today's data in real-time:

1. Set up real-time sync from Odoo
2. Use webhooks or continuous ETL
3. Update widget to show "Today (Live)"
4. Add last updated timestamp

### Option 2: Dual Display

Show both yesterday and today:

```
Yesterday: AED 15,420 (Complete)
Today: AED 8,200 (As of 10:00 AM)
```

### Option 3: Smart Label

Dynamic label based on data availability:

```javascript
const hasToday = todayData.revenue > 0
const label = hasToday ? "Today's Revenue" : "Yesterday's Revenue"
```

## Deployment Notes

✅ No database migrations needed  
✅ No breaking changes  
✅ Backward compatible  
✅ Works with existing GitHub Actions sync  

Just deploy and the widget will start showing yesterday's data immediately.

## Summary

The widget now shows **yesterday's data by default** because:
- Data syncs at 12 AM daily
- Today's data isn't available yet
- Yesterday is the most recent complete dataset
- This aligns with your sync schedule

Users will see consistent, reliable data throughout the day! 🎉

