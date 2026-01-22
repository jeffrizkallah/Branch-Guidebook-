import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function createQualityLikesTable() {
  console.log('🚀 Creating quality_likes table in Postgres...\n')

  try {
    // Step 1: Create quality_likes table
    console.log('📋 Creating quality_likes table...')
    await sql`
      CREATE TABLE IF NOT EXISTS quality_likes (
        id SERIAL PRIMARY KEY,
        quality_check_id INTEGER NOT NULL REFERENCES quality_checks(id) ON DELETE CASCADE,
        given_by INTEGER NOT NULL REFERENCES users(id),
        note TEXT CHECK (LENGTH(note) <= 200),
        tags JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Prevent duplicate likes from same person
        UNIQUE(quality_check_id, given_by)
      )
    `
    console.log('✓ quality_likes table created\n')

    // Step 2: Create indexes
    console.log('📋 Creating indexes...')
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quality_likes_check_id 
      ON quality_likes(quality_check_id)
    `
    console.log('  ✓ idx_quality_likes_check_id')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_quality_likes_given_by 
      ON quality_likes(given_by)
    `
    console.log('  ✓ idx_quality_likes_given_by')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_quality_likes_created_at 
      ON quality_likes(created_at)
    `
    console.log('  ✓ idx_quality_likes_created_at')

    console.log('\n✅ Quality likes table and indexes created successfully!')
    console.log('\n📊 Table structure:')
    console.log('   - id: Primary key')
    console.log('   - quality_check_id: FK to quality_checks')
    console.log('   - given_by: FK to users (who gave the like)')
    console.log('   - note: Optional note (max 200 chars)')
    console.log('   - tags: JSONB array of selected tags')
    console.log('   - created_at: When the like was given')
    console.log('\n📌 Constraint: One like per user per quality check')

  } catch (error) {
    console.error('❌ Table creation failed:', error)
    throw error
  }
}

// Run the migration
createQualityLikesTable()
  .then(() => {
    console.log('\n🎉 Migration completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })
