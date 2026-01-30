/**
 * Check Recipe Matching Quality
 * 
 * This script checks what percentage of sales items have matching recipes
 * to assess data quality before implementing recipe-based COGS calculation.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { sql } from '@vercel/postgres'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Verify database connection
if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.error('❌ Missing database connection. Set POSTGRES_URL or DATABASE_URL in .env.local')
  process.exit(1)
}

async function checkRecipeMatching() {
  console.log('═'.repeat(70))
  console.log('🔍 CHECKING RECIPE MATCHING QUALITY')
  console.log('═'.repeat(70))
  console.log()

  try {
    // Check recent sales (last 30 days)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    const dateStr = startDate.toISOString().split('T')[0]

    console.log(`📊 Analyzing sales from ${dateStr} to today...\n`)

    // Get sales items with and without matching recipes
    const result = await sql`
      WITH sales_items AS (
        SELECT DISTINCT
          s.items,
          s.category,
          COUNT(*) as sale_count,
          SUM(s.qty) as total_qty,
          SUM(s.price_subtotal_with_tax) as total_revenue
        FROM odoo_sales s
        WHERE s.date >= ${dateStr}
          AND s.items IS NOT NULL
          AND s.items != ''
        GROUP BY s.items, s.category
      ),
      matched_items AS (
        SELECT
          si.*,
          r.recipe_total_cost,
          CASE WHEN r.item IS NOT NULL THEN 'matched' ELSE 'unmatched' END as match_status
        FROM sales_items si
        LEFT JOIN (
          SELECT DISTINCT
            item,
            MAX(recipe_total_cost) as recipe_total_cost
          FROM odoo_recipe
          GROUP BY item
        ) r ON LOWER(TRIM(si.items)) = LOWER(TRIM(r.item))
      )
      SELECT
        match_status,
        COUNT(*) as unique_items,
        SUM(sale_count) as total_sales,
        SUM(total_qty) as total_quantity,
        SUM(total_revenue) as total_revenue,
        ROUND(AVG(recipe_total_cost), 2) as avg_recipe_cost
      FROM matched_items
      GROUP BY match_status
      ORDER BY match_status
    `

    const matched = result.rows.find(r => r.match_status === 'matched') || {
      unique_items: 0,
      total_sales: 0,
      total_quantity: 0,
      total_revenue: 0,
    }
    const unmatched = result.rows.find(r => r.match_status === 'unmatched') || {
      unique_items: 0,
      total_sales: 0,
      total_quantity: 0,
      total_revenue: 0,
    }

    const totalItems = Number(matched.unique_items) + Number(unmatched.unique_items)
    const totalRevenue = Number(matched.total_revenue) + Number(unmatched.total_revenue)
    const matchPct = totalItems > 0 ? (Number(matched.unique_items) / totalItems) * 100 : 0
    const revenuePct = totalRevenue > 0 ? (Number(matched.total_revenue) / totalRevenue) * 100 : 0

    console.log('📈 MATCHING RESULTS:')
    console.log('─'.repeat(70))
    console.log(`✅ Matched Items:     ${matched.unique_items} / ${totalItems} (${matchPct.toFixed(1)}%)`)
    console.log(`   Sales Count:       ${Number(matched.total_sales).toLocaleString()}`)
    console.log(`   Revenue:           AED ${Number(matched.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
    console.log(`   Revenue %:         ${revenuePct.toFixed(1)}%`)
    console.log()
    console.log(`❌ Unmatched Items:   ${unmatched.unique_items} / ${totalItems} (${(100 - matchPct).toFixed(1)}%)`)
    console.log(`   Sales Count:       ${Number(unmatched.total_sales).toLocaleString()}`)
    console.log(`   Revenue:           AED ${Number(unmatched.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
    console.log(`   Revenue %:         ${(100 - revenuePct).toFixed(1)}%`)
    console.log()

    // Get top unmatched items by revenue
    const unmatchedItems = await sql`
      SELECT
        si.items,
        si.category,
        COUNT(*) as sale_count,
        SUM(si.qty) as total_qty,
        SUM(si.price_subtotal_with_tax) as total_revenue
      FROM odoo_sales si
      LEFT JOIN odoo_recipe r ON LOWER(TRIM(si.items)) = LOWER(TRIM(r.item))
      WHERE si.date >= ${dateStr}
        AND si.items IS NOT NULL
        AND si.items != ''
        AND r.item IS NULL
      GROUP BY si.items, si.category
      ORDER BY SUM(si.price_subtotal_with_tax) DESC
      LIMIT 20
    `

    if (unmatchedItems.rows.length > 0) {
      console.log('🔍 TOP 20 UNMATCHED ITEMS (by revenue):')
      console.log('─'.repeat(70))
      unmatchedItems.rows.forEach((item, idx) => {
        console.log(`${(idx + 1).toString().padStart(2)}. ${item.items}`)
        console.log(`    Category: ${item.category || 'N/A'} | Revenue: AED ${Number(item.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
      })
      console.log()
    }

    // Assessment
    console.log('═'.repeat(70))
    console.log('📋 ASSESSMENT:')
    console.log('─'.repeat(70))
    
    if (revenuePct >= 90) {
      console.log('✅ EXCELLENT: Recipe matching covers >90% of revenue')
      console.log('   Ready to implement recipe-based COGS calculation')
    } else if (revenuePct >= 75) {
      console.log('✅ GOOD: Recipe matching covers >75% of revenue')
      console.log('   Can proceed with recipe-based COGS, but consider adding missing recipes')
    } else if (revenuePct >= 50) {
      console.log('⚠️  FAIR: Recipe matching covers 50-75% of revenue')
      console.log('   Should add more recipes before implementing, or use hybrid approach')
    } else {
      console.log('❌ POOR: Recipe matching covers <50% of revenue')
      console.log('   Need to add many more recipes before this approach is viable')
    }
    
    console.log('═'.repeat(70))

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

checkRecipeMatching()
  .then(() => {
    console.log('\n✨ Check complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
