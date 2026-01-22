import { sql } from '@vercel/postgres'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function fixBrowniesLinking() {
  try {
    console.log('🔧 Fixing Brownies recipe linking...\n')
    
    // 1. Get the exact product name from odoo_recipe
    console.log('Step 1: Finding Brownies product...')
    const productResult = await sql`
      SELECT DISTINCT item_id, item
      FROM odoo_recipe
      WHERE item ILIKE '%Brownies%1%KG%'
      ORDER BY item_id
      LIMIT 1
    `
    
    if (productResult.rows.length === 0) {
      console.log('❌ No Brownies 1 KG product found in database')
      console.log('   Please verify the product exists in the odoo_recipe table')
      return
    }
    
    const productName = productResult.rows[0].item
    const productId = productResult.rows[0].item_id
    console.log(`✅ Found product: "${productName}" (ID: ${productId})`)
    
    // 2. Check if recipe exists
    console.log('\nStep 2: Checking for existing recipe...')
    const existingRecipe = await sql`
      SELECT recipe_id, recipe_data
      FROM recipes
      WHERE recipe_data->>'name' ILIKE '%Brownies%1%KG%'
      LIMIT 1
    `
    
    // Generate the correct recipe_id slug
    const recipeIdSlug = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    console.log(`   Target recipe_id: "${recipeIdSlug}"`)
    
    if (existingRecipe.rows.length > 0) {
      const currentRecipeId = existingRecipe.rows[0].recipe_id
      const currentRecipeData = existingRecipe.rows[0].recipe_data
      const currentName = currentRecipeData.name
      
      console.log(`✅ Recipe exists:`)
      console.log(`   - Current recipe_id: "${currentRecipeId}"`)
      console.log(`   - Current name: "${currentName}"`)
      
      // Check if update is needed
      const needsNameUpdate = currentName !== productName
      const needsIdUpdate = currentRecipeId !== recipeIdSlug || currentRecipeData.recipeId !== recipeIdSlug
      
      if (needsNameUpdate || needsIdUpdate) {
        console.log('\n⚠️  Recipe needs updating to match product name exactly')
        
        // Update the recipe
        const updatedRecipeData = {
          ...currentRecipeData,
          recipeId: recipeIdSlug,
          name: productName, // Match product name exactly
        }
        
        // If recipe_id changed, delete old and insert new
        if (currentRecipeId !== recipeIdSlug) {
          console.log(`\n   Deleting old recipe_id: "${currentRecipeId}"`)
          await sql`
            DELETE FROM recipes
            WHERE recipe_id = ${currentRecipeId}
          `
          
          console.log(`   Creating new recipe_id: "${recipeIdSlug}"`)
          await sql`
            INSERT INTO recipes (recipe_id, recipe_data)
            VALUES (${recipeIdSlug}, ${JSON.stringify(updatedRecipeData)}::jsonb)
          `
        } else {
          // Just update the data
          console.log('   Updating recipe data...')
          await sql`
            UPDATE recipes
            SET recipe_data = ${JSON.stringify(updatedRecipeData)}::jsonb
            WHERE recipe_id = ${recipeIdSlug}
          `
        }
        
        console.log('✅ Recipe updated successfully!')
      } else {
        console.log('✓ Recipe is already correctly configured')
      }
    } else {
      console.log('⚠️  No recipe found, creating new one...')
      
      // Create the full recipe with all details
      const browniesRecipe = {
        recipeId: recipeIdSlug,
        name: productName, // Use exact product name
        category: "Dessert",
        station: "Baker",
        recipeCode: "BK-001",
        yield: "1 KG",
        daysAvailable: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        prepTime: "20 minutes",
        cookTime: "35 minutes",
        servings: "1 KG (approximately 16 pieces)",
        
        mainIngredients: [
          {
            name: "Butter",
            quantity: 200,
            unit: "GM",
            specifications: ""
          },
          {
            name: "Cocoa Powder",
            quantity: 115,
            unit: "GM",
            specifications: ""
          },
          {
            name: "Eggs UNIT",
            quantity: 5,
            unit: "unit",
            specifications: ""
          },
          {
            name: "Flour",
            quantity: 85,
            unit: "GM",
            specifications: ""
          },
          {
            name: "Salt",
            quantity: 4,
            unit: "GM",
            specifications: ""
          },
          {
            name: "Sugar White",
            quantity: 350,
            unit: "GM",
            specifications: ""
          },
          {
            name: "Vanilla Liquid 28Ml",
            quantity: 20,
            unit: "GM",
            specifications: ""
          }
        ],
        
        ingredients: [],
        
        preparation: [
          {
            step: 1,
            instruction: "Preheat oven to 175°C (350°F). Line baking pan with parchment paper and lightly grease.",
            time: "5 minutes",
            critical: true,
            hint: "Proper oven temperature is crucial for texture"
          },
          {
            step: 2,
            instruction: "Melt butter in a saucepan over low heat. Remove from heat and stir in cocoa powder until smooth.",
            time: "5 minutes",
            critical: true,
            hint: "Do not overheat - mixture should be just melted"
          },
          {
            step: 3,
            instruction: "Add sugar to the butter-cocoa mixture and whisk until well combined. Let cool for 2-3 minutes.",
            time: "3 minutes",
            critical: false,
            hint: "Mixture should be warm but not hot before adding eggs"
          },
          {
            step: 4,
            instruction: "Add eggs one at a time, whisking well after each addition. Mix in vanilla extract.",
            time: "3 minutes",
            critical: true,
            hint: "Eggs should be fully incorporated before adding the next one"
          },
          {
            step: 5,
            instruction: "Sift flour and salt together, then gently fold into the chocolate mixture until just combined.",
            time: "3 minutes",
            critical: true,
            hint: "Do not overmix - this will make brownies tough"
          },
          {
            step: 6,
            instruction: "Pour batter into prepared pan and spread evenly.",
            time: "2 minutes",
            critical: false,
            hint: "Tap pan gently on counter to remove air bubbles"
          },
          {
            step: 7,
            instruction: "Bake for 30-35 minutes until a toothpick inserted comes out with a few moist crumbs (not wet batter).",
            time: "35 minutes",
            critical: true,
            hint: "Don't overbake - brownies continue cooking as they cool"
          },
          {
            step: 8,
            instruction: "Remove from oven and let cool in pan on wire rack for at least 30 minutes before cutting.",
            time: "30 minutes",
            critical: true,
            hint: "Cutting too early will result in messy, crumbly brownies"
          }
        ],
        
        requiredMachinesTools: [
          {
            name: "Convection Oven",
            purpose: "Baking brownies",
            setting: "175°C (350°F)",
            specifications: "Preheat for at least 10 minutes"
          },
          {
            name: "Saucepan",
            purpose: "Melting butter and cocoa",
            setting: "Low heat",
            notes: "Stir frequently to prevent burning"
          },
          {
            name: "Whisk",
            purpose: "Mixing batter",
            setting: "Manual",
            notes: "Can also use electric mixer on low speed"
          },
          {
            name: "Baking Pan",
            purpose: "Baking container",
            specifications: "23cm x 23cm or similar size",
            notes: "Line with parchment paper for easy removal"
          }
        ],
        
        qualitySpecifications: [
          {
            appearance: "Dark brown color with slightly crackled top surface. Should be uniform in thickness.",
            texture: "Fudgy and dense with a slightly crispy top. Should be moist but not wet.",
            tasteFlavorProfile: "Rich, intense chocolate flavor with balanced sweetness.",
            aroma: "Strong chocolate aroma with hints of vanilla.",
            acceptanceCriteria: "Must pass visual inspection, texture test, and taste test.",
            rejectionCriteria: "Dry or crumbly texture, burnt edges, undercooked center"
          }
        ],
        
        packingLabeling: {
          packingType: "Airtight containers",
          labelRequirements: "Product name, weight, production date, best before date, allergen information",
          storageCondition: "Room temperature (18-22°C) in airtight container",
          shelfLife: "5-7 days at room temperature, 2 weeks refrigerated",
          serviceItems: ["Parchment paper", "Airtight containers", "Labels"]
        },
        
        presentation: {
          photos: [
            "https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&h=600&fit=crop"
          ],
          description: "Cut into neat squares with clean edges. Top should have an attractive crackled appearance."
        },
        
        sops: {
          foodSafetyAndHygiene: [
            "Wash hands thoroughly before handling ingredients",
            "Ensure all equipment is clean and sanitized",
            "Check eggs for freshness",
            "Store finished brownies in clean, airtight containers",
            "Label all products with production date"
          ],
          cookingStandards: [
            "Preheat oven to exactly 175°C",
            "Measure all ingredients by weight for consistency",
            "Do not overmix batter",
            "Bake until toothpick comes out with moist crumbs",
            "Allow proper cooling time before cutting"
          ],
          storageAndHolding: [
            "Cool completely before packaging",
            "Store in airtight containers at room temperature",
            "Keep away from strong-smelling foods",
            "Label all stored items with production date"
          ],
          qualityStandards: [
            "Visual inspection: uniform color, no burnt areas",
            "Texture check: fudgy, dense, slightly moist",
            "Taste test: rich chocolate flavor, balanced sweetness",
            "Reject any batch with off flavors or dry texture"
          ]
        },
        
        troubleshooting: [
          {
            problem: "Brownies are too dry or crumbly",
            solutions: [
              "Reduce baking time by 5 minutes",
              "Check oven temperature - may be too high",
              "Ensure proper measurement of wet ingredients",
              "Don't overmix the batter"
            ]
          },
          {
            problem: "Brownies are undercooked in the center",
            solutions: [
              "Increase baking time by 5-minute increments",
              "Check oven temperature - may be too low",
              "Ensure pan is correct size",
              "Make sure oven is fully preheated"
            ]
          },
          {
            problem: "Top is not crackly",
            solutions: [
              "Ensure sugar is fully dissolved",
              "Don't overmix batter after adding flour",
              "Use room temperature eggs",
              "Increase oven temperature slightly"
            ]
          }
        ],
        
        allergens: ["Eggs", "Wheat (Gluten)", "Dairy"],
        
        storageInstructions: "Store in airtight containers at room temperature for up to 5-7 days. For longer storage, refrigerate for up to 2 weeks."
      }
      
      // Insert the recipe
      await sql`
        INSERT INTO recipes (recipe_id, recipe_data)
        VALUES (${recipeIdSlug}, ${JSON.stringify(browniesRecipe)}::jsonb)
      `
      
      console.log('✅ Recipe created successfully!')
    }
    
    // 3. Verify the linking works
    console.log('\nStep 3: Verifying the link...')
    const normalizedName = productName
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
    
    const verifyResult = await sql`
      SELECT recipe_id, recipe_data->>'name' as name
      FROM recipes
      WHERE LOWER(recipe_data->>'name') = ${normalizedName}
      LIMIT 1
    `
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ SUCCESS! Recipe is now linked to product')
      console.log(`   Product: "${productName}" (ID: ${productId})`)
      console.log(`   Recipe: "${verifyResult.rows[0].name}" (ID: ${verifyResult.rows[0].recipe_id})`)
      console.log(`\n🎉 You can now view the recipe at: /recipes/${productId}`)
    } else {
      console.log('❌ Verification failed - please check database')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Run the fix
fixBrowniesLinking()
  .then(() => {
    console.log('\n✅ Fix complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error)
    process.exit(1)
  })
