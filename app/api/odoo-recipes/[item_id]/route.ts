import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

interface Ingredient {
  ingredient_name: string
  item_type: 'ingredient' | 'subrecipe'
  quantity: number
  unit: string
  unit_cost: number
  ingredient_total_cost: number
  notes: string | null
  barcode: string | null
  // For subrecipes
  subrecipe_item_id?: number
  subrecipe_ingredients?: Ingredient[]
}

interface RecipeDetail {
  item_id: number
  item: string
  category: string
  product_group: string
  recipe_total_cost: number
  ingredients: Ingredient[]
  // Linked recipe instructions (if exists)
  linked_instructions?: {
    recipe_id: string
    name: string
  } | null
}

/**
 * Recursively fetch ingredients for a recipe, resolving subrecipes
 * @param itemName The recipe/item name to fetch ingredients for
 * @param depth Current recursion depth (to prevent infinite loops)
 * @param maxDepth Maximum recursion depth (default 10)
 * @param visitedItems Set of already visited items to prevent circular references
 */
async function fetchIngredientsWithSubrecipes(
  itemName: string,
  depth: number = 0,
  maxDepth: number = 10,
  visitedItems: Set<string> = new Set()
): Promise<Ingredient[]> {
  // Prevent infinite recursion
  if (depth >= maxDepth || visitedItems.has(itemName)) {
    return []
  }

  visitedItems.add(itemName)

  // Fetch ingredients for this recipe
  const result = await sql`
    SELECT 
      r.ingredient_name,
      r.item_type,
      r.quantity,
      r.unit,
      r.unit_cost,
      r.ingredient_total_cost,
      r.notes,
      r.barcode,
      l.item_id as subrecipe_item_id
    FROM odoo_recipe r
    LEFT JOIN recipe_items_lookup l ON r.ingredient_name = l.item_name
    WHERE r.item = ${itemName}
    ORDER BY r.item_type DESC, r.ingredient_name
  `

  const ingredients: Ingredient[] = []

  for (const row of result.rows) {
    const ingredient: Ingredient = {
      ingredient_name: row.ingredient_name,
      item_type: row.item_type || 'ingredient',
      quantity: parseFloat(row.quantity) || 0,
      unit: row.unit || '',
      unit_cost: parseFloat(row.unit_cost) || 0,
      ingredient_total_cost: parseFloat(row.ingredient_total_cost) || 0,
      notes: row.notes,
      barcode: row.barcode,
    }

    // If this is a subrecipe, recursively fetch its ingredients
    if (row.item_type === 'subrecipe' && row.subrecipe_item_id) {
      ingredient.subrecipe_item_id = row.subrecipe_item_id
      ingredient.subrecipe_ingredients = await fetchIngredientsWithSubrecipes(
        row.ingredient_name,
        depth + 1,
        maxDepth,
        new Set(visitedItems) // Create a copy to allow branching paths
      )
    }

    ingredients.push(ingredient)
  }

  return ingredients
}

/**
 * Find linked recipe instructions using fuzzy name matching
 */
async function findLinkedInstructions(itemName: string): Promise<{ recipe_id: string; name: string } | null> {
  try {
    // Normalize the item name for matching
    const normalizedName = itemName
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()

    console.log('[DEBUG] findLinkedInstructions called with:', itemName)
    console.log('[DEBUG] Normalized name:', normalizedName)
    console.log('[DEBUG] POSTGRES_URL exists:', !!process.env.POSTGRES_URL)

    // Try exact match first
    const exactResult = await sql`
      SELECT recipe_id, recipe_data->>'name' as name
      FROM recipes
      WHERE LOWER(recipe_data->>'name') = ${normalizedName}
      LIMIT 1
    `

    console.log('[DEBUG] Exact match rows:', exactResult.rows.length, exactResult.rows)

    if (exactResult.rows.length > 0) {
      return {
        recipe_id: exactResult.rows[0].recipe_id,
        name: exactResult.rows[0].name,
      }
    }

    // Try partial match (item name contains instruction name or vice versa)
    const fuzzyResult = await sql`
      SELECT recipe_id, recipe_data->>'name' as name
      FROM recipes
      WHERE 
        LOWER(recipe_data->>'name') LIKE ${`%${normalizedName}%`}
        OR ${normalizedName} LIKE CONCAT('%', LOWER(recipe_data->>'name'), '%')
      ORDER BY 
        CASE 
          WHEN LOWER(recipe_data->>'name') = ${normalizedName} THEN 0
          ELSE LENGTH(recipe_data->>'name')
        END
      LIMIT 1
    `

    if (fuzzyResult.rows.length > 0) {
      return {
        recipe_id: fuzzyResult.rows[0].recipe_id,
        name: fuzzyResult.rows[0].name,
      }
    }

    return null
  } catch (error) {
    console.error('Error finding linked instructions:', error)
    return null
  }
}

/**
 * GET /api/odoo-recipes/[item_id]
 * 
 * Returns a single recipe with all ingredients, including resolved subrecipes
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ item_id: string }> }
) {
  try {
    const { item_id } = await params
    const itemId = parseInt(item_id)

    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid item_id' },
        { status: 400 }
      )
    }

    // Get the recipe basic info
    const recipeResult = await sql`
      SELECT 
        item_id,
        item,
        MAX(category) as category,
        MAX(product_group) as product_group,
        MAX(recipe_total_cost) as recipe_total_cost
      FROM odoo_recipe
      WHERE item_id = ${itemId}
      GROUP BY item_id, item
    `

    if (recipeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    const recipe = recipeResult.rows[0]

    // Fetch ingredients with resolved subrecipes
    const ingredients = await fetchIngredientsWithSubrecipes(recipe.item)

    // Find linked recipe instructions
    const linkedInstructions = await findLinkedInstructions(recipe.item)
    
    console.log('[DEBUG] Recipe item:', recipe.item)
    console.log('[DEBUG] Linked instructions:', linkedInstructions)

    const recipeDetail: RecipeDetail = {
      item_id: recipe.item_id,
      item: recipe.item,
      category: recipe.category || '',
      product_group: recipe.product_group || '',
      recipe_total_cost: parseFloat(recipe.recipe_total_cost) || 0,
      ingredients,
      linked_instructions: linkedInstructions,
    }

    return NextResponse.json(recipeDetail)
  } catch (error) {
    console.error('Error fetching recipe detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}
