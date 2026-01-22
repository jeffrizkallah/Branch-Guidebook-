import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check all brownies recipes
    const allRecipes = await sql`
      SELECT recipe_id, recipe_data->>'name' as name 
      FROM recipes 
      WHERE recipe_data->>'name' ILIKE '%brownies%'
    `
    
    // Check exact match
    const exactMatch = await sql`
      SELECT recipe_id, recipe_data->>'name' as name 
      FROM recipes 
      WHERE LOWER(recipe_data->>'name') = 'brownies 1 kg'
      LIMIT 1
    `
    
    // Count total recipes in table
    const totalCount = await sql`SELECT COUNT(*) as count FROM recipes`
    
    return NextResponse.json({
      postgres_url_exists: !!process.env.POSTGRES_URL,
      postgres_url_preview: process.env.POSTGRES_URL?.substring(0, 50) + '...',
      total_recipes: totalCount.rows[0].count,
      brownies_recipes: allRecipes.rows,
      exact_match: exactMatch.rows,
    })
  } catch (error) {
    console.error('Test DB error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
