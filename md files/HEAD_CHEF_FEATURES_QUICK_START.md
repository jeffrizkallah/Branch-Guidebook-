# Head Chef Features - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Head Chef, Operations Lead, or Admin role
- Active production schedule in the system

---

## 📋 Feature Overview

You now have three powerful features to manage production:

1. **📅 Drag & Drop Rescheduling** - Move items between days
2. **⚖️ Quantity Adjustment** - Modify production amounts with auto-scaling
3. **🚨 Missing Ingredients Alerts** - Report issues to Central Kitchen

---

## 1️⃣ Rescheduling Production Items

### When to Use
- Ingredients not available today
- Kitchen at capacity
- Equipment unavailable
- Any reason to move production to another day

### How to Use

#### Option A: Calendar View (Recommended)
1. Navigate to **Head Chef Dashboard** (`/kitchen/head-chef`)
2. Click **"Calendar"** toggle (top-right)
3. Find the item you want to move
4. **Drag** it to the target day
5. Select reason in confirmation dialog
6. Click **"Confirm Reschedule"**

#### Option B: List View
Coming soon - currently calendar-only feature

### Tips
- Items show color-coded status:
  - **Green** = Completed (can't move)
  - **Blue** = Assigned to station
  - **Gray** = Not yet assigned
- Can't drag completed or started items
- All moves are logged for audit

---

## 2️⃣ Adjusting Production Quantities

### When to Use
- You have existing inventory
- Limited production capacity
- Not enough ingredients for full amount
- Need to reduce/increase production

### How to Use

#### For Unassigned Items
1. Go to **Head Chef Dashboard**
2. In **Unassigned Items** section
3. Find the item to adjust
4. Click **"Adjust"** button (scale icon)
5. Follow the modal workflow:

**If Existing Inventory:**
- Select "Existing Inventory" reason
- Enter amount in stock (e.g., "20")
- System auto-calculates: `100 - 20 = 80 KG` to produce
- Review preview
- Click **"Confirm Adjustment"**

**If Other Reason:**
- Select appropriate reason
- Manually enter adjusted quantity
- Add notes if needed
- Click **"Confirm Adjustment"**

#### For Assigned Items
1. Find item under station section
2. Click **"Adjust"** button
3. Same workflow as above
4. Station will see updated quantity when they view recipe

### What Happens
- ✅ Item shows orange "Adjusted" badge
- ✅ Recipe ingredients automatically scale
- ✅ Station sees correct quantities
- ✅ Original quantity tracked for records

### Example
```
Original Order: 100 KG Brownies
Current Inventory: 20 KG
Adjusted Production: 80 KG

Recipe automatically scales:
- Chocolate: 40 KG → 32 KG (0.8x)
- Flour: 20 KG → 16 KG (0.8x)
- Sugar: 30 KG → 24 KG (0.8x)
```

---

## 3️⃣ Reporting Missing Ingredients

### When to Use
- Ingredient completely missing
- Not enough of an ingredient
- Quality issue with ingredient
- Need Central Kitchen attention

### How to Use

1. Click **"View Recipe"** on any production item
2. Recipe modal opens
3. Click **"Report Missing"** tab
4. **Select missing ingredients:**
   - Use search bar to find specific items
   - Check boxes for missing items
   - Click "Select All" if many missing
5. **For each selected ingredient:**
   - Enter available quantity (if any)
   - Leave at "0" if completely missing
6. **Add notes** (optional but helpful)
7. Click **"Report to Central Kitchen"**

### What Happens
- ✅ Alert sent immediately to Central Kitchen
- ✅ Priority automatically calculated:
  - **HIGH**: Production tomorrow or 5+ missing items
  - **MEDIUM**: Production in 2-3 days
  - **LOW**: Production in 4+ days
- ✅ Item marked with red alert badge
- ✅ Central Kitchen can respond and resolve

### Central Kitchen Response Options
When Central Kitchen resolves your alert:
- **Ordered** - Ingredients on the way
- **In Stock Error** - Was actually in inventory
- **Substituted** - Using alternative ingredients
- **Rescheduled** - Production moved to when available
- **Cannot Fulfill** - Unable to produce this item

---

## 🎯 Complete Workflow Example

### Scenario: Tuesday Morning Production

#### Step 1: Review Daily Schedule
```
Tuesday's Items:
- Brownies 100 KG
- Chicken Curry 50 KG
- Pasta Sauce 30 KG
```

#### Step 2: Check Inventory
You discover:
- ✅ 20 KG Brownies already made
- ⚠️ Missing tomatoes for pasta sauce
- ✅ All curry ingredients available

#### Step 3: Adjust Brownies Quantity
1. Click "Adjust" on Brownies
2. Select "Existing Inventory"
3. Enter: `20 KG`
4. System shows: `100 - 20 = 80 KG to produce`
5. Confirm

#### Step 4: Report Missing Tomatoes
1. Click "View Recipe" on Pasta Sauce
2. Go to "Report Missing" tab
3. Search "tomatoes"
4. Check "Canned Tomatoes"
5. Enter available: `0 KG` (need 15 KG)
6. Add note: "Supplier delivery failed"
7. Submit alert

#### Step 5: Reschedule Pasta Sauce
1. Switch to Calendar view
2. Drag "Pasta Sauce 30 KG" from Tuesday to Wednesday
3. Select reason: "Missing Ingredients"
4. Confirm

#### Step 6: Assign Remaining Items
1. Switch back to List view
2. Assign "Brownies 80 KG" → Baker
3. Assign "Chicken Curry 50 KG" → Hot Section

#### Step 7: Monitor Alerts
- Central Kitchen sees your tomatoes alert
- They mark as "Ordered - arriving Wednesday morning"
- Wednesday's pasta sauce production can proceed

---

## 💡 Pro Tips

### Best Practices
1. **Check inventory first thing in the morning**
2. **Adjust quantities before assigning to stations**
3. **Report missing ingredients as soon as you notice**
4. **Use calendar view for week planning**
5. **Add detailed notes for better communication**

### Time Savers
- **Bulk adjustments**: Coming soon
- **Saved reasons**: Common reasons quick-select
- **Quick assign**: Select multiple → assign to station
- **Today button**: Jump back to today's view

### Keyboard Shortcuts
- `Tab` - Navigate between fields
- `Enter` - Confirm dialogs
- `Esc` - Close modals
- `Ctrl/Cmd + Click` - Multi-select (coming soon)

---

## 🎨 Visual Guide

### Item Status Colors
```
🟢 Green Border   = Completed
🔵 Blue Border    = Assigned/In Progress  
🟠 Orange Badge   = Quantity Adjusted
🔴 Red Badge      = Missing Ingredients Alert
🟣 Purple Badge   = Rescheduled from another day
```

### Button Icons
```
👁️  View Recipe
⚖️  Adjust Quantity
📅  Calendar View
📋  List View
🔄  Refresh Data
🖨️  Print Schedule
```

---

## ❓ Common Questions

### Q: Can I undo a reschedule?
**A:** Yes! Just drag the item back to the original day or use the calendar to move it again.

### Q: What if I adjust quantity wrong?
**A:** Click "Adjust" again and enter the correct amount. The system will update.

### Q: How fast does Central Kitchen see alerts?
**A:** Immediately! Their dashboard refreshes every 30 seconds, or they can click refresh.

### Q: Can I reschedule multiple items at once?
**A:** Not yet - coming in next version. For now, drag one at a time.

### Q: What if an ingredient is partially available?
**A:** Enter the available amount (e.g., "5 KG") instead of "0". System marks it as "Partially Available."

### Q: Can I cancel an ingredient alert?
**A:** Once submitted, only Central Kitchen can resolve it. If it was a mistake, add a note asking them to mark as "In Stock Error."

---

## 🐛 Troubleshooting

### Item Won't Drag
- **Issue**: Item appears locked
- **Solution**: Check if item is completed or already started. These can't be moved.

### Adjusted Quantity Not Showing
- **Issue**: Station doesn't see scaled ingredients
- **Solution**: Have them close and reopen the recipe. If persists, refresh dashboard.

### Alert Not Appearing
- **Issue**: Central Kitchen doesn't see your alert
- **Solution**: Wait 30 seconds for auto-refresh, or ask them to click "Refresh" button.

### Recipe Scale Seems Wrong
- **Issue**: Ingredients don't match adjusted quantity
- **Solution**: Check the recipe's base yield. System uses: `targetQty / baseYield = multiplier`

---

## 📞 Getting Help

### Need Assistance?
1. Check this guide first
2. Ask your Operations Lead
3. Contact IT support
4. Review full documentation: `HEAD_CHEF_PRODUCTION_FEATURES.md`

### Report Bugs
If something isn't working:
1. Note what you were doing
2. Take a screenshot if possible
3. Report to Operations Lead or IT
4. Include your user name and timestamp

---

## 🎓 Training Resources

### Video Tutorials (Coming Soon)
- 5-minute quick start
- Drag & drop rescheduling demo
- Quantity adjustment walkthrough
- Missing ingredients reporting

### Practice Environment
- Ask your admin for a test production schedule
- Practice all features without affecting real production
- Experiment with different scenarios

---

**Remember:** These features save time and improve communication. Use them every day!

**Questions?** Ask your Operations Lead or check the full documentation.

---

**Last Updated:** January 23, 2026
**Version:** 1.0.0
