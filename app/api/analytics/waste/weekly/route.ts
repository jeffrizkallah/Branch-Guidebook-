import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Get current day of week (0 = Sunday, 6 = Saturday)
    const today = new Date()
    const dayOfWeek = today.getDay()

    // Week runs from Sunday to Friday, data synced Friday evening
    let weekStart: Date
    let weekEnd: Date

    if (dayOfWeek === 6) {
      // Saturday - show complete previous week (Sunday to Friday)
      weekStart = new Date(today)
      weekStart.setDate(today.getDate() - 6)
      weekStart.setHours(0, 0, 0, 0)

      weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() - 1)
      weekEnd.setHours(23, 59, 59, 999)
    } else if (dayOfWeek === 0) {
      // Sunday - show the previous complete week
      weekStart = new Date(today)
      weekStart.setDate(today.getDate() - 7)
      weekStart.setHours(0, 0, 0, 0)

      weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() - 2)
      weekEnd.setHours(23, 59, 59, 999)
    } else {
      // Monday-Friday - show current week so far
      weekStart = new Date(today)
      weekStart.setDate(today.getDate() - dayOfWeek)
      weekStart.setHours(0, 0, 0, 0)

      weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() - 1)
      weekEnd.setHours(23, 59, 59, 999)
    }

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Calculate COGS using recipe-based costs
    // For items with recipes, use recipe_total_cost
    // For items without recipes, estimate cost as 30% of revenue (typical food cost %)
    const result = await sql`
      WITH sales_with_cost AS (
        SELECT
          s.branch,
          s.items,
          s.qty,
          s.price_subtotal_with_tax as item_revenue,
          -- Get recipe cost (using MAX to handle duplicates)
          COALESCE(MAX(r.recipe_total_cost), 0) as unit_cost,
          -- Calculate item COGS: qty × recipe_cost, or fallback to 30% of revenue
          CASE
            WHEN MAX(r.recipe_total_cost) IS NOT NULL AND MAX(r.recipe_total_cost) > 0
            THEN s.qty * MAX(r.recipe_total_cost)
            ELSE s.price_subtotal_with_tax * 0.30
          END as item_cogs
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
          SUM(item_revenue) as total_revenue
        FROM sales_with_cost
        GROUP BY branch
      ),
      waste AS (
        SELECT
          branch,
          LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
          COALESCE(SUM(cost), 0) as waste_cost,
          COUNT(*) as waste_records
        FROM odoo_waste
        WHERE date >= ${weekStartStr}::date AND date <= ${weekEndStr}::date
        GROUP BY branch
      )
      SELECT
        COALESCE(bc.branch, w.branch) as branch,
        COALESCE(w.waste_cost, 0) as waste_amount,
        COALESCE(bc.total_cogs, 0) as cogs,
        COALESCE(bc.total_revenue, 0) as order_revenue,
        COALESCE(bc.total_revenue, 0) as revenue,
        COALESCE(w.waste_records, 0) as waste_records,
        CASE
          WHEN COALESCE(bc.total_cogs, 0) > 0
          THEN ROUND((COALESCE(w.waste_cost, 0) / bc.total_cogs) * 100, 2)
          ELSE 0
        END as waste_pct
      FROM branch_cogs bc
      FULL OUTER JOIN waste w ON bc.normalized_branch = w.normalized_branch
      WHERE COALESCE(bc.branch, w.branch) IS NOT NULL
        AND COALESCE(bc.branch, w.branch) NOT ILIKE '%central%'
        AND COALESCE(bc.branch, w.branch) NOT ILIKE '%kitchen%'
        AND COALESCE(bc.branch, w.branch) NOT ILIKE '%ck %'
        AND COALESCE(bc.branch, w.branch) NOT ILIKE 'ck_%'
      ORDER BY waste_pct DESC
    `

    // Determine data quality for each branch
    const branches = result.rows.map(row => ({
      branch: row.branch || 'Unknown',
      wasteAmount: Number(row.waste_amount),
      cogs: Number(row.cogs),
      orderRevenue: Number(row.cogs), // Show COGS as "orderRevenue" for display
      revenue: Number(row.revenue), // Actual revenue for food cost calculation
      wastePct: Number(row.waste_pct),
      dataQuality: Number(row.waste_records) > 0 ? 'complete' : 'partial' as 'complete' | 'partial'
    }))

    return NextResponse.json({
      branches,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
    })
  } catch (error) {
    console.error('Weekly waste analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly waste analytics' },
      { status: 500 }
    )
  }
}
