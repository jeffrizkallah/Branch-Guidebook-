import { sql } from '@vercel/postgres'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function diagnoseBrowniesLink() {
  try {
    console.log('🔍 Diagnosing Brownies recipe linking issue...\n')
    
    // 1. Check if Brownies product exists in odoo_recipe
    console.log('1️⃣ Checking for Brownies product in odoo_recipe table:')
    const productResult = await sql`
      SELECT DISTINCT item_id, item, category
      FROM odoo_recipe
      WHERE item ILIKE '%Brownies%KG%'
      ORDER BY item
    `
    
    if (productResult.rows.length === 0) {
      console.log('❌ No Brownies products found in odoo_recipe table')
    } else {
      console.log(`✅ Found ${productResult.rows.length} Brownies product(s):`)
      productResult.rows.forEach(row => {
        console.log(`   - ID: ${row.item_id}, Name: "${row.item}", Category: ${row.category}`)
      })
    }
    
    // 2. Check if Brownies recipe exists in recipes table
    console.log('\n2️⃣ Checking for Brownies recipe in recipes table:')
    const recipeResult = await sql`
      SELECT recipe_id, recipe_data->>'name' as name, recipe_data->>'category' as category
      FROM recipes
      WHERE recipe_data->>'name' ILIKE '%Brownies%'
      ORDER BY recipe_data->>'name'
    `
    
    if (recipeResult.rows.length === 0) {
      console.log('❌ No Brownies recipes found in recipes table')
    } else {
      console.log(`✅ Found ${recipeResult.rows.length} Brownies recipe(s):`)
      recipeResult.rows.forEach(row => {
        console.log(`   - recipe_id: "${row.recipe_id}", Name: "${row.name}", Category: ${row.category}`)
      })
    }
    
    // 3. Test the name matching logic
    if (productResult.rows.length > 0 && recipeResult.rows.length > 0) {
      console.log('\n3️⃣ Testing name matching logic:')
      
      for (const product of productResult.rows) {
        const productName = product.item
        const normalizedProductName = productName
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim()
        
        console.log(`\n   Product: "${productName}"`)
        console.log(`   Normalized: "${normalizedProductName}"`)
        
        // Test exact match
        const exactMatch = await sql`
          SELECT recipe_id, recipe_data->>'name' as name
          FROM recipes
          WHERE LOWER(recipe_data->>'name') = ${normalizedProductName}
          LIMIT 1
        `
        
        if (exactMatch.rows.length > 0) {
          console.log(`   ✅ EXACT MATCH FOUND:`)
          console.log(`      - recipe_id: "${exactMatch.rows[0].recipe_id}"`)
          console.log(`      - name: "${exactMatch.rows[0].name}"`)
        } else {
          console.log(`   ❌ No exact match found`)
          
          // Test fuzzy match
          const fuzzyMatch = await sql`
            SELECT recipe_id, recipe_data->>'name' as name
            FROM recipes
            WHERE 
              LOWER(recipe_data->>'name') LIKE ${`%${normalizedProductName}%`}
              OR ${normalizedProductName} LIKE CONCAT('%', LOWER(recipe_data->>'name'), '%')
            ORDER BY 
              CASE 
                WHEN LOWER(recipe_data->>'name') = ${normalizedProductName} THEN 0
                ELSE LENGTH(recipe_data->>'name')
              END
            LIMIT 1
          `
          
          if (fuzzyMatch.rows.length > 0) {
            console.log(`   ⚠️  FUZZY MATCH FOUND:`)
            console.log(`      - recipe_id: "${fuzzyMatch.rows[0].recipe_id}"`)
            console.log(`      - name: "${fuzzyMatch.rows[0].name}"`)
          } else {
            console.log(`   ❌ No fuzzy match found either`)
          }
        }
      }
    }
    
    // 4. Summary and recommendations
    console.log('\n📋 SUMMARY:')
    if (productResult.rows.length === 0) {
      console.log('   ⚠️  No Brownies product found in the system')
    } else if (recipeResult.rows.length === 0) {
      console.log('   ⚠️  Brownies product exists but no recipe instructions found')
      console.log('   💡 Solution: Run add-brownies-recipe.ts script to add the recipe')
    } else {
      console.log('   ℹ️  Both product and recipe exist. Check matching results above.')
      
      // Check if names match exactly
      const productNames = productResult.rows.map(r => r.item.toLowerCase().trim())
      const recipeNames = recipeResult.rows.map(r => r.name.toLowerCase().trim())
      
      const hasExactMatch = productNames.some(pName => recipeNames.includes(pName))
      
      if (!hasExactMatch) {
        console.log('   ⚠️  Product name and recipe name do not match exactly')
        console.log('   💡 Solution: Update the recipe name to match the product name exactly:')
        console.log(`      Product: "${productResult.rows[0].item}"`)
        console.log(`      Recipe:  "${recipeResult.rows[0].name}"`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error)
    throw error
  }
}

// Run the diagnosis
diagnoseBrowniesLink()
  .then(() => {
    console.log('\n✅ Diagnosis complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Diagnosis failed:', error)
    process.exit(1)
  })
