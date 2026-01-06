import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function createQualityChecksTable() {
  console.log('🚀 Creating quality_checks table in Postgres...\n')

  try {
    // ==========================================
    // QUALITY CHECKS TABLE
    // ==========================================
    console.log('📋 Creating quality_checks table...')
    await sql`
      CREATE TABLE IF NOT EXISTS quality_checks (
        id SERIAL PRIMARY KEY,
        branch_slug VARCHAR(100) NOT NULL,
        submitted_by INTEGER NOT NULL,
        submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Meal service
        meal_service VARCHAR(20) NOT NULL, -- 'breakfast' or 'lunch'
        
        -- Product info
        product_name VARCHAR(255) NOT NULL,
        section VARCHAR(50) NOT NULL, -- 'Bakery', 'Hot', 'Cold', 'Beverages'
        
        -- Scores (1-5 scale)
        taste_score INTEGER NOT NULL CHECK (taste_score BETWEEN 1 AND 5),
        appearance_score INTEGER NOT NULL CHECK (appearance_score BETWEEN 1 AND 5),
        
        -- Measurements
        portion_qty_gm DECIMAL(10, 2) NOT NULL,
        temp_celsius DECIMAL(5, 2) NOT NULL,
        
        -- Notes
        taste_notes TEXT,
        portion_notes TEXT,
        appearance_notes TEXT,
        remarks TEXT,
        corrective_action_taken BOOLEAN DEFAULT false,
        corrective_action_notes TEXT,
        
        -- Photos (JSON array of image URLs)
        photos JSONB DEFAULT '[]'::jsonb,
        
        -- Admin review status
        status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'reviewed', 'flagged'
        admin_notes TEXT,
        reviewed_by INTEGER,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('✓ quality_checks table created\n')

    // Create indexes
    console.log('📋 Creating indexes...')
    await sql`CREATE INDEX IF NOT EXISTS idx_quality_branch ON quality_checks(branch_slug)`
    console.log('  ✓ idx_quality_branch')
    
    await sql`CREATE INDEX IF NOT EXISTS idx_quality_date ON quality_checks(submission_date)`
    console.log('  ✓ idx_quality_date')
    
    await sql`CREATE INDEX IF NOT EXISTS idx_quality_section ON quality_checks(section)`
    console.log('  ✓ idx_quality_section')
    
    await sql`CREATE INDEX IF NOT EXISTS idx_quality_status ON quality_checks(status)`
    console.log('  ✓ idx_quality_status')
    
    await sql`CREATE INDEX IF NOT EXISTS idx_quality_meal ON quality_checks(meal_service)`
    console.log('  ✓ idx_quality_meal')
    
    await sql`CREATE INDEX IF NOT EXISTS idx_quality_submitted_by ON quality_checks(submitted_by)`
    console.log('  ✓ idx_quality_submitted_by')
    
    await sql`CREATE INDEX IF NOT EXISTS idx_quality_branch_date ON quality_checks(branch_slug, submission_date)`
    console.log('  ✓ idx_quality_branch_date')

    console.log('\n═'.repeat(50))
    console.log('✅ Quality checks table created successfully!')
    console.log('═'.repeat(50))
    console.log('\n📊 Table created:')
    console.log('   - quality_checks')
    console.log('\n📊 Indexes created:')
    console.log('   - idx_quality_branch')
    console.log('   - idx_quality_date')
    console.log('   - idx_quality_section')
    console.log('   - idx_quality_status')
    console.log('   - idx_quality_meal')
    console.log('   - idx_quality_submitted_by')
    console.log('   - idx_quality_branch_date')

  } catch (error) {
    console.error('❌ Table creation failed:', error)
    throw error
  }
}

// Run the migration
createQualityChecksTable()
  .then(() => {
    console.log('\n🎉 Quality checks database setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Setup error:', error)
    process.exit(1)
  })

