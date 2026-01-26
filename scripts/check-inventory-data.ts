/**
 * Check what inventory check records exist in the database
 */

import { config } from 'dotenv'
import { sql } from '@vercel/postgres'

// Load environment variables
config({ path: '.env.local' })

async function checkInventoryData() {
  try {
    console.log('🔍 Checking inventory check records...\n')

    // Check inventory_checks table
    const checksResult = await sql`
      SELECT 
        check_id,
        schedule_id,
        check_date,
        status,
        total_ingredients_required,
        missing_ingredients_count,
        partial_ingredients_count,
        sufficient_ingredients_count,
        overall_status
      FROM inventory_checks
      ORDER BY check_date DESC
      LIMIT 10
    `

    console.log('📋 INVENTORY_CHECKS TABLE:')
    console.log(`Found ${checksResult.rows.length} records\n`)
    
    if (checksResult.rows.length > 0) {
      checksResult.rows.forEach(row => {
        console.log(`Check ID: ${row.check_id}`)
        console.log(`Schedule ID: ${row.schedule_id}`)
        console.log(`Check Date: ${row.check_date}`)
        console.log(`Status: ${row.status}`)
        console.log(`Overall Status: ${row.overall_status}`)
        console.log(`Missing: ${row.missing_ingredients_count}, Partial: ${row.partial_ingredients_count}, Sufficient: ${row.sufficient_ingredients_count}`)
        console.log('---')
      })
    } else {
      console.log('✅ No records found - table is empty!')
    }

    console.log('\n')

    // Check ingredient_shortages table
    const shortagesResult = await sql`
      SELECT 
        shortage_id,
        check_id,
        schedule_id,
        ingredient_name,
        status,
        priority,
        shortfall_amount,
        unit
      FROM ingredient_shortages
      LIMIT 20
    `

    console.log('📋 INGREDIENT_SHORTAGES TABLE:')
    console.log(`Found ${shortagesResult.rows.length} records\n`)
    
    if (shortagesResult.rows.length > 0) {
      shortagesResult.rows.forEach(row => {
        console.log(`Shortage ID: ${row.shortage_id}`)
        console.log(`Check ID: ${row.check_id}`)
        console.log(`Schedule ID: ${row.schedule_id}`)
        console.log(`Ingredient: ${row.ingredient_name}`)
        console.log(`Status: ${row.status}, Priority: ${row.priority}`)
        console.log(`Shortfall: ${row.shortfall_amount} ${row.unit}`)
        console.log('---')
      })
    } else {
      console.log('✅ No records found - table is empty!')
    }

    console.log('\n✅ Check complete!')

  } catch (error) {
    console.error('❌ Error checking data:', error)
  } finally {
    process.exit(0)
  }
}

checkInventoryData()
