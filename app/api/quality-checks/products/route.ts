import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Categories to include (finished food products for quality checks)
// Excludes: raw ingredients, sub-recipes, packaging, hygiene items
const FOOD_CATEGORIES = [
  'Breakfast',
  'Beverages', 
  'Subscriptions',
  'Hot Meals',
  'Sandwiches',
  'Desserts',
  'Pizza',
  'Special Events',
  'Salads',
  'OBB',
  'Appetizers',
  'Burgers',
  'Mezza',
  'Soups', // Including in case it has food items
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build category filter
    const categoryPlaceholders = FOOD_CATEGORIES.map((_, i) => `$${i + 1}`).join(', ')
    
    let query: string
    let params: (string | number)[]

    if (search && search.length >= 2) {
      // Search mode: search across all food categories
      query = `
        SELECT DISTINCT 
          items as name,
          category,
          SUM(qty) as total_quantity,
          SUM(price_subtotal_with_tax) as total_revenue,
          COUNT(*) as times_sold
        FROM odoo_sales
        WHERE category IN (${categoryPlaceholders})
          AND items IS NOT NULL 
          AND items != ''
          AND LOWER(items) LIKE $${FOOD_CATEGORIES.length + 1}
        GROUP BY items, category
        ORDER BY total_revenue DESC
        LIMIT $${FOOD_CATEGORIES.length + 2}
      `
      params = [...FOOD_CATEGORIES, `%${search}%`, limit]
    } else if (category) {
      // Category filter mode
      query = `
        SELECT DISTINCT 
          items as name,
          category,
          SUM(qty) as total_quantity,
          SUM(price_subtotal_with_tax) as total_revenue,
          COUNT(*) as times_sold
        FROM odoo_sales
        WHERE category = $1
          AND items IS NOT NULL 
          AND items != ''
        GROUP BY items, category
        ORDER BY total_revenue DESC
        LIMIT $2
      `
      params = [category, limit]
    } else {
      // Default: get all products grouped by category (for initial load)
      query = `
        SELECT DISTINCT 
          items as name,
          category,
          SUM(qty) as total_quantity,
          SUM(price_subtotal_with_tax) as total_revenue,
          COUNT(*) as times_sold
        FROM odoo_sales
        WHERE category IN (${categoryPlaceholders})
          AND items IS NOT NULL 
          AND items != ''
        GROUP BY items, category
        ORDER BY category, total_revenue DESC
      `
      params = [...FOOD_CATEGORIES]
    }

    const result = await sql.query(query, params)

    // Group products by category for the response
    const productsByCategory: Record<string, Array<{
      name: string
      revenue: number
      quantity: number
      timesSold: number
    }>> = {}

    // Initialize categories in order of revenue importance
    const categoryOrder = [
      'Breakfast', 'Beverages', 'Hot Meals', 'Sandwiches', 
      'Pizza', 'Desserts', 'Salads', 'Appetizers', 'Burgers',
      'Mezza', 'Subscriptions', 'Special Events', 'OBB', 'Soups'
    ]

    for (const cat of categoryOrder) {
      productsByCategory[cat] = []
    }

    // Populate products
    for (const row of result.rows) {
      const cat = row.category || 'Other'
      if (!productsByCategory[cat]) {
        productsByCategory[cat] = []
      }
      productsByCategory[cat].push({
        name: row.name,
        revenue: Number(row.total_revenue),
        quantity: Number(row.total_quantity),
        timesSold: Number(row.times_sold)
      })
    }

    // Remove empty categories
    for (const cat of Object.keys(productsByCategory)) {
      if (productsByCategory[cat].length === 0) {
        delete productsByCategory[cat]
      }
    }

    // Get category summary with counts
    const categories = Object.entries(productsByCategory).map(([name, products]) => ({
      name,
      count: products.length,
      topProducts: products.slice(0, 5).map(p => p.name)
    }))

    // Flatten for search results if searching
    const allProducts = search 
      ? result.rows.map(row => ({
          name: row.name,
          category: row.category,
          revenue: Number(row.total_revenue)
        }))
      : []

    return NextResponse.json({
      categories,
      productsByCategory,
      searchResults: allProducts,
      totalProducts: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching products for quality check:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' }, 
      { status: 500 }
    )
  }
}
