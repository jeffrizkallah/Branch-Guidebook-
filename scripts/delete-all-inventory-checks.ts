/**
 * Delete all inventory check records from the database
 * Use this when you want to start fresh with inventory checks
 */

import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables
config({ path: '.env.local' })

async function deleteAllChecks() {
  try {
    console.log('⚠️  WARNING: This will delete ALL inventory check records!\n')
    
    // Count records before deletion
    const checksCount = await sql`
      SELECT COUNT(*) as count FROM inventory_checks
    `
    const shortagesCount = await sql`
      SELECT COUNT(*) as count FROM ingredient_shortages
    `
    
    console.log(`Found ${checksCount.rows[0].count} records in inventory_checks table`)
    console.log(`Found ${shortagesCount.rows[0].count} records in ingredient_shortages table\n`)
    
    if (checksCount.rows[0].count === '0' && shortagesCount.rows[0].count === '0') {
      console.log('✅ No records to delete - tables are already empty!')
      process.exit(0)
    }
    
    console.log('🗑️  Deleting all records...\n')
    
    // Delete from ingredient_shortages first (due to foreign key constraint)
    const shortagesResult = await sql`
      DELETE FROM ingredient_shortages
    `
    console.log(`✅ Deleted ${shortagesResult.rowCount} records from ingredient_shortages`)
    
    // Delete from inventory_checks
    const checksResult = await sql`
      DELETE FROM inventory_checks
    `
    console.log(`✅ Deleted ${checksResult.rowCount} records from inventory_checks`)
    
    console.log('\n✅ All inventory check records have been deleted!')
    console.log('ℹ️  Refresh your dashboard - it should now show "Run Inventory Check" button\n')

  } catch (error) {
    console.error('❌ Error deleting records:', error)
  } finally {
    process.exit(0)
  }
}

deleteAllChecks()
