# Automatic Ingredient Scaling for Kitchen Staff

## Overview

The kitchen staff (Head Chef and Station Staff) now have **automatic ingredient scaling** when viewing recipes. This feature eliminates the need for manual calculations when production quantities differ from the base recipe yield.

## How It Works

### Example: Brownies 1 KG

**Scenario:**
- Base recipe yields: **1 KG** of brownies
- Production schedule requires: **40 KG** of brownies
- **Scaling multiplier: 40×**

**Base Recipe Ingredients (for 1 KG):**
- Dark Chocolate: 300 GM
- Butter: 200 GM
- Sugar: 250 GM
- Eggs: 4 units
- Flour: 120 GM

**Automatically Scaled Ingredients (for 40 KG):**
- Dark Chocolate: **12,000 GM** (12 KG) ← base: 300 GM
- Butter: **8,000 GM** (8 KG) ← base: 200 GM
- Sugar: **10,000 GM** (10 KG) ← base: 250 GM
- Eggs: **160 units** ← base: 4 units
- Flour: **4,800 GM** (4.8 KG) ← base: 120 GM

## User Interface Features

### 1. Scaling Notice Banner (Blue Highlighted)
When viewing a recipe with scaling applied, a prominent blue banner appears at the top showing:
- The scaling multiplier (e.g., "×40")
- Your target quantity (e.g., "40 KG")
- The base recipe yield (e.g., "1 KG")

### 2. Visual Indicators
- **Scaled ingredient rows**: Light blue background
- **Scaled quantities**: Bold, larger text in blue
- **Base quantities**: Shown in small text below (e.g., "base: 300 GM")
- **Badge**: Shows "Scaled ×40" next to ingredient section headers

### 3. All Tabs Show Scaled Quantities
Automatic scaling applies to:
- ✅ **Ingredients Tab**: Main ingredients and legacy ingredients
- ✅ **Workflow Tab**: Sub-recipe ingredients
- ✅ **Header Badges**: Shows scaling multiplier

## For Station Staff

### When You Open a Recipe:

1. **Check the Blue Banner** at the top - it tells you immediately if ingredients are scaled
2. **Use the scaled quantities** (the big blue numbers) for your production
3. **Base quantities** are shown in small text for reference only

### Example Workflow:

1. You're assigned "Brownies 1 KG" - quantity: 40 KG
2. You tap "View Recipe" on your station tablet
3. The recipe opens with a **blue banner**: "Ingredients Automatically Scaled ×40"
4. You see:
   ```
   Dark Chocolate (70% cocoa)
   12,000 GM  ← USE THIS
   base: 300 GM
   ```
5. You use **12,000 GM** (12 KG) of chocolate - no calculations needed!

## For Head Chef

### Recipe Requirements:

For automatic scaling to work, recipes must have:
1. ✅ A **`yield`** field (e.g., "1 KG", "1 portion", "60 pieces")
2. ✅ **Numeric quantities** for ingredients
3. ✅ **Consistent units** between yield and production schedule

### Managing Recipes:

- Recipes without a `yield` field will show **no scaling** (multiplier = 1)
- Always set the yield to the **base recipe amount**
- Use consistent units (KG, GM, ML, pieces, etc.)

## Technical Details

### Calculation Formula:
```
Multiplier = Production Quantity ÷ Base Yield
Scaled Quantity = Base Ingredient Quantity × Multiplier
```

### Example Calculations:
```
Need: 40 KG
Base Yield: 1 KG
Multiplier: 40 ÷ 1 = 40

Base: 300 GM chocolate
Scaled: 300 × 40 = 12,000 GM
```

### Supported Units:
- Weight: GM, KG
- Volume: ML, L
- Count: pieces, units, portions
- Custom: any text (e.g., "1 Pizza (23cm)")

## Benefits

✅ **Saves Time**: No manual calculations needed
✅ **Reduces Errors**: Automatic calculation eliminates math mistakes
✅ **Improves Accuracy**: Precise scaling for all ingredients
✅ **Clear Communication**: Visual indicators show when scaling is applied
✅ **Maintains Quality**: Consistent proportions at any scale

## Troubleshooting

### Issue: "Quantities don't look scaled"

**Solution:**
- Check if the recipe has a `yield` field set
- Verify the yield matches the unit in production schedule
- If yield is missing, contact admin to update the recipe

### Issue: "Multiplier seems wrong"

**Solution:**
- Verify production schedule quantity is correct
- Check recipe yield is set to base amount (usually 1 KG, 1 portion, etc.)
- Ensure units match (both in KG or both in portions)

### Issue: "Base quantities not showing"

**Solution:**
- Base quantities only show when multiplier > 1
- If not scaling, you'll see original quantities without the base reference

## Examples of Recipes with Proper Yield

### Good Examples:
```json
{
  "name": "Brownies 1 KG",
  "yield": "1 KG",
  "mainIngredients": [
    { "name": "Flour", "quantity": 120, "unit": "GM" }
  ]
}
```

```json
{
  "name": "Fish Fillet Platter",
  "yield": "1 portion",
  "mainIngredients": [
    { "name": "Fish", "quantity": 200, "unit": "GM" }
  ]
}
```

### Bad Example (No Scaling):
```json
{
  "name": "Brownies",
  // Missing "yield" field!
  "mainIngredients": [
    { "name": "Flour", "quantity": 120, "unit": "GM" }
  ]
}
```

## Recent Updates

**January 2026:**
- ✅ Fixed fallback logic when `yield` is missing (now defaults to 1× instead of using production quantity)
- ✅ Added prominent blue banner to show scaling information
- ✅ Enhanced ingredient display with visual indicators (blue background, bold text)
- ✅ Added base quantity reference below scaled amounts
- ✅ Applied scaling to sub-recipes in workflow tab
- ✅ Created comprehensive Brownies 1 KG recipe as example

## Support

If you encounter issues with automatic scaling:
1. Check this guide first
2. Verify the recipe has proper `yield` field
3. Contact the Operations Lead or Admin for recipe updates
4. Report any calculation errors immediately

---

**Remember:** The system does the math for you - just use the big blue numbers! 🎯
