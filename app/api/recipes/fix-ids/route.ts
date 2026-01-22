import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

/**
 * POST /api/recipes/fix-ids
 * Fixes recipe IDs that don't match their slugs
 */
export async function POST() {
  try {
    // Get all recipes
    const result = await sql`
      SELECT recipe_id, recipe_data
      FROM recipes
    `
    
    const fixed: string[] = []
    const skipped: string[] = []
    
    for (const row of result.rows) {
      const recipeData = row.recipe_data
      const currentId = row.recipe_id
      const recipeName = recipeData.name
      
      // Generate correct slug from name
      const correctSlug = recipeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      
      // Check if it needs fixing
      if (currentId !== correctSlug || recipeData.recipeId !== correctSlug) {
        // Update the recipe data with correct recipeId
        const updatedData = {
          ...recipeData,
          recipeId: correctSlug
        }
        
        // Delete old entry if recipe_id is different
        if (currentId !== correctSlug) {
          await sql`
            DELETE FROM recipes
            WHERE recipe_id = ${currentId}
          `
        }
        
        // Insert/Update with correct recipe_id
        await sql`
          INSERT INTO recipes (recipe_id, recipe_data)
          VALUES (${correctSlug}, ${JSON.stringify(updatedData)}::jsonb)
          ON CONFLICT (recipe_id) 
          DO UPDATE SET recipe_data = ${JSON.stringify(updatedData)}::jsonb
        `
        
        fixed.push(`${recipeName} (${currentId} → ${correctSlug})`)
      } else {
        skipped.push(recipeName)
      }
    }
    
    return NextResponse.json({
      success: true,
      fixed: fixed.length,
      skipped: skipped.length,
      details: {
        fixed,
        skipped
      }
    })
  } catch (error) {
    console.error('Error fixing recipe IDs:', error)
    return NextResponse.json(
      { error: 'Failed to fix recipe IDs', details: String(error) },
      { status: 500 }
    )
  }
}
