/**
 * Diagnostic script to check shortage/check relationship
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { sql } from '@vercel/postgres'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function diagnose() {
  try {
    console.log('🔍 Diagnosing shortage visibility issues...\n')
    
    // Count total shortages
    const totalShortages = await sql`
      SELECT COUNT(*) as count
      FROM ingredient_shortages
      WHERE resolution_status = 'PENDING' OR resolution_status IS NULL
    `
    console.log(`📊 Total PENDING shortages: ${totalShortages.rows[0].count}`)
    
    // Count shortages WITH matching checks
    const withChecks = await sql`
      SELECT COUNT(*) as count
      FROM ingredient_shortages s
      INNER JOIN inventory_checks c ON s.check_id = c.check_id
      WHERE s.resolution_status = 'PENDING' OR s.resolution_status IS NULL
    `
    console.log(`✅ Shortages WITH matching checks: ${withChecks.rows[0].count}`)
    
    // Count shortages WITHOUT matching checks
    const withoutChecks = await sql`
      SELECT COUNT(*) as count
      FROM ingredient_shortages s
      LEFT JOIN inventory_checks c ON s.check_id = c.check_id
      WHERE (s.resolution_status = 'PENDING' OR s.resolution_status IS NULL)
        AND c.check_id IS NULL
    `
    console.log(`❌ Shortages WITHOUT matching checks: ${withoutChecks.rows[0].count}`)
    
    // Show sample shortage records
    console.log('\n📝 Sample shortages:')
    const samples = await sql`
      SELECT 
        s.shortage_id,
        s.check_id,
        s.ingredient_name,
        s.priority,
        s.resolution_status,
        CASE WHEN c.check_id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as check_exists
      FROM ingredient_shortages s
      LEFT JOIN inventory_checks c ON s.check_id = c.check_id
      WHERE s.resolution_status = 'PENDING' OR s.resolution_status IS NULL
      LIMIT 5
    `
    
    samples.rows.forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.ingredient_name}`)
      console.log(`   - Shortage ID: ${row.shortage_id}`)
      console.log(`   - Check ID: ${row.check_id}`)
      console.log(`   - Check exists: ${row.check_exists}`)
      console.log(`   - Priority: ${row.priority}`)
      console.log(`   - Resolution status: ${row.resolution_status || 'NULL'}`)
    })
    
    // Check if there are any checks at all
    console.log('\n📋 Inventory checks info:')
    const checksInfo = await sql`
      SELECT COUNT(*) as count
      FROM inventory_checks
    `
    console.log(`Total inventory checks: ${checksInfo.rows[0].count}`)
    
    if (checksInfo.rows[0].count > 0) {
      const recentChecks = await sql`
        SELECT check_id, schedule_id, check_date, overall_status
        FROM inventory_checks
        ORDER BY check_date DESC
        LIMIT 3
      `
      console.log('\nMost recent checks:')
      recentChecks.rows.forEach((row, i) => {
        console.log(`${i + 1}. Check ID: ${row.check_id}`)
        console.log(`   Schedule: ${row.schedule_id}`)
        console.log(`   Date: ${row.check_date}`)
        console.log(`   Status: ${row.overall_status}\n`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Run diagnostic
diagnose()
  .then(() => {
    console.log('\n✅ Diagnostic complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error)
    process.exit(1)
  })
