import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Get date range from params or default to current week
    let weekStart: string | null = searchParams.get('weekStart')
    let weekEnd: string | null = searchParams.get('weekEnd')

    if (!weekStart || !weekEnd) {
      // Default to current week (Sunday to yesterday)
      const today = new Date()
      const dayOfWeek = today.getDay()

      const start = new Date(today)
      if (dayOfWeek === 6) {
        // Saturday - show Sunday to Friday
        start.setDate(today.getDate() - 6)
      } else if (dayOfWeek === 0) {
        // Sunday - show previous week
        start.setDate(today.getDate() - 7)
      } else {
        // Monday-Friday - show Sunday to yesterday
        start.setDate(today.getDate() - dayOfWeek)
      }

      const end = new Date(today)
      if (dayOfWeek === 6) {
        end.setDate(today.getDate() - 1)
      } else if (dayOfWeek === 0) {
        end.setDate(today.getDate() - 2)
      } else {
        end.setDate(today.getDate() - 1)
      }

      weekStart = start.toISOString().split('T')[0]
      weekEnd = end.toISOString().split('T')[0]
    }

    // Get branch variance: what they received (transfers) vs what they sold
    // Use flexible matching: normalize branch names by removing underscores, dashes, and extra spaces
    const branchVarianceResult = await sql`
      WITH received AS (
        SELECT
          to_branch as branch,
          -- Normalize branch name for matching
          LOWER(REGEXP_REPLACE(TRIM(to_branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
          COALESCE(SUM(quantity), 0) as qty_received,
          COALESCE(SUM(cost), 0) as cost_received
        FROM odoo_transfer
        WHERE effective_date >= ${weekStart}::date AND effective_date <= ${weekEnd}::date
        GROUP BY to_branch
      ),
      sold AS (
        SELECT
          branch,
          -- Normalize branch name for matching
          LOWER(REGEXP_REPLACE(TRIM(branch), '[_\\-\\s]+', ' ', 'g')) as normalized_branch,
          COALESCE(SUM(qty), 0) as qty_sold,
          COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
        FROM odoo_sales
        WHERE date >= ${weekStart}::date AND date <= ${weekEnd}::date
        GROUP BY branch
      )
      SELECT
        COALESCE(s.branch, r.branch) as branch,
        COALESCE(r.qty_received, 0) as received,
        COALESCE(r.cost_received, 0) as received_cost,
        COALESCE(s.qty_sold, 0) as sold,
        COALESCE(s.revenue, 0) as revenue,
        COALESCE(r.qty_received, 0) - COALESCE(s.qty_sold, 0) as variance,
        CASE
          WHEN COALESCE(r.qty_received, 0) > 0
          THEN ROUND(((COALESCE(r.qty_received, 0) - COALESCE(s.qty_sold, 0)) / r.qty_received) * 100, 2)
          ELSE 0
        END as variance_pct,
        CASE
          WHEN COALESCE(r.qty_received, 0) > 0 AND COALESCE(r.cost_received, 0) > 0
          THEN ROUND(((COALESCE(r.qty_received, 0) - COALESCE(s.qty_sold, 0)) / r.qty_received) * r.cost_received, 2)
          ELSE 0
        END as variance_cost
      FROM sold s
      FULL OUTER JOIN received r ON r.normalized_branch = s.normalized_branch
      WHERE COALESCE(s.branch, r.branch) IS NOT NULL
        AND COALESCE(s.branch, r.branch) NOT ILIKE '%central%'
        AND COALESCE(s.branch, r.branch) NOT ILIKE '%kitchen%'
        AND COALESCE(s.branch, r.branch) NOT ILIKE '%ck %'
        AND COALESCE(s.branch, r.branch) NOT ILIKE 'ck_%'
      ORDER BY variance_pct DESC
    `

    // Get Central Kitchen production vs distribution
    // More flexible matching for Central Kitchen names (could be "Central Kitchen", "CK", "Central_Kitchen", etc.)
    // Also includes fallback: sum all outgoing transfers to selling branches
    const ckResult = await sql`
      WITH produced AS (
        SELECT
          COALESCE(SUM(quantity_to_produce), 0) as qty_produced
        FROM odoo_manufacturing
        WHERE scheduled_date >= ${weekStart}::date AND scheduled_date <= ${weekEnd}::date
          AND (state = 'done' OR state IS NULL)
      ),
      -- Transfers matching explicit CK patterns
      transferred_explicit AS (
        SELECT
          COALESCE(SUM(quantity), 0) as qty_transferred,
          COALESCE(SUM(cost), 0) as cost_transferred
        FROM odoo_transfer
        WHERE effective_date >= ${weekStart}::date AND effective_date <= ${weekEnd}::date
          AND (
            -- Explicit match for exact name
            from_branch ILIKE '%Mikana International Catering Services - UAE%'
            OR from_branch ILIKE '%Mikana International Catering Services%'
            -- Other CK patterns
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
      ),
      -- Fallback: Sum ALL transfers in the date range
      -- In most bakery/kitchen business models, transfers are primarily from CK to branches
      transferred_fallback AS (
        SELECT
          COALESCE(SUM(t.quantity), 0) as qty_transferred,
          COALESCE(SUM(t.cost), 0) as cost_transferred
        FROM odoo_transfer t
        WHERE t.effective_date >= ${weekStart}::date AND t.effective_date <= ${weekEnd}::date
      ),
      transferred AS (
        SELECT
          -- Use explicit match if found, otherwise use fallback
          CASE
            WHEN te.qty_transferred > 0 THEN te.qty_transferred
            ELSE tf.qty_transferred
          END as qty_transferred,
          CASE
            WHEN te.qty_transferred > 0 THEN te.cost_transferred
            ELSE tf.cost_transferred
          END as cost_transferred
        FROM transferred_explicit te, transferred_fallback tf
      )
      SELECT
        p.qty_produced as produced,
        t.qty_transferred as transferred,
        t.cost_transferred as transferred_cost,
        p.qty_produced - t.qty_transferred as variance,
        CASE
          WHEN p.qty_produced > 0
          THEN ROUND(((p.qty_produced - t.qty_transferred) / p.qty_produced) * 100, 2)
          ELSE 0
        END as variance_pct
      FROM produced p, transferred t
    `

    const branches = branchVarianceResult.rows.map(row => ({
      branch: row.branch || 'Unknown',
      received: Number(row.received),
      receivedCost: Number(row.received_cost),
      sold: Number(row.sold),
      revenue: Number(row.revenue),
      variance: Number(row.variance),
      variancePct: Number(row.variance_pct),
      varianceCost: Number(row.variance_cost),
    }))

    const ck = ckResult.rows[0]
    const centralKitchen = {
      produced: Number(ck?.produced || 0),
      transferred: Number(ck?.transferred || 0),
      transferredCost: Number(ck?.transferred_cost || 0),
      variance: Number(ck?.variance || 0),
      variancePct: Number(ck?.variance_pct || 0),
    }

    // Calculate totals
    const totals = {
      totalReceived: branches.reduce((sum, b) => sum + b.received, 0),
      totalSold: branches.reduce((sum, b) => sum + b.sold, 0),
      totalVariance: branches.reduce((sum, b) => sum + b.variance, 0),
      totalVarianceCost: branches.reduce((sum, b) => sum + b.varianceCost, 0),
    }

    return NextResponse.json({
      branches,
      centralKitchen,
      totals,
      dateRange: {
        start: weekStart,
        end: weekEnd,
      },
    })
  } catch (error) {
    console.error('Production variance analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch production variance analytics' },
      { status: 500 }
    )
  }
}
