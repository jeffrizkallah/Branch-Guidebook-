import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch') || 'all'
    const days = parseInt(searchParams.get('days') || '7', 10)

    // Calculate date range
    const endDate = new Date()
    endDate.setDate(endDate.getDate() - 1) // Yesterday (most recent synced data)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - days + 1)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Get daily waste and sales data
    // Use normalized branch names for better matching between tables
    let dailyResult
    if (branch === 'all') {
      dailyResult = await sql`
        WITH daily_sales AS (
          SELECT
            date,
            branch,
            LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
            COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
          FROM odoo_sales
          WHERE date >= ${startDateStr}::date AND date <= ${endDateStr}::date
          GROUP BY date, branch
        ),
        daily_waste AS (
          SELECT
            date,
            branch,
            LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
            COALESCE(SUM(cost), 0) as waste_cost
          FROM odoo_waste
          WHERE date >= ${startDateStr}::date AND date <= ${endDateStr}::date
          GROUP BY date, branch
        )
        SELECT
          COALESCE(s.date, w.date) as date,
          COALESCE(s.branch, w.branch) as branch,
          COALESCE(w.waste_cost, 0) as waste_amount,
          COALESCE(s.revenue, 0) as order_revenue,
          CASE
            WHEN COALESCE(s.revenue, 0) > 0
            THEN ROUND((COALESCE(w.waste_cost, 0) / s.revenue) * 100, 2)
            ELSE 0
          END as waste_pct
        FROM daily_sales s
        FULL OUTER JOIN daily_waste w
          ON s.date = w.date AND s.normalized_branch = w.normalized_branch
        WHERE COALESCE(s.date, w.date) IS NOT NULL
        ORDER BY date DESC, waste_pct DESC
      `
    } else {
      // Normalize the branch parameter for matching
      dailyResult = await sql`
        WITH daily_sales AS (
          SELECT
            date,
            branch,
            LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
            COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
          FROM odoo_sales
          WHERE date >= ${startDateStr}::date AND date <= ${endDateStr}::date
            AND LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM(${branch}), '[_\\-\\s]+', ' ', 'g'))
          GROUP BY date, branch
        ),
        daily_waste AS (
          SELECT
            date,
            branch,
            LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
            COALESCE(SUM(cost), 0) as waste_cost
          FROM odoo_waste
          WHERE date >= ${startDateStr}::date AND date <= ${endDateStr}::date
            AND LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM(${branch}), '[_\\-\\s]+', ' ', 'g'))
          GROUP BY date, branch
        )
        SELECT
          COALESCE(s.date, w.date) as date,
          COALESCE(s.branch, w.branch) as branch,
          COALESCE(w.waste_cost, 0) as waste_amount,
          COALESCE(s.revenue, 0) as order_revenue,
          CASE
            WHEN COALESCE(s.revenue, 0) > 0
            THEN ROUND((COALESCE(w.waste_cost, 0) / s.revenue) * 100, 2)
            ELSE 0
          END as waste_pct
        FROM daily_sales s
        FULL OUTER JOIN daily_waste w
          ON s.date = w.date AND s.normalized_branch = w.normalized_branch
        WHERE COALESCE(s.date, w.date) IS NOT NULL
        ORDER BY date DESC, waste_pct DESC
      `
    }

    // Get top waste reasons for the period
    let reasonsResult
    if (branch === 'all') {
      reasonsResult = await sql`
        SELECT
          reason,
          COALESCE(SUM(cost), 0) as total_cost,
          COUNT(*) as occurrences
        FROM odoo_waste
        WHERE date >= ${startDateStr}::date AND date <= ${endDateStr}::date
          AND reason IS NOT NULL AND reason != ''
        GROUP BY reason
        ORDER BY total_cost DESC
        LIMIT 5
      `
    } else {
      // Use normalized branch name for matching
      reasonsResult = await sql`
        SELECT
          reason,
          COALESCE(SUM(cost), 0) as total_cost,
          COUNT(*) as occurrences
        FROM odoo_waste
        WHERE date >= ${startDateStr}::date AND date <= ${endDateStr}::date
          AND LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM(${branch}), '[_\\-\\s]+', ' ', 'g'))
          AND reason IS NOT NULL AND reason != ''
        GROUP BY reason
        ORDER BY total_cost DESC
        LIMIT 5
      `
    }

    const dailyData = dailyResult.rows.map(row => ({
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
      branch: row.branch || 'Unknown',
      wasteAmount: Number(row.waste_amount),
      orderRevenue: Number(row.order_revenue),
      wastePct: Number(row.waste_pct),
    }))

    const topWasteReasons = reasonsResult.rows.map(row => ({
      reason: row.reason || 'Unspecified',
      cost: Number(row.total_cost),
      occurrences: Number(row.occurrences),
    }))

    return NextResponse.json({
      dailyData,
      topWasteReasons,
      dateRange: {
        start: startDateStr,
        end: endDateStr,
      },
      branch: branch,
    })
  } catch (error) {
    console.error('Daily waste analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily waste analytics' },
      { status: 500 }
    )
  }
}
