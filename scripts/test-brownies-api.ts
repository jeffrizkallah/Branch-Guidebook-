import { sql } from '@vercel/postgres'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function testBrowniesAPI() {
  try {
    console.log('🧪 Testing Brownies API logic...\n')
    
    const itemId = 276
    
    // Step 1: Get the recipe basic info (same as API)
    console.log('Step 1: Fetching recipe from odoo_recipe...')
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
      console.log('❌ Recipe not found in odoo_recipe')
      return
    }

    const recipe = recipeResult.rows[0]
    console.log('✅ Found recipe:')
    console.log(`   - item_id: ${recipe.item_id}`)
    console.log(`   - item: "${recipe.item}"`)
    console.log(`   - category: ${recipe.category}`)

    // Step 2: Test the findLinkedInstructions logic
    console.log('\nStep 2: Testing findLinkedInstructions logic...')
    const itemName = recipe.item
    
    // Normalize the item name
    const normalizedName = itemName
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
    
    console.log(`   Item name: "${itemName}"`)
    console.log(`   Normalized: "${normalizedName}"`)

    // Try exact match first
    console.log('\n   Trying exact match...')
    const exactResult = await sql`
      SELECT recipe_id, recipe_data->>'name' as name
      FROM recipes
      WHERE LOWER(recipe_data->>'name') = ${normalizedName}
      LIMIT 1
    `

    if (exactResult.rows.length > 0) {
      console.log('   ✅ EXACT MATCH FOUND!')
      console.log(`      recipe_id: "${exactResult.rows[0].recipe_id}"`)
      console.log(`      name: "${exactResult.rows[0].name}"`)
      
      const linkedInstructions = {
        recipe_id: exactResult.rows[0].recipe_id,
        name: exactResult.rows[0].name,
      }
      
      console.log('\n📦 API would return:')
      console.log(JSON.stringify({
        item_id: recipe.item_id,
        item: recipe.item,
        category: recipe.category,
        linked_instructions: linkedInstructions
      }, null, 2))
      
      return
    }

    console.log('   ❌ No exact match')

    // Try fuzzy match
    console.log('\n   Trying fuzzy match...')
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
      console.log('   ✅ FUZZY MATCH FOUND!')
      console.log(`      recipe_id: "${fuzzyResult.rows[0].recipe_id}"`)
      console.log(`      name: "${fuzzyResult.rows[0].name}"`)
      
      const linkedInstructions = {
        recipe_id: fuzzyResult.rows[0].recipe_id,
        name: fuzzyResult.rows[0].name,
      }
      
      console.log('\n📦 API would return:')
      console.log(JSON.stringify({
        item_id: recipe.item_id,
        item: recipe.item,
        category: recipe.category,
        linked_instructions: linkedInstructions
      }, null, 2))
      
      return
    }

    console.log('   ❌ No fuzzy match')
    console.log('\n📦 API would return:')
    console.log(JSON.stringify({
      item_id: recipe.item_id,
      item: recipe.item,
      category: recipe.category,
      linked_instructions: null
    }, null, 2))

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Run the test
testBrowniesAPI()
  .then(() => {
    console.log('\n✅ Test complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
