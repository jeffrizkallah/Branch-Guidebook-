/**
 * Core logic for automated inventory checking
 * 
 * This module handles:
 * - Extracting ingredients from production schedules
 * - Scaling quantities based on production requirements
 * - Comparing against inventory
 * - Detecting shortages
 * - Generating reports
 */

import { sql } from '@vercel/postgres'

// Unit conversion factors to base units (GM for weight, ML for volume)
const UNIT_CONVERSIONS: Record<string, { toBase: number; baseUnit: string }> = {
  // Weight conversions to grams (GM)
  'GM': { toBase: 1, baseUnit: 'GM' },
  'G': { toBase: 1, baseUnit: 'GM' },
  'KG': { toBase: 1000, baseUnit: 'GM' },
  'LB': { toBase: 453.592, baseUnit: 'GM' },
  'OZ': { toBase: 28.3495, baseUnit: 'GM' },
  
  // Volume conversions to milliliters (ML)
  'ML': { toBase: 1, baseUnit: 'ML' },
  'L': { toBase: 1000, baseUnit: 'ML' },
  'LITER': { toBase: 1000, baseUnit: 'ML' },
  'LITRE': { toBase: 1000, baseUnit: 'ML' },
  'CUP': { toBase: 240, baseUnit: 'ML' },
  'TBSP': { toBase: 15, baseUnit: 'ML' },
  'TSP': { toBase: 5, baseUnit: 'ML' },
  
  // Count (no conversion)
  'UNIT': { toBase: 1, baseUnit: 'UNIT' },
  'PIECE': { toBase: 1, baseUnit: 'UNIT' },
  'EA': { toBase: 1, baseUnit: 'UNIT' },
  'UNITS': { toBase: 1, baseUnit: 'UNIT' },
}

interface FlattenedIngredient {
  name: string
  quantity: number
  unit: string
  baseQuantity: number // Quantity in base unit (GM/ML/UNIT)
  baseUnit: string
  sourceRecipe: string
  sourceProductionItem: string
}

interface AggregatedIngredient {
  name: string
  totalQuantity: number
  unit: string
  baseQuantity: number
  baseUnit: string
  sources: Array<{
    recipe: string
    productionItem: string
    quantity: number
  }>
}

interface InventoryItem {
  item: string
  quantity: number
  unit: string
  inventory_date: string
}

interface ShortageResult {
  ingredient: string
  inventoryItem: string | null
  required: number
  available: number
  shortfall: number
  unit: string
  status: 'MISSING' | 'PARTIAL' | 'CRITICAL' | 'SUFFICIENT'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  affectedRecipes: string[]
  affectedItems: string[]
  productionDate: string
}

interface CheckResult {
  checkId: string
  scheduleId: string
  productionDates: string[]
  overall: 'ALL_GOOD' | 'PARTIAL_SHORTAGE' | 'CRITICAL_SHORTAGE'
  totalIngredients: number
  missing: number
  partial: number
  sufficient: number
  shortages: ShortageResult[]
  inventoryDate: string | null
}

/**
 * Normalize unit names to standard format
 */
function normalizeUnit(unit: string): string {
  return unit.trim().toUpperCase()
}

/**
 * Convert quantity to base unit (GM/ML/UNIT)
 */
function convertToBaseUnit(quantity: number, unit: string): { baseQuantity: number; baseUnit: string } {
  const normalizedUnit = normalizeUnit(unit)
  const conversion = UNIT_CONVERSIONS[normalizedUnit]
  
  if (!conversion) {
    // Unknown unit - keep as is
    console.warn(`Unknown unit: ${unit}, keeping original`)
    return { baseQuantity: quantity, baseUnit: normalizedUnit }
  }
  
  const baseQuantity = quantity * conversion.toBase
  
  // Safety check: Cap extremely large values (max 100 billion)
  // This prevents database overflow while still allowing realistic quantities
  if (baseQuantity > 100_000_000_000) {
    console.warn(`Extremely large quantity detected: ${baseQuantity} ${conversion.baseUnit}, capping at 100 billion`)
    return {
      baseQuantity: 100_000_000_000,
      baseUnit: conversion.baseUnit
    }
  }
  
  return {
    baseQuantity,
    baseUnit: conversion.baseUnit
  }
}

/**
 * Extract and flatten all ingredients from a recipe (including sub-recipes recursively)
 * Works with odoo_recipe table structure
 */
