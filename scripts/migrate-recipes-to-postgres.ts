import { config } from 'dotenv'
import { sql } from '@vercel/postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
config({ path: '.env.local' })

interface Recipe {
  recipeId: string
  name: string
  [key: string]: any
}

async function migrateRecipes() {
  console.log('🚀 Starting recipes migration to Postgres...\n')

  try {
    // Step 1: Create recipes table
    console.log('📋 Creating recipes table...')
    await sql`
      CREATE TABLE IF NOT EXISTS recipes (
        recipe_id TEXT PRIMARY KEY,
        recipe_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('✓ Table created successfully\n')

    // Step 2: Read recipes from JSON file
    const recipesFilePath = join(process.cwd(), 'data', 'recipes.json')
    let recipes: Recipe[] = []
    
    try {
      const fileContent = readFileSync(recipesFilePath, 'utf-8')
      recipes = JSON.parse(fileContent)
      console.log(`📦 Found ${recipes.length} recipes to migrate\n`)
    } catch (err) {
      console.log('📦 No recipes file found')
      return
    }

    // Step 3: Migrate recipes to database
    let successCount = 0
    let errorCount = 0

    console.log('📥 Migrating recipes...')
    for (const recipe of recipes) {
      try {
        await sql`
          INSERT INTO recipes (recipe_id, recipe_data)
          VALUES (${recipe.recipeId}, ${JSON.stringify(recipe)}::jsonb)
          ON CONFLICT (recipe_id) 
          DO UPDATE SET 
            recipe_data = ${JSON.stringify(recipe)}::jsonb,
            updated_at = CURRENT_TIMESTAMP
        `
        successCount++
        console.log(`  ✓ Migrated: ${recipe.name} (${recipe.recipeId})`)
      } catch (error) {
        errorCount++
        console.error(`  ✗ Failed: ${recipe.name}`, error)
      }
    }

    console.log('\n✅ Migration complete!')
    console.log(`   Success: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log(`   Total: ${recipes.length}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration
migrateRecipes()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error)
    process.exit(1)
  })

