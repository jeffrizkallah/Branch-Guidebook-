import { sql } from '@vercel/postgres'

async function checkTransfers() {
  try {
    // Check current week transfers (Jan 25-29)
    const currentWeekStart = '2026-01-25'
    const currentWeekEnd = '2026-01-29'
    
    console.log(`\n=== Checking transfers for ${currentWeekStart} to ${currentWeekEnd} ===\n`)
    
    // Get all transfers in current week
    const currentWeekTransfers = await sql`
      SELECT 
        effective_date,
        from_branch,
        to_branch,
        quantity,
        cost,
        items
      FROM odoo_transfer
      WHERE effective_date >= ${currentWeekStart}::date 
        AND effective_date <= ${currentWeekEnd}::date
      ORDER BY effective_date DESC
      LIMIT 20
    `
    
    console.log(`Found ${currentWeekTransfers.rowCount} transfers in current week`)
    console.log('\nFirst 20 transfers:')
    currentWeekTransfers.rows.forEach(row => {
      console.log(`  ${row.effective_date} | ${row.from_branch} -> ${row.to_branch} | Qty: ${row.quantity} | Cost: ${row.cost}`)
    })
    
    // Get transfers from the date in the screenshot (Jan 5)
    console.log('\n\n=== Checking transfers for 2026-01-05 (date in your screenshot) ===\n')
    
    const jan5Transfers = await sql`
      SELECT 
        effective_date,
        from_branch,
        to_branch,
        COUNT(*) as transfer_count,
        SUM(quantity) as total_quantity,
        SUM(cost) as total_cost
      FROM odoo_transfer
      WHERE effective_date = '2026-01-05'::date
      GROUP BY effective_date, from_branch, to_branch
    `
    
    console.log(`Found ${jan5Transfers.rowCount} transfer groups on Jan 5`)
    jan5Transfers.rows.forEach(row => {
      console.log(`  ${row.from_branch} -> ${row.to_branch}`)
      console.log(`    Count: ${row.transfer_count} | Total Qty: ${row.total_quantity} | Total Cost: ${row.total_cost}`)
    })
    
    // Check date range of all transfers
    console.log('\n\n=== Transfer date range in database ===\n')
    
    const dateRange = await sql`
      SELECT 
        MIN(effective_date) as earliest_date,
        MAX(effective_date) as latest_date,
        COUNT(*) as total_transfers
      FROM odoo_transfer
    `
    
    console.log(`Total transfers in database: ${dateRange.rows[0].total_transfers}`)
    console.log(`Earliest transfer: ${dateRange.rows[0].earliest_date}`)
    console.log(`Latest transfer: ${dateRange.rows[0].latest_date}`)
    
    // Check Central Kitchen naming patterns
    console.log('\n\n=== Central Kitchen naming patterns ===\n')
    
    const ckNames = await sql`
      SELECT DISTINCT from_branch, COUNT(*) as transfer_count
      FROM odoo_transfer
      WHERE from_branch ILIKE '%mikana%'
         OR from_branch ILIKE '%central%'
         OR from_branch ILIKE '%kitchen%'
         OR from_branch ILIKE '%catering%'
      GROUP BY from_branch
      ORDER BY transfer_count DESC
    `
    
    console.log(`Found ${ckNames.rowCount} potential Central Kitchen branch names:`)
    ckNames.rows.forEach(row => {
      console.log(`  "${row.from_branch}" (${row.transfer_count} transfers)`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

checkTransfers()
