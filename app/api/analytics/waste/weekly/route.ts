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

    // Get waste and COGS (cost of goods received) data per branch for the week
    // Use normalized branch names for better matching between tables
    // Calculate waste % against COGS (transfer cost) instead of revenue for more accurate metrics
    const result = await sql`
      WITH received AS (
        SELECT
          to_branch as branch,
          LOWER(REGEXP_REPLACE(TRIM(to_branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
          COALESCE(SUM(cost), 0) as cogs
        FROM odoo_transfer
        WHERE effective_date >= ${weekStartStr}::date AND effective_date <= ${weekEndStr}::date
        GROUP BY to_branch
      ),
      sales AS (
        SELECT
          branch,
          LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
          COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
        FROM odoo_sales
        WHERE date >= ${weekStartStr}::date AND date <= ${weekEndStr}::date
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
        COALESCE(r.branch, s.branch, w.branch) as branch,
        COALESCE(w.waste_cost, 0) as waste_amount,
        COALESCE(r.cogs, 0) as cogs,
        COALESCE(s.revenue, 0) as order_revenue,
        COALESCE(w.waste_records, 0) as waste_records,
        CASE
          WHEN COALESCE(r.cogs, 0) > 0
          THEN ROUND((COALESCE(w.waste_cost, 0) / r.cogs) * 100, 2)
          ELSE 0
        END as waste_pct
      FROM received r
      FULL OUTER JOIN sales s ON r.normalized_branch = s.normalized_branch
      FULL OUTER JOIN waste w ON COALESCE(r.normalized_branch, s.normalized_branch) = w.normalized_branch
      WHERE COALESCE(r.branch, s.branch, w.branch) IS NOT NULL
        AND COALESCE(r.branch, s.branch, w.branch) NOT ILIKE '%central%'
        AND COALESCE(r.branch, s.branch, w.branch) NOT ILIKE '%kitchen%'
        AND COALESCE(r.branch, s.branch, w.branch) NOT ILIKE '%ck %'
        AND COALESCE(r.branch, s.branch, w.branch) NOT ILIKE 'ck_%'
      ORDER BY waste_pct DESC
    `

    // Determine data quality for each branch
    const branches = result.rows.map(row => ({
      branch: row.branch || 'Unknown',
      wasteAmount: Number(row.waste_amount),
      cogs: Number(row.cogs),
      orderRevenue: Number(row.order_revenue),
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
