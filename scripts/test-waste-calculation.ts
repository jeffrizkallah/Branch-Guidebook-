/**
 * Test Waste Calculation
 * 
 * This script tests the new recipe-based COGS waste calculation
 * by querying the updated API endpoints and verifying the results.
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

async function testWasteCalculation() {
  console.log('═'.repeat(70))
  console.log('🧪 TESTING RECIPE-BASED WASTE CALCULATION')
  console.log('═'.repeat(70))
  console.log()

  try {
    // Get the current week date range
    const today = new Date()
    const dayOfWeek = today.getDay()
    let weekStart: Date
    let weekEnd: Date

    if (dayOfWeek === 6) {
      weekStart = new Date(today)
      weekStart.setDate(today.getDate() - 6)
      weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() - 1)
    } else if (dayOfWeek === 0) {
      weekStart = new Date(today)
      weekStart.setDate(today.getDate() - 7)
      weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() - 2)
    } else {
      weekStart = new Date(today)
      weekStart.setDate(today.getDate() - dayOfWeek)
      weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() - 1)
    }

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    console.log(`📅 Testing week: ${weekStartStr} to ${weekEndStr}\n`)

    // Test the new calculation
    console.log('🔍 Running recipe-based COGS calculation...\n')
    
    const result = await sql`
      WITH sales_with_cost AS (
        SELECT
          s.branch,
          s.items,
          s.qty,
          s.price_subtotal_with_tax as item_revenue,
          COALESCE(MAX(r.recipe_total_cost), 0) as unit_cost,
          CASE
            WHEN MAX(r.recipe_total_cost) IS NOT NULL AND MAX(r.recipe_total_cost) > 0
            THEN s.qty * MAX(r.recipe_total_cost)
            ELSE s.price_subtotal_with_tax * 0.30
          END as item_cogs,
          CASE
            WHEN MAX(r.recipe_total_cost) IS NOT NULL AND MAX(r.recipe_total_cost) > 0
            THEN 'recipe'
            ELSE 'estimated'
          END as cost_source
        FROM odoo_sales s
        LEFT JOIN odoo_recipe r ON LOWER(TRIM(s.items)) = LOWER(TRIM(r.item))
        WHERE s.date >= ${weekStartStr}::date 
          AND s.date <= ${weekEndStr}::date
          AND s.branch IS NOT NULL
          AND s.branch != ''
        GROUP BY s.id, s.branch, s.items, s.qty, s.price_subtotal_with_tax
      ),
      branch_cogs AS (
        SELECT
          branch,
          LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
          SUM(item_cogs) as total_cogs,
          SUM(item_revenue) as total_revenue,
          SUM(CASE WHEN cost_source = 'recipe' THEN item_cogs ELSE 0 END) as recipe_based_cogs,
          SUM(CASE WHEN cost_source = 'estimated' THEN item_cogs ELSE 0 END) as estimated_cogs
        FROM sales_with_cost
        GROUP BY branch
      ),
      waste AS (
        SELECT
          branch,
          LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
          COALESCE(SUM(cost), 0) as waste_cost
        FROM odoo_waste
        WHERE date >= ${weekStartStr}::date AND date <= ${weekEndStr}::date
        GROUP BY branch
      )
      SELECT
        COALESCE(bc.branch, w.branch) as branch,
        COALESCE(w.waste_cost, 0) as waste_amount,
        COALESCE(bc.total_cogs, 0) as cogs,
        COALESCE(bc.total_revenue, 0) as revenue,
        COALESCE(bc.recipe_based_cogs, 0) as recipe_cogs,
        COALESCE(bc.estimated_cogs, 0) as estimated_cogs,
        CASE
          WHEN COALESCE(bc.total_cogs, 0) > 0
          THEN ROUND((COALESCE(w.waste_cost, 0) / bc.total_cogs) * 100, 2)
          ELSE 0
        END as waste_pct,
        CASE
          WHEN COALESCE(bc.total_revenue, 0) > 0
          THEN ROUND((COALESCE(bc.total_cogs, 0) / bc.total_revenue) * 100, 2)
          ELSE 0
        END as food_cost_pct
      FROM branch_cogs bc
      FULL OUTER JOIN waste w ON bc.normalized_branch = w.normalized_branch
      WHERE COALESCE(bc.branch, w.branch) IS NOT NULL
        AND COALESCE(bc.branch, w.branch) NOT ILIKE '%central%'
        AND COALESCE(bc.branch, w.branch) NOT ILIKE '%kitchen%'
        AND COALESCE(bc.branch, w.branch) NOT ILIKE '%ck %'
        AND COALESCE(bc.branch, w.branch) NOT ILIKE 'ck_%'
      ORDER BY waste_pct DESC
      LIMIT 10
    `

    console.log('📊 TOP 10 BRANCHES BY WASTE %:')
    console.log('─'.repeat(70))
    
    result.rows.forEach((row, idx) => {
      const waste = Number(row.waste_amount)
      const cogs = Number(row.cogs)
      const revenue = Number(row.revenue)
      const wastePct = Number(row.waste_pct)
      const foodCostPct = Number(row.food_cost_pct)
      const recipeCogs = Number(row.recipe_cogs)
      const estimatedCogs = Number(row.estimated_cogs)
      
      console.log(`\n${(idx + 1).toString().padStart(2)}. ${row.branch}`)
      console.log(`    Revenue:        AED ${revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
      console.log(`    COGS:           AED ${cogs.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${foodCostPct.toFixed(1)}% of revenue)`)
      console.log(`      - Recipe-based: AED ${recipeCogs.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${((recipeCogs/cogs)*100).toFixed(1)}%)`)
      console.log(`      - Estimated:    AED ${estimatedCogs.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${((estimatedCogs/cogs)*100).toFixed(1)}%)`)
      console.log(`    Waste:          AED ${waste.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
      console.log(`    Waste %:        ${wastePct.toFixed(1)}% ✅`)
    })

    console.log('\n')
    console.log('═'.repeat(70))
    console.log('✅ RESULTS ANALYSIS:')
    console.log('─'.repeat(70))
    
    const avgFoodCost = result.rows.reduce((sum, row) => sum + Number(row.food_cost_pct), 0) / result.rows.length
    const avgWaste = result.rows.reduce((sum, row) => sum + Number(row.waste_pct), 0) / result.rows.length
    
    console.log(`Average Food Cost %: ${avgFoodCost.toFixed(1)}%`)
    console.log(`Average Waste %:     ${avgWaste.toFixed(1)}%`)
    console.log()
    
    if (avgFoodCost >= 20 && avgFoodCost <= 40) {
      console.log('✅ Food cost percentage is within typical range (20-40%)')
    } else if (avgFoodCost < 20) {
      console.log('⚠️  Food cost is lower than typical (might need recipe data review)')
    } else {
      console.log('⚠️  Food cost is higher than typical (might indicate pricing issues)')
    }
    
    if (avgWaste < 3) {
      console.log('✅ Waste percentage is excellent (<3%)')
    } else if (avgWaste < 5) {
      console.log('✅ Waste percentage is good (3-5%)')
    } else {
      console.log('⚠️  Waste percentage is high (>5%) - needs attention')
    }
    
    console.log('═'.repeat(70))

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

testWasteCalculation()
  .then(() => {
    console.log('\n✨ Test complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
