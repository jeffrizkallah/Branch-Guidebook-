import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

config({ path: '.env.local' })

async function testBrowniesLink() {
  try {
    console.log('Testing Brownies recipe link...\n')
    
    // Get the Brownies recipe from odoo_recipe
    const odooRecipe = await sql`
      SELECT item_id, item
      FROM odoo_recipe
      WHERE item = 'Brownies 1 KG'
      LIMIT 1
    `
    
    if (odooRecipe.rows.length === 0) {
      console.log('❌ Brownies not found in odoo_recipe')
      return
    }
    
    const itemName = odooRecipe.rows[0].item
    const itemId = odooRecipe.rows[0].item_id
    
    console.log(`Found Odoo recipe:`)
    console.log(`  - item_id: ${itemId}`)
    console.log(`  - item name: "${itemName}"\n`)
    
    // Test the exact matching logic
    const normalizedName = itemName
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
    
    console.log(`Normalized name: "${normalizedName}"\n`)
    
    // Try exact match
    console.log('Testing EXACT match query:')
    const exactResult = await sql`
      SELECT recipe_id, recipe_data->>'name' as name
      FROM recipes
      WHERE LOWER(recipe_data->>'name') = ${normalizedName}
      LIMIT 1
    `
    
    if (exactResult.rows.length > 0) {
      console.log('✅ EXACT MATCH FOUND:')
      console.log(`   - recipe_id: "${exactResult.rows[0].recipe_id}"`)
      console.log(`   - name: "${exactResult.rows[0].name}"\n`)
    } else {
      console.log('❌ No exact match found\n')
      
      // Try fuzzy match
      console.log('Testing FUZZY match query:')
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
        console.log('✅ FUZZY MATCH FOUND:')
        console.log(`   - recipe_id: "${fuzzyResult.rows[0].recipe_id}"`)
        console.log(`   - name: "${fuzzyResult.rows[0].name}"\n`)
      } else {
        console.log('❌ No fuzzy match found either\n')
      }
    }
    
    // List all brownies recipes in the system
    console.log('All Brownies recipes in recipes table:')
    const allRecipes = await sql`
      SELECT recipe_id, recipe_data->>'name' as name
      FROM recipes
      WHERE recipe_data->>'name' ILIKE '%brownies%'
    `
    
    allRecipes.rows.forEach(row => {
      const nameLower = row.name.toLowerCase().trim()
      const matches = nameLower === normalizedName
      console.log(`  ${matches ? '✅' : '  '} "${row.recipe_id}" - "${row.name}"`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

testBrowniesLink()
  .then(() => {
    console.log('\n✅ Test complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
