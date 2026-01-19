import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

/**
 * GET /api/odoo-recipes
 * 
 * Returns a list of all unique recipes from odoo_recipe table
 * with aggregated data (ingredient count, total cost)
 * 
 * Query params:
 * - search: Filter by recipe name
 * - category: Filter by category
 * - product_group: Filter by product group
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const productGroup = searchParams.get('product_group') || ''

    // Build dynamic WHERE conditions
    const conditions: string[] = [
      "item_id IS NOT NULL", // Only include processed recipes
    ]
    const params: (string | number)[] = []
    let paramIndex = 1

    if (search) {
      conditions.push(`item ILIKE $${paramIndex}`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (category) {
      conditions.push(`category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }

    if (productGroup) {
      conditions.push(`product_group = $${paramIndex}`)
      params.push(productGroup)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get unique recipes with aggregated data
    const query = `
      SELECT 
        item_id,
        item,
        MAX(category) as category,
        MAX(product_group) as product_group,
        COUNT(*) as ingredient_count,
        MAX(recipe_total_cost) as recipe_total_cost
      FROM odoo_recipe
      ${whereClause}
      GROUP BY item_id, item
      ORDER BY item
    `

    const result = await sql.query(query, params)

    // Get unique categories and product groups for filters
    const filtersResult = await sql`
      SELECT 
        DISTINCT category,
        product_group
      FROM odoo_recipe
      WHERE item_id IS NOT NULL
      ORDER BY category, product_group
    `

    const categories = [...new Set(filtersResult.rows.map(r => r.category).filter(Boolean))]
    const productGroups = [...new Set(filtersResult.rows.map(r => r.product_group).filter(Boolean))]

    return NextResponse.json({
      recipes: result.rows.map(row => ({
        item_id: row.item_id,
        item: row.item,
        category: row.category,
        product_group: row.product_group,
        ingredient_count: parseInt(row.ingredient_count),
        recipe_total_cost: parseFloat(row.recipe_total_cost) || 0,
      })),
      filters: {
        categories,
        productGroups,
      },
      total: result.rows.length,
    })
  } catch (error) {
    console.error('Error fetching odoo recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}
