import { sql } from '@vercel/postgres'

async function fixBrowniesRecipe() {
  try {
    console.log('🔍 Looking for Brownies 1 KG recipe...')
    
    // Find the recipe by name
    const result = await sql`
      SELECT recipe_id, recipe_data
      FROM recipes
      WHERE recipe_data->>'name' ILIKE '%Brownies%KG%'
    `
    
    if (result.rows.length === 0) {
      console.log('❌ Recipe not found')
      return
    }
    
    console.log(`\n✅ Found ${result.rows.length} matching recipe(s):`)
    
    for (const row of result.rows) {
      const recipeData = row.recipe_data
      console.log('\n---')
      console.log('Current recipe_id in DB:', row.recipe_id)
      console.log('Recipe name:', recipeData.name)
      console.log('recipeId field in data:', recipeData.recipeId)
      
      // Generate correct slug
      const correctSlug = recipeData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      
      console.log('Correct slug should be:', correctSlug)
      
      // Check if it needs fixing
      if (row.recipe_id !== correctSlug || recipeData.recipeId !== correctSlug) {
        console.log('\n🔧 Fixing recipe...')
        
        // Update the recipe data with correct recipeId
        const updatedData = {
          ...recipeData,
          recipeId: correctSlug
        }
        
        // Delete old entry if recipe_id is different
        if (row.recipe_id !== correctSlug) {
          await sql`
            DELETE FROM recipes
            WHERE recipe_id = ${row.recipe_id}
          `
          console.log('✓ Deleted old entry')
        }
        
        // Insert/Update with correct recipe_id
        await sql`
          INSERT INTO recipes (recipe_id, recipe_data)
          VALUES (${correctSlug}, ${JSON.stringify(updatedData)}::jsonb)
          ON CONFLICT (recipe_id) 
          DO UPDATE SET recipe_data = ${JSON.stringify(updatedData)}::jsonb
        `
        
        console.log('✅ Recipe fixed!')
        console.log(`You can now access it at: /admin/recipe-instructions/${correctSlug}`)
      } else {
        console.log('\n✓ Recipe ID is already correct')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixBrowniesRecipe()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
