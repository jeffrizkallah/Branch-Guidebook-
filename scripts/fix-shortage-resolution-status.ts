/**
 * Migration script to fix shortage resolution_status
 * Sets resolution_status to 'PENDING' for all shortages that have NULL or missing resolution_status
 */

import { sql } from '@vercel/postgres'

async function fixShortageResolutionStatus() {
  try {
    console.log('🔧 Fixing shortage resolution_status...')
    
    // Update all shortages with NULL resolution_status to 'PENDING'
    const result = await sql`
      UPDATE ingredient_shortages
      SET resolution_status = 'PENDING'
      WHERE resolution_status IS NULL
    `
    
    console.log(`✅ Updated ${result.rowCount} shortage records`)
    
    // Verify the changes
    const pendingCount = await sql`
      SELECT COUNT(*) as count
      FROM ingredient_shortages
      WHERE resolution_status = 'PENDING' OR resolution_status IS NULL
    `
    
    console.log(`📊 Total PENDING shortages: ${pendingCount.rows[0].count}`)
    
    const resolvedCount = await sql`
      SELECT COUNT(*) as count
      FROM ingredient_shortages
      WHERE resolution_status = 'RESOLVED'
    `
    
    console.log(`📊 Total RESOLVED shortages: ${resolvedCount.rows[0].count}`)
    
  } catch (error) {
    console.error('❌ Error fixing shortage resolution_status:', error)
    throw error
  }
}

// Run the migration
fixShortageResolutionStatus()
  .then(() => {
    console.log('✅ Migration complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
