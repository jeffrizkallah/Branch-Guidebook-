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

    // Get this week's totals - using COGS (transfer cost) instead of revenue
    const thisWeekResult = await sql`
      WITH received AS (
        SELECT COALESCE(SUM(cost), 0) as cogs
        FROM odoo_transfer
        WHERE effective_date >= ${thisWeekStartStr}::date AND effective_date <= ${thisWeekEndStr}::date
          AND to_branch NOT ILIKE '%central%'
          AND to_branch NOT ILIKE '%kitchen%'
          AND to_branch NOT ILIKE '%ck %'
          AND to_branch NOT ILIKE 'ck_%'
      ),
      waste AS (
        SELECT COALESCE(SUM(cost), 0) as waste_cost
        FROM odoo_waste
        WHERE date >= ${thisWeekStartStr}::date AND date <= ${thisWeekEndStr}::date
      )
      SELECT
        r.cogs as total_cogs,
        w.waste_cost as total_waste,
        CASE
          WHEN r.cogs > 0
          THEN ROUND((w.waste_cost / r.cogs) * 100, 2)
          ELSE 0
        END as waste_pct
      FROM received r, waste w
    `

    // Get last week's totals - using COGS (transfer cost) instead of revenue
    const lastWeekResult = await sql`
      WITH received AS (
        SELECT COALESCE(SUM(cost), 0) as cogs
        FROM odoo_transfer
        WHERE effective_date >= ${lastWeekStartStr}::date AND effective_date <= ${lastWeekEndStr}::date
          AND to_branch NOT ILIKE '%central%'
          AND to_branch NOT ILIKE '%kitchen%'
          AND to_branch NOT ILIKE '%ck %'
          AND to_branch NOT ILIKE 'ck_%'
      ),
      waste AS (
        SELECT COALESCE(SUM(cost), 0) as waste_cost
        FROM odoo_waste
        WHERE date >= ${lastWeekStartStr}::date AND date <= ${lastWeekEndStr}::date
      )
      SELECT
        r.cogs as total_cogs,
        w.waste_cost as total_waste,
        CASE
          WHEN r.cogs > 0
          THEN ROUND((w.waste_cost / r.cogs) * 100, 2)
          ELSE 0
        END as waste_pct
      FROM received r, waste w
    `

    // Get high waste branches (>5%) for this week - using COGS instead of revenue
    // Use normalized branch names for better matching between tables
    const highWasteResult = await sql`
      WITH received AS (
        SELECT
          to_branch as branch,
          LOWER(REGEXP_REPLACE(TRIM(to_branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
          COALESCE(SUM(cost), 0) as cogs
        FROM odoo_transfer
        WHERE effective_date >= ${thisWeekStartStr}::date AND effective_date <= ${thisWeekEndStr}::date
        GROUP BY to_branch
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
          COALESCE(r.branch, w.branch) as branch,
          COALESCE(r.cogs, 0) as cogs,
          COALESCE(w.waste_cost, 0) as waste_cost,
          CASE
            WHEN COALESCE(r.cogs, 0) > 0
            THEN ROUND((COALESCE(w.waste_cost, 0) / r.cogs) * 100, 2)
            ELSE 0
          END as waste_pct
        FROM received r
        FULL OUTER JOIN waste w ON r.normalized_branch = w.normalized_branch
        WHERE COALESCE(r.branch, w.branch) IS NOT NULL
          AND COALESCE(r.branch, w.branch) NOT ILIKE '%central%'
          AND COALESCE(r.branch, w.branch) NOT ILIKE '%kitchen%'
          AND COALESCE(r.branch, w.branch) NOT ILIKE '%ck %'
          AND COALESCE(r.branch, w.branch) NOT ILIKE 'ck_%'
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
