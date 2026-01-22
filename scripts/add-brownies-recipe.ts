import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function addBrowniesRecipe() {
  const browniesRecipe = {
    recipeId: "brownies-1kg",
    name: "Brownies 1 KG",
    category: "Dessert",
    station: "Baker",
    recipeCode: "BK-001",
    yield: "1 KG",
    daysAvailable: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    prepTime: "20 minutes",
    cookTime: "35 minutes",
    servings: "1 KG (approximately 16 pieces)",
    
    // Main ingredients with quantities for 1 KG base yield
    mainIngredients: [
      {
        name: "Dark Chocolate (70% cocoa)",
        quantity: 300,
        unit: "GM",
        specifications: "High quality, chopped"
      },
      {
        name: "Unsalted Butter",
        quantity: 200,
        unit: "GM",
        specifications: "Room temperature"
      },
      {
        name: "Granulated Sugar",
        quantity: 250,
        unit: "GM"
      },
      {
        name: "Eggs (Large)",
        quantity: 4,
        unit: "units",
        specifications: "Room temperature"
      },
      {
        name: "All-Purpose Flour",
        quantity: 120,
        unit: "GM",
        specifications: "Sifted"
      },
      {
        name: "Cocoa Powder",
        quantity: 40,
        unit: "GM",
        specifications: "Unsweetened, sifted"
      },
      {
        name: "Salt",
        quantity: 3,
        unit: "GM"
      },
      {
        name: "Vanilla Extract",
        quantity: 10,
        unit: "ML"
      },
      {
        name: "Chocolate Chips (optional)",
        quantity: 100,
        unit: "GM",
        specifications: "For extra richness"
      }
    ],
    
    ingredients: [], // Using mainIngredients instead
    
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
        instruction: "Melt dark chocolate and butter together in a double boiler or microwave, stirring until smooth.",
        time: "5 minutes",
        critical: true,
        hint: "Do not overheat - chocolate should be just melted"
      },
      {
        step: 3,
        instruction: "Remove from heat and whisk in sugar until well combined. Let cool for 2-3 minutes.",
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
        instruction: "Sift flour, cocoa powder, and salt together, then gently fold into the chocolate mixture until just combined.",
        time: "3 minutes",
        critical: true,
        hint: "Do not overmix - this will make brownies tough"
      },
      {
        step: 6,
        instruction: "Fold in chocolate chips if using. Pour batter into prepared pan and spread evenly.",
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
      },
      {
        step: 9,
        instruction: "Cut into desired portion sizes. For 1 KG, cut into 16 pieces (approximately 60g each).",
        time: "5 minutes",
        critical: false,
        hint: "Use a sharp knife and wipe clean between cuts for neat edges"
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
        name: "Double Boiler or Microwave",
        purpose: "Melting chocolate and butter",
        setting: "Low heat / Medium power",
        notes: "Stir frequently to prevent burning"
      },
      {
        name: "Electric Mixer or Whisk",
        purpose: "Mixing batter",
        setting: "Medium speed",
        notes: "Can also be done by hand"
      },
      {
        name: "23cm x 23cm Square Pan",
        purpose: "Baking container",
        specifications: "Metal or glass",
        notes: "Line with parchment paper for easy removal"
      },
      {
        name: "Kitchen Scale",
        purpose: "Accurate ingredient measurement",
        notes: "Essential for consistent results"
      },
      {
        name: "Wire Cooling Rack",
        purpose: "Cooling brownies",
        notes: "Allows air circulation for even cooling"
      }
    ],
    
    qualitySpecifications: [
      {
        appearance: "Dark brown color with slightly crackled top surface. Should be uniform in thickness with no burnt edges.",
        texture: "Fudgy and dense with a slightly crispy top. Should be moist but not wet, with clean cut edges.",
        tasteFlavorProfile: "Rich, intense chocolate flavor with balanced sweetness. Should have deep cocoa notes without being bitter.",
        aroma: "Strong chocolate aroma with hints of vanilla. Should smell rich and inviting.",
        acceptanceCriteria: "Must pass visual inspection, texture test, and taste test. No burnt smell or taste.",
        rejectionCriteria: "Dry or crumbly texture, burnt edges, undercooked center, off flavors"
      }
    ],
    
    packingLabeling: {
      packingType: "Individual vacuum-sealed portions or in airtight containers",
      labelRequirements: "Product name, weight, production date, best before date, allergen information (contains: eggs, wheat, dairy, may contain nuts)",
      storageCondition: "Store at room temperature (18-22°C) in airtight container, away from direct sunlight",
      shelfLife: "5-7 days at room temperature, 2 weeks refrigerated, 3 months frozen",
      serviceItems: ["Parchment paper squares for separation", "Airtight food containers", "Labels with date and allergen info"]
    },
    
    presentation: {
      photos: [
        "https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&h=600&fit=crop"
      ],
      description: "Cut into neat squares with clean edges. Top should have an attractive crackled appearance. Can be dusted with powdered sugar or served with ice cream for enhanced presentation."
    },
    
    sops: {
      foodSafetyAndHygiene: [
        "Wash hands thoroughly before handling ingredients",
        "Ensure all equipment is clean and sanitized",
        "Check eggs for freshness - no cracks or odd smell",
        "Use separate cutting boards for raw and cooked products",
        "Store finished brownies in clean, airtight containers",
        "Label all products with production date and time",
        "Follow FIFO (First In, First Out) for ingredient usage"
      ],
      cookingStandards: [
        "Preheat oven to exactly 175°C - use oven thermometer to verify",
        "Measure all ingredients by weight for consistency",
        "Do not overmix batter - fold just until combined",
        "Bake until toothpick comes out with moist crumbs (not wet)",
        "Allow proper cooling time before cutting",
        "Cut into uniform portions for consistent serving sizes"
      ],
      storageAndHolding: [
        "Cool completely before packaging to prevent condensation",
        "Store in airtight containers at room temperature",
        "Keep away from strong-smelling foods",
        "If refrigerating, bring to room temperature before serving",
        "For freezing, wrap individual pieces in plastic wrap, then foil",
        "Label all stored items with production date"
      ],
      qualityStandards: [
        "Visual inspection: uniform color, no burnt areas, crackled top",
        "Texture check: fudgy, dense, slightly moist",
        "Taste test: rich chocolate flavor, balanced sweetness",
        "Weight verification: each 1 KG batch should yield 950-1050g finished product",
        "Reject any batch with off flavors, dry texture, or burnt smell"
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
          "Ensure pan is correct size (too large = thin brownies)",
          "Make sure oven is fully preheated"
        ]
      },
      {
        problem: "Brownies have burnt edges but raw center",
        solutions: [
          "Reduce oven temperature by 10°C",
          "Use lighter-colored metal pan instead of dark/glass",
          "Place pan on middle rack, not too close to heating element",
          "Cover edges with foil during last 10 minutes of baking"
        ]
      },
      {
        problem: "Top is not crackly or shiny",
        solutions: [
          "Ensure sugar is fully dissolved in chocolate mixture",
          "Don't overmix batter after adding flour",
          "Use room temperature eggs",
          "Increase oven temperature slightly (by 5-10°C)"
        ]
      },
      {
        problem: "Brownies stick to pan",
        solutions: [
          "Line pan with parchment paper extending over edges",
          "Grease pan and parchment paper lightly",
          "Allow brownies to cool completely before removing",
          "Use parchment paper 'handles' to lift out of pan"
        ]
      }
    ],
    
    allergens: ["Eggs", "Wheat (Gluten)", "Dairy", "May contain tree nuts"],
    
    storageInstructions: "Store finished brownies in airtight containers at room temperature (18-22°C) for up to 5-7 days. For longer storage, refrigerate for up to 2 weeks or freeze for up to 3 months. Bring to room temperature before serving for best texture and flavor."
  }

  try {
    console.log('Adding Brownies recipe to database...')
    
    // Check if recipe already exists
    const existing = await sql`
      SELECT recipe_id FROM recipes WHERE recipe_id = ${browniesRecipe.recipeId}
    `
    
    if (existing.rows.length > 0) {
      console.log('Recipe already exists, updating...')
      await sql`
        UPDATE recipes 
        SET recipe_data = ${JSON.stringify(browniesRecipe)}::jsonb
        WHERE recipe_id = ${browniesRecipe.recipeId}
      `
      console.log('✅ Brownies recipe updated successfully!')
    } else {
      console.log('Creating new recipe...')
      await sql`
        INSERT INTO recipes (recipe_id, recipe_data)
        VALUES (${browniesRecipe.recipeId}, ${JSON.stringify(browniesRecipe)}::jsonb)
      `
      console.log('✅ Brownies recipe added successfully!')
    }
    
    console.log('\nRecipe Details:')
    console.log(`- Recipe ID: ${browniesRecipe.recipeId}`)
    console.log(`- Name: ${browniesRecipe.name}`)
    console.log(`- Yield: ${browniesRecipe.yield}`)
    console.log(`- Main Ingredients: ${browniesRecipe.mainIngredients.length} items`)
    console.log(`- Preparation Steps: ${browniesRecipe.preparation.length} steps`)
    
    console.log('\n📝 Note: This recipe will now automatically scale ingredients when viewed in the kitchen.')
    console.log('   For example: If production schedule requires 40 KG, all ingredients will be multiplied by 40.')
    
  } catch (error) {
    console.error('❌ Error adding recipe:', error)
    throw error
  }
}

// Run the function
addBrowniesRecipe()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
