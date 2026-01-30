import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Alert threshold for high waste (5%)
const HIGH_WASTE_THRESHOLD = 5.0

export async function GET() {
  try {
    // Calculate this week's date range (Sunday to yesterday or Friday)
    const today = new Date()
    const dayOfWeek = today.getDay()

    let thisWeekStart: Date
    let thisWeekEnd: Date
    let lastWeekStart: Date
    let lastWeekEnd: Date

    if (dayOfWeek === 6) {
      // Saturday - this week is Sunday to Friday (complete)
      thisWeekStart = new Date(today)
      thisWeekStart.setDate(today.getDate() - 6)
      thisWeekEnd = new Date(today)
      thisWeekEnd.setDate(today.getDate() - 1)
    } else if (dayOfWeek === 0) {
      // Sunday - show previous week as "this week"
      thisWeekStart = new Date(today)
      thisWeekStart.setDate(today.getDate() - 7)
      thisWeekEnd = new Date(today)
      thisWeekEnd.setDate(today.getDate() - 2)
    } else {
      // Monday-Friday - this week is Sunday to yesterday
      thisWeekStart = new Date(today)
      thisWeekStart.setDate(today.getDate() - dayOfWeek)
      thisWeekEnd = new Date(today)
      thisWeekEnd.setDate(today.getDate() - 1)
    }

    // Last week is 7 days before this week
    lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(thisWeekStart.getDate() - 7)
    lastWeekEnd = new Date(thisWeekEnd)
    lastWeekEnd.setDate(thisWeekEnd.getDate() - 7)

    const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0]
    const thisWeekEndStr = thisWeekEnd.toISOString().split('T')[0]
    const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0]
    const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0]

    // Get this week's totals - using recipe-based COGS
    const thisWeekResult = await sql`
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
          END as item_cogs
        FROM odoo_sales s
        LEFT JOIN odoo_recipe r ON LOWER(TRIM(s.items)) = LOWER(TRIM(r.item))
        WHERE s.date >= ${thisWeekStartStr}::date 
          AND s.date <= ${thisWeekEndStr}::date
          AND s.branch IS NOT NULL
          AND s.branch != ''
          AND s.branch NOT ILIKE '%central%'
          AND s.branch NOT ILIKE '%kitchen%'
          AND s.branch NOT ILIKE '%ck %'
          AND s.branch NOT ILIKE 'ck_%'
        GROUP BY s.id, s.branch, s.items, s.qty, s.price_subtotal_with_tax
      ),
      cogs_total AS (
        SELECT COALESCE(SUM(item_cogs), 0) as total_cogs
        FROM sales_with_cost
      ),
      waste AS (
        SELECT COALESCE(SUM(cost), 0) as waste_cost
        FROM odoo_waste
        WHERE date >= ${thisWeekStartStr}::date AND date <= ${thisWeekEndStr}::date
      )
      SELECT
        c.total_cogs,
        w.waste_cost as total_waste,
        CASE
          WHEN c.total_cogs > 0
          THEN ROUND((w.waste_cost / c.total_cogs) * 100, 2)
          ELSE 0
        END as waste_pct
      FROM cogs_total c, waste w
    `

    // Get last week's totals - using recipe-based COGS
    const lastWeekResult = await sql`
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
          END as item_cogs
        FROM odoo_sales s
        LEFT JOIN odoo_recipe r ON LOWER(TRIM(s.items)) = LOWER(TRIM(r.item))
        WHERE s.date >= ${lastWeekStartStr}::date 
          AND s.date <= ${lastWeekEndStr}::date
          AND s.branch IS NOT NULL
          AND s.branch != ''
          AND s.branch NOT ILIKE '%central%'
          AND s.branch NOT ILIKE '%kitchen%'
          AND s.branch NOT ILIKE '%ck %'
          AND s.branch NOT ILIKE 'ck_%'
        GROUP BY s.id, s.branch, s.items, s.qty, s.price_subtotal_with_tax
      ),
      cogs_total AS (
        SELECT COALESCE(SUM(item_cogs), 0) as total_cogs
        FROM sales_with_cost
      ),
      waste AS (
        SELECT COALESCE(SUM(cost), 0) as waste_cost
        FROM odoo_waste
        WHERE date >= ${lastWeekStartStr}::date AND date <= ${lastWeekEndStr}::date
      )
      SELECT
        c.total_cogs,
        w.waste_cost as total_waste,
        CASE
          WHEN c.total_cogs > 0
          THEN ROUND((w.waste_cost / c.total_cogs) * 100, 2)
          ELSE 0
        END as waste_pct
      FROM cogs_total c, waste w
    `

    // Get high waste branches (>5%) for this week - using recipe-based COGS
    const highWasteResult = await sql`
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
          END as item_cogs
        FROM odoo_sales s
        LEFT JOIN odoo_recipe r ON LOWER(TRIM(s.items)) = LOWER(TRIM(r.item))
        WHERE s.date >= ${thisWeekStartStr}::date 
          AND s.date <= ${thisWeekEndStr}::date
          AND s.branch IS NOT NULL
          AND s.branch != ''
        GROUP BY s.id, s.branch, s.items, s.qty, s.price_subtotal_with_tax
      ),
      branch_cogs AS (
        SELECT
          branch,
          LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
          SUM(item_cogs) as total_cogs
        FROM sales_with_cost
        GROUP BY branch
      ),
      waste AS (
        SELECT
          branch,
          LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
          COALESCE(SUM(cost), 0) as waste_cost
        FROM odoo_waste
        WHERE date >= ${thisWeekStartStr}::date AND date <= ${thisWeekEndStr}::date
        GROUP BY branch
      ),
      combined AS (
        SELECT
          COALESCE(bc.branch, w.branch) as branch,
          COALESCE(bc.total_cogs, 0) as cogs,
          COALESCE(w.waste_cost, 0) as waste_cost,
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
      )
      SELECT branch, waste_pct
      FROM combined
      WHERE waste_pct > ${HIGH_WASTE_THRESHOLD}
      ORDER BY waste_pct DESC
    `

    const thisWeek = thisWeekResult.rows[0]
    const lastWeek = lastWeekResult.rows[0]

    // Calculate week-over-week change
    const thisWeekPct = Number(thisWeek.waste_pct)
    const lastWeekPct = Number(lastWeek.waste_pct)
    const change = thisWeekPct - lastWeekPct

    const highWasteBranches = highWasteResult.rows.map(row => ({
      branch: row.branch || 'Unknown',
      wastePct: Number(row.waste_pct),
    }))

    return NextResponse.json({
      thisWeek: {
        totalWaste: Number(thisWeek.total_waste),
        totalCogs: Number(thisWeek.total_cogs),
        // Keep totalRevenue for backward compatibility, but set to COGS
        totalRevenue: Number(thisWeek.total_cogs),
        wastePct: thisWeekPct,
      },
      lastWeek: {
        totalWaste: Number(lastWeek.total_waste),
        totalCogs: Number(lastWeek.total_cogs),
        // Keep totalRevenue for backward compatibility, but set to COGS
        totalRevenue: Number(lastWeek.total_cogs),
        wastePct: lastWeekPct,
      },
      change: Math.round(change * 100) / 100,
      highWasteBranches,
      dateRange: {
        thisWeek: { start: thisWeekStartStr, end: thisWeekEndStr },
        lastWeek: { start: lastWeekStartStr, end: lastWeekEndStr },
      },
    })
  } catch (error) {
    console.error('Waste summary analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waste summary analytics' },
      { status: 500 }
    )
  }
}
