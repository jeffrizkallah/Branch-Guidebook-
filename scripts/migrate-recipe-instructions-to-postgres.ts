import { config } from 'dotenv'
import { sql } from '@vercel/postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
config({ path: '.env.local' })

interface RecipeInstruction {
  instructionId: string
  dishName: string
  [key: string]: any
}

async function migrateRecipeInstructions() {
  console.log('🚀 Starting recipe instructions migration to Postgres...\n')

  try {
    // Step 1: Create recipe_instructions table
    console.log('📋 Creating recipe_instructions table...')
    await sql`
      CREATE TABLE IF NOT EXISTS recipe_instructions (
        instruction_id TEXT PRIMARY KEY,
        instruction_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('✓ Table created successfully\n')

    // Step 2: Read recipe instructions from JSON file
    const instructionsFilePath = join(process.cwd(), 'data', 'recipe-instructions.json')
    let instructions: RecipeInstruction[] = []
    
    try {
      const fileContent = readFileSync(instructionsFilePath, 'utf-8')
      instructions = JSON.parse(fileContent)
      console.log(`📦 Found ${instructions.length} recipe instructions to migrate\n`)
    } catch (err) {
      console.log('📦 No recipe-instructions.json file found, creating empty table')
      console.log('\n✅ Migration complete! Table is ready.')
      return
    }

    // Step 3: Migrate instructions to database
    let successCount = 0
    let errorCount = 0

    console.log('📥 Migrating recipe instructions...')
    for (const instruction of instructions) {
      try {
        await sql`
          INSERT INTO recipe_instructions (instruction_id, instruction_data)
          VALUES (${instruction.instructionId}, ${JSON.stringify(instruction)}::jsonb)
          ON CONFLICT (instruction_id) 
          DO UPDATE SET 
            instruction_data = ${JSON.stringify(instruction)}::jsonb,
            updated_at = CURRENT_TIMESTAMP
        `
        successCount++
        console.log(`  ✓ Migrated: ${instruction.dishName} (${instruction.instructionId})`)
      } catch (error) {
        errorCount++
        console.error(`  ✗ Failed: ${instruction.dishName}`, error)
      }
    }

    console.log('\n✅ Migration complete!')
    console.log(`   Success: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log(`   Total: ${instructions.length}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration
migrateRecipeInstructions()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error)
    process.exit(1)
  })

