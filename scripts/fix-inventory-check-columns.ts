/**
 * Fix ingredient_shortages table columns to handle larger quantities
 * 
 * Changes DECIMAL(10,2) to DECIMAL(15,3) to support:
 * - Larger quantities (up to 999,999,999,999.999)
 * - More precision for calculations
 * 
 * Run with: npx tsx scripts/fix-inventory-check-columns.ts
 */

import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

config({ path: '.env.local' })

async function fixInventoryCheckColumns() {
  const sql = neon(process.env.DATABASE_URL!)
  
  console.log('🔧 Fixing ingredient_shortages table columns...\n')
  
  try {
    console.log('📋 Altering required_quantity column...')
    await sql`
      ALTER TABLE ingredient_shortages 
      ALTER COLUMN required_quantity TYPE DECIMAL(15, 3)
    `
    console.log('✅ required_quantity updated to DECIMAL(15,3)')
    
    console.log('\n📋 Altering available_quantity column...')
    await sql`
      ALTER TABLE ingredient_shortages 
      ALTER COLUMN available_quantity TYPE DECIMAL(15, 3)
    `
    console.log('✅ available_quantity updated to DECIMAL(15,3)')
    
    console.log('\n📋 Altering shortfall_amount column...')
    await sql`
      ALTER TABLE ingredient_shortages 
      ALTER COLUMN shortfall_amount TYPE DECIMAL(15, 3)
    `
    console.log('✅ shortfall_amount updated to DECIMAL(15,3)')
    
    console.log('\n' + '═'.repeat(70))
    console.log('✅ All columns updated successfully!')
    console.log('   Can now handle quantities up to 999,999,999,999.999')
    console.log('═'.repeat(70))
    
  } catch (error: any) {
    console.error('\n❌ Error updating columns:', error.message)
    process.exit(1)
  }
}

fixInventoryCheckColumns()
