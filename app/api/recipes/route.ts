import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { Recipe } from '@/lib/data'

export async function GET() {
  try {
    const result = await sql`
      SELECT recipe_data as data
      FROM recipes
      ORDER BY (recipe_data->>'name')
    `
    
    const recipes = result.rows.map(row => row.data)
    return NextResponse.json(recipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    // Fallback to empty array on error
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const newRecipe: Recipe = await request.json()
    
    // Basic validation
    if (!newRecipe.recipeId || !newRecipe.name) {
      return NextResponse.json(
        { error: 'Missing required fields: recipeId, name' },
        { status: 400 }
      )
    }

    // Insert new recipe into database
    await sql`
      INSERT INTO recipes (recipe_id, recipe_data)
      VALUES (${newRecipe.recipeId}, ${JSON.stringify(newRecipe)}::jsonb)
    `
    
    return NextResponse.json(newRecipe, { status: 201 })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