async function extractRecipeIngredients(
  recipeName: string,
  productionQuantity: number,
  productionItemName: string,
  depth: number = 0,
  maxDepth: number = 10,
  visitedItems: Set<string> = new Set()
): Promise<FlattenedIngredient[]> {
  const ingredients: FlattenedIngredient[] = []
  
  // Prevent infinite recursion
  if (depth >= maxDepth || visitedItems.has(recipeName)) {
    return []
  }
  
  visitedItems.add(recipeName)
  
  // Fetch ingredients for this recipe from odoo_recipe table
  const result = await sql`
    SELECT 
      r.ingredient_name,
      r.item_type,
      r.quantity,
      r.unit
    FROM odoo_recipe r
    WHERE r.item = ${recipeName}
    ORDER BY r.item_type DESC, r.ingredient_name
  `
  
  if (result.rows.length === 0) {
    return []
  }
  
  // Assume recipe yields 1 unit (standard for odoo recipes)
  // productionQuantity is the multiplier
  const multiplier = productionQuantity
  
  for (const row of result.rows) {
    const ingredientQuantity = parseFloat(row.quantity) || 0
    const scaledQuantity = ingredientQuantity * multiplier
    
    // Check if this is a subrecipe
    if (row.item_type === 'subrecipe') {
      // Recursively extract subrecipe ingredients
      const subIngredients = await extractRecipeIngredients(
        row.ingredient_name,
        scaledQuantity,
        productionItemName,
        depth + 1,
        maxDepth,
        new Set(visitedItems) // Create a copy to allow branching paths
      )
      
      // Mark these as coming from a subrecipe
      for (const subIng of subIngredients) {
        ingredients.push({
          ...subIng,
          sourceRecipe: `${recipeName} > ${subIng.sourceRecipe}`,
        })
      }
    } else {
      // Regular ingredient
      const { baseQuantity, baseUnit } = convertToBaseUnit(scaledQuantity, row.unit)
      
      ingredients.push({
        name: row.ingredient_name,
        quantity: scaledQuantity,
        unit: row.unit,
        baseQuantity,
        baseUnit,
        sourceRecipe: recipeName,
        sourceProductionItem: productionItemName
      })
    }
  }
  
  return ingredients
}

/**
 * Aggregate ingredients across multiple production items
 */
function aggregateIngredients(ingredients: FlattenedIngredient[]): AggregatedIngredient[] {
  const aggregated = new Map<string, AggregatedIngredient>()
  
  for (const ingredient of ingredients) {
    // Create a key based on ingredient name and base unit
    const key = `${ingredient.name.toLowerCase()}:${ingredient.baseUnit}`
    
    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!
      existing.baseQuantity += ingredient.baseQuantity
      existing.totalQuantity += ingredient.quantity
      existing.sources.push({
        recipe: ingredient.sourceRecipe,
        productionItem: ingredient.sourceProductionItem,
        quantity: ingredient.quantity
      })
    } else {
      aggregated.set(key, {
        name: ingredient.name,
        totalQuantity: ingredient.quantity,
        unit: ingredient.unit,
        baseQuantity: ingredient.baseQuantity,
        baseUnit: ingredient.baseUnit,
        sources: [{
          recipe: ingredient.sourceRecipe,
          productionItem: ingredient.sourceProductionItem,
          quantity: ingredient.quantity
        }]
      })
    }
  }
  
  return Array.from(aggregated.values())
}

/**
 * Find matching inventory item (with fuzzy matching)
 */
async function findInventoryMatch(
  ingredientName: string,
  inventory: InventoryItem[]
): Promise<InventoryItem | null> {
  const normalized = ingredientName.toLowerCase().trim()
  
  // First, try exact match
  let match = inventory.find(item => item.item.toLowerCase().trim() === normalized)
  if (match) return match
  
  // Try checking ingredient mappings table
  try {
    const mappingResult = await sql`
      SELECT inventory_item_name
      FROM ingredient_mappings
      WHERE LOWER(recipe_ingredient_name) = ${normalized}
    `
    
    if (mappingResult.rows.length > 0) {
      const mappedName = mappingResult.rows[0].inventory_item_name
      match = inventory.find(item => 
        item.item.toLowerCase().trim() === mappedName.toLowerCase().trim()
      )
      if (match) return match
    }
  } catch (error) {
    // Table might not exist yet or other error - continue with fuzzy match
  }
  
  // Fuzzy match - check if ingredient name contains inventory item name or vice versa
  match = inventory.find(item => {
    const itemName = item.item.toLowerCase().trim()
    return normalized.includes(itemName) || itemName.includes(normalized)
  })
  
  return match || null
}

/**
 * Compare required ingredients against inventory
 */
