require('dotenv').config({ path: '.env.local' })
const { Pool, neonConfig } = require('@neondatabase/serverless')
const ws = require('ws')

neonConfig.webSocketConstructor = ws

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params)
  return { rows: result.rows, rowCount: result.rowCount }
}

async function diagnose() {
  try {
    const weekStart = '2026-01-25'
    const weekEnd = '2026-01-29'
    
    console.log('\n=== DIAGNOSING TRANSFER MATCHING ISSUE ===\n')
    console.log(`Date range: ${weekStart} to ${weekEnd}\n`)
    
    // Check what from_branch values exist in the transfers table
    console.log('1. Checking distinct from_branch values in transfer table:\n')
    
    const distinctBranches = await query(`
      SELECT DISTINCT from_branch, COUNT(*) as transfer_count
      FROM odoo_transfer
      WHERE effective_date >= $1::date 
        AND effective_date <= $2::date
      GROUP BY from_branch
      ORDER BY transfer_count DESC
    `, [weekStart, weekEnd])
    
    console.log(`Found ${distinctBranches.rowCount} distinct from_branch values:\n`)
    distinctBranches.rows.forEach(row => {
      console.log(`  "${row.from_branch}" (${row.transfer_count} transfers)`)
    })
    
    // Test the current query pattern
    console.log('\n2. Testing current API query pattern:\n')
    
    const currentQuery = await query(`
      SELECT
        from_branch,
        COUNT(*) as match_count,
        SUM(quantity) as total_qty,
        SUM(cost) as total_cost
      FROM odoo_transfer
      WHERE effective_date >= $1::date 
        AND effective_date <= $2::date
        AND (
          from_branch ILIKE '%Mikana International Catering Services - UAE%'
          OR from_branch ILIKE '%Mikana International Catering Services%'
          OR from_branch ILIKE '%central%kitchen%'
          OR from_branch ILIKE '%central_kitchen%'
          OR from_branch ILIKE 'ck %'
          OR from_branch ILIKE 'ck_%'
          OR from_branch ILIKE '%/ck/%'
          OR LOWER(TRIM(from_branch)) = 'ck'
          OR LOWER(TRIM(from_branch)) = 'central kitchen'
          OR LOWER(TRIM(from_branch)) LIKE '%production%'
          OR from_branch ILIKE '%mikana%ck%'
          OR from_branch ILIKE '%mikana%kitchen%'
          OR from_branch ILIKE '%mikana%international%catering%'
          OR from_branch ILIKE '%catering%services%'
        )
      GROUP BY from_branch
    `, [weekStart, weekEnd])
    
    console.log(`Current pattern matched: ${currentQuery.rowCount} from_branch values\n`)
    if (currentQuery.rowCount > 0) {
      currentQuery.rows.forEach(row => {
        console.log(`  ✓ MATCHED: "${row.from_branch}"`)
        console.log(`    Transfers: ${row.match_count} | Qty: ${row.total_qty} | Cost: ${row.total_cost}`)
      })
    } else {
      console.log('  ❌ NO MATCHES FOUND')
    }
    
    // Get all transfers for the week to see the data
    console.log('\n3. Sample transfers from this week:\n')
    
    const sampleTransfers = await query(`
      SELECT
        effective_date,
        from_branch,
        to_branch,
        items,
        quantity,
        cost
      FROM odoo_transfer
      WHERE effective_date >= $1::date 
        AND effective_date <= $2::date
      ORDER BY effective_date DESC
      LIMIT 5
    `, [weekStart, weekEnd])
    
    sampleTransfers.rows.forEach((row, idx) => {
      console.log(`  Transfer ${idx + 1}:`)
      console.log(`    Date: ${row.effective_date}`)
      console.log(`    From: "${row.from_branch}"`)
      console.log(`    To: "${row.to_branch}"`)
      console.log(`    Item: "${row.items}"`)
      console.log(`    Qty: ${row.quantity} | Cost: ${row.cost}`)
      console.log()
    })
    
    // Test if the fallback catches it
    console.log('4. Testing fallback query (all transfers):\n')
    
    const fallback = await query(`
      SELECT
        COUNT(*) as total_transfers,
        SUM(quantity) as total_qty,
        SUM(cost) as total_cost
      FROM odoo_transfer
      WHERE effective_date >= $1::date 
        AND effective_date <= $2::date
    `, [weekStart, weekEnd])
    
    console.log(`  Total transfers (fallback): ${fallback.rows[0].total_transfers}`)
    console.log(`  Total quantity: ${fallback.rows[0].total_qty}`)
    console.log(`  Total cost: ${fallback.rows[0].total_cost}`)
    
    console.log('\n=== DIAGNOSIS COMPLETE ===\n')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

diagnose()