async function compareWithInventory(
  requiredIngredients: AggregatedIngredient[],
  productionDate: string
): Promise<{ shortages: ShortageResult[]; inventoryDate: string | null }> {
  // Get latest inventory for Central Kitchen
  const inventoryResult = await sql`
    SELECT 
      item,
      quantity,
      unit,
      inventory_date
    FROM branch_inventory
    WHERE branch = 'Central Kitchen'
      AND inventory_date = (
        SELECT MAX(inventory_date)
        FROM branch_inventory
        WHERE branch = 'Central Kitchen'
      )
  `
  
  const inventory = inventoryResult.rows as InventoryItem[]
  const inventoryDate = inventory.length > 0 ? inventory[0].inventory_date : null
  const shortages: ShortageResult[] = []
  
  // Calculate days until production
  const today = new Date()
  const prodDate = new Date(productionDate)
  const daysUntilProduction = Math.ceil((prodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  for (const ingredient of requiredIngredients) {
    const inventoryItem = await findInventoryMatch(ingredient.name, inventory)
    
    let availableQuantity = 0
    let availableBaseQuantity = 0
    
    if (inventoryItem) {
      availableQuantity = inventoryItem.quantity
      const { baseQuantity } = convertToBaseUnit(availableQuantity, inventoryItem.unit)
      availableBaseQuantity = baseQuantity
    }
    
    const shortfall = ingredient.baseQuantity - availableBaseQuantity
    const shortfallPercent = (shortfall / ingredient.baseQuantity) * 100
    
    // Determine status
    let status: 'MISSING' | 'PARTIAL' | 'CRITICAL' | 'SUFFICIENT'
    if (availableBaseQuantity === 0) {
      status = 'MISSING'
    } else if (shortfall > 0) {
      if (shortfallPercent >= 80) {
        status = 'CRITICAL'
      } else {
        status = 'PARTIAL'
      }
    } else {
      status = 'SUFFICIENT'
    }
    
    // Determine priority
    let priority: 'HIGH' | 'MEDIUM' | 'LOW'
    if (daysUntilProduction <= 1 || status === 'MISSING' || status === 'CRITICAL') {
      priority = 'HIGH'
    } else if (daysUntilProduction <= 3 || status === 'PARTIAL') {
      priority = 'MEDIUM'
    } else {
      priority = 'LOW'
    }
    
    // Only add to shortages if there's actually a shortage
    if (status !== 'SUFFICIENT') {
      shortages.push({
        ingredient: ingredient.name,
        inventoryItem: inventoryItem?.item || null,
        required: Math.round(ingredient.baseQuantity * 100) / 100,
        available: Math.round(availableBaseQuantity * 100) / 100,
        shortfall: Math.round(shortfall * 100) / 100,
        unit: ingredient.baseUnit,
        status,
        priority,
        affectedRecipes: [...new Set(ingredient.sources.map(s => s.recipe))],
        affectedItems: [...new Set(ingredient.sources.map(s => s.productionItem))],
        productionDate
      })
    }
  }
  
  return { shortages, inventoryDate }
}

/**
 * Main function: Run inventory check for a production schedule
 */
export async function runInventoryCheck(scheduleId: string, userId?: string): Promise<CheckResult> {
  console.log(`🔍 Running inventory check for schedule: ${scheduleId}`)
  
  // Get production schedule
  const scheduleResult = await sql`
    SELECT schedule_data
    FROM production_schedules
    WHERE schedule_id = ${scheduleId}
  `
  
  if (scheduleResult.rows.length === 0) {
    throw new Error(`Production schedule not found: ${scheduleId}`)
  }
  
  const schedule = scheduleResult.rows[0].schedule_data
  const productionDates: string[] = []
  const allShortages: ShortageResult[] = []
  let totalIngredients = 0
  let inventoryDate: string | null = null
  
  // Process each day separately to get accurate per-day shortages
  for (const day of schedule.days) {
    productionDates.push(day.date)
    const dayIngredients: FlattenedIngredient[] = []
    
    // Extract ingredients for this specific day
    for (const item of day.items) {
      // Check if recipe exists in odoo_recipe table
      const recipeCheck = await sql`
        SELECT COUNT(*) as count
        FROM odoo_recipe
        WHERE item = ${item.recipeName}
      `
      
      if (recipeCheck.rows[0].count === '0') {
        console.warn(`Recipe not found: ${item.recipeName}`)
        continue
      }
      
      // Use adjusted quantity if available, otherwise use regular quantity
      const productionQuantity = item.adjustedQuantity || item.quantity
      
      // Extract and flatten ingredients (will recursively handle subrecipes)
      const ingredients = await extractRecipeIngredients(
        item.recipeName,
        productionQuantity,
        item.recipeName
      )
      dayIngredients.push(...ingredients)
    }
    
    // Aggregate ingredients for this day only
    const aggregated = aggregateIngredients(dayIngredients)
    totalIngredients += aggregated.length
    
    // Compare this day's requirements with inventory
    const { shortages, inventoryDate: invDate } = await compareWithInventory(aggregated, day.date)
    
    // Keep track of inventory date from first check
    if (!inventoryDate && invDate) {
      inventoryDate = invDate
    }
    
    // Add this day's shortages to the overall list
    allShortages.push(...shortages)
  }
  
  console.log(`📦 Extracted ingredients for ${productionDates.length} days`)
  console.log(`📊 Total unique ingredient checks: ${totalIngredients}`)
  
  // Use allShortages instead of shortages from single day
  const shortages = allShortages
  
  // Calculate overall status
  const missing = shortages.filter(s => s.status === 'MISSING' || s.status === 'CRITICAL').length
  const partial = shortages.filter(s => s.status === 'PARTIAL').length
  const sufficient = totalIngredients - shortages.length
  
  let overallStatus: 'ALL_GOOD' | 'PARTIAL_SHORTAGE' | 'CRITICAL_SHORTAGE'
  if (missing > 0) {
    overallStatus = 'CRITICAL_SHORTAGE'
  } else if (partial > 0) {
    overallStatus = 'PARTIAL_SHORTAGE'
  } else {
    overallStatus = 'ALL_GOOD'
  }
  
  // Generate check ID
  const checkId = `check-${scheduleId}-${Date.now()}`
  
  // Save check to database
  await sql`
    INSERT INTO inventory_checks (
      check_id, schedule_id, production_dates, status, 
      total_ingredients_required, missing_ingredients_count,
      partial_ingredients_count, sufficient_ingredients_count,
      overall_status, checked_by, check_type
    ) VALUES (
      ${checkId}, ${scheduleId}, ${JSON.stringify(productionDates)}, 'COMPLETED',
      ${totalIngredients}, ${missing}, ${partial}, ${sufficient},
      ${overallStatus}, ${userId || 'system'}, ${userId ? 'MANUAL' : 'AUTOMATIC'}
    )
  `
  
  // Save shortages to database
  for (const shortage of shortages) {
    const shortageId = `shortage-${checkId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    await sql`
      INSERT INTO ingredient_shortages (
        shortage_id, check_id, schedule_id, production_date,
        ingredient_name, inventory_item_name, required_quantity,
        available_quantity, shortfall_amount, unit, status, priority,
        affected_recipes, affected_production_items, resolution_status
      ) VALUES (
        ${shortageId}, ${checkId}, ${scheduleId}, ${shortage.productionDate},
        ${shortage.ingredient}, ${shortage.inventoryItem}, ${shortage.required},
        ${shortage.available}, ${shortage.shortfall}, ${shortage.unit},
        ${shortage.status}, ${shortage.priority},
        ${JSON.stringify(shortage.affectedRecipes)},
        ${JSON.stringify(shortage.affectedItems)},
        'PENDING'
      )
    `
  }
  
  console.log(`✅ Check complete: ${overallStatus} (${missing} missing, ${partial} partial, ${sufficient} sufficient)`)
  
  return {
    checkId,
    scheduleId,
    productionDates,
    overall: overallStatus,
    totalIngredients,
    missing,
    partial,
    sufficient,
    shortages,
    inventoryDate
  }
}

/**
 * Get latest check result for a schedule
 */
export async function getLatestCheck(scheduleId: string): Promise<CheckResult | null> {
  const checkResult = await sql`
    SELECT *
    FROM inventory_checks
    WHERE schedule_id = ${scheduleId}
    ORDER BY check_date DESC
    LIMIT 1
  `
  
  if (checkResult.rows.length === 0) {
    return null
  }
  
  const check = checkResult.rows[0]
  
  // Get shortages for this check
  const shortagesResult = await sql`
    SELECT *
    FROM ingredient_shortages
    WHERE check_id = ${check.check_id}
    ORDER BY priority DESC, shortfall_amount DESC
  `
  
  const shortages: any[] = shortagesResult.rows.map(row => ({
    shortage_id: row.shortage_id,
    ingredient_name: row.ingredient_name,
    inventory_item_name: row.inventory_item_name,
    required_quantity: parseFloat(row.required_quantity) || 0,
    available_quantity: parseFloat(row.available_quantity) || 0,
    shortfall_amount: parseFloat(row.shortfall_amount) || 0,
    unit: row.unit,
    status: row.status,
    priority: row.priority,
    affected_recipes: row.affected_recipes,
    affected_production_items: row.affected_production_items,
    production_date: row.production_date
  }))
  
  return {
    checkId: check.check_id,
    scheduleId: check.schedule_id,
    productionDates: check.production_dates,
    overall: check.overall_status,
    totalIngredients: check.total_ingredients_required,
    missing: check.missing_ingredients_count,
    partial: check.partial_ingredients_count,
    sufficient: check.sufficient_ingredients_count,
    shortages,
    inventoryDate: null // We'll need to fetch this separately if needed
  }
}
