import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Get branch performance across multiple time periods for Excel-style comparison
 * Returns: Yesterday, This Week, This Month, Previous Month, Period to Date
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderType = searchParams.get('orderType') // 'all', 'subscription', 'counter'

    // Build order type filter
    const orderTypeFilter = orderType === 'subscription' 
      ? "AND order_type = 'Sales Order'"
      : orderType === 'counter'
      ? "AND order_type = 'POS Order'"
      : ''

    // Yesterday
    const yesterdayResult = await sql.query(`
      SELECT 
        branch,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date = CURRENT_DATE - INTERVAL '1 day' ${orderTypeFilter}
      GROUP BY branch
      ORDER BY revenue DESC
    `)

    // This Week
    const thisWeekResult = await sql.query(`
      SELECT 
        branch,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('week', CURRENT_DATE) ${orderTypeFilter}
      GROUP BY branch
      ORDER BY revenue DESC
    `)

    // This Month
    const thisMonthResult = await sql.query(`
      SELECT 
        branch,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE) ${orderTypeFilter}
      GROUP BY branch
      ORDER BY revenue DESC
    `)

    // Previous Month
    const previousMonthResult = await sql.query(`
      SELECT 
        branch,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        AND date < DATE_TRUNC('month', CURRENT_DATE) ${orderTypeFilter}
      GROUP BY branch
      ORDER BY revenue DESC
    `)

    // Period to Date (Year to Date)
    const ytdResult = await sql.query(`
      SELECT 
        branch,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('year', CURRENT_DATE) ${orderTypeFilter}
      GROUP BY branch
      ORDER BY revenue DESC
    `)

    // Get all unique branches
    const allBranches = new Set<string>()
    yesterdayResult.rows.forEach(r => allBranches.add(r.branch))
    thisWeekResult.rows.forEach(r => allBranches.add(r.branch))
    thisMonthResult.rows.forEach(r => allBranches.add(r.branch))
    previousMonthResult.rows.forEach(r => allBranches.add(r.branch))
    ytdResult.rows.forEach(r => allBranches.add(r.branch))

    // Calculate totals for percentages
    const yesterdayTotal = yesterdayResult.rows.reduce((sum, r) => sum + Number(r.revenue), 0)
    const thisWeekTotal = thisWeekResult.rows.reduce((sum, r) => sum + Number(r.revenue), 0)
    const thisMonthTotal = thisMonthResult.rows.reduce((sum, r) => sum + Number(r.revenue), 0)
    const previousMonthTotal = previousMonthResult.rows.reduce((sum, r) => sum + Number(r.revenue), 0)
    const ytdTotal = ytdResult.rows.reduce((sum, r) => sum + Number(r.revenue), 0)

    // Build combined data
    const branches = Array.from(allBranches).map(branch => {
      const yesterdayData = yesterdayResult.rows.find(r => r.branch === branch) || { revenue: 0, units: 0, orders: 0 }
      const thisWeekData = thisWeekResult.rows.find(r => r.branch === branch) || { revenue: 0, units: 0, orders: 0 }
      const thisMonthData = thisMonthResult.rows.find(r => r.branch === branch) || { revenue: 0, units: 0, orders: 0 }
      const previousMonthData = previousMonthResult.rows.find(r => r.branch === branch) || { revenue: 0, units: 0, orders: 0 }
      const ytdData = ytdResult.rows.find(r => r.branch === branch) || { revenue: 0, units: 0, orders: 0 }

      return {
        branch,
        yesterday: {
          revenue: Number(yesterdayData.revenue),
          units: Number(yesterdayData.units),
          orders: Number(yesterdayData.orders),
          percentage: yesterdayTotal > 0 ? Math.round((Number(yesterdayData.revenue) / yesterdayTotal) * 100 * 10) / 10 : 0,
        },
        thisWeek: {
          revenue: Number(thisWeekData.revenue),
          units: Number(thisWeekData.units),
          orders: Number(thisWeekData.orders),
          percentage: thisWeekTotal > 0 ? Math.round((Number(thisWeekData.revenue) / thisWeekTotal) * 100 * 10) / 10 : 0,
        },
        thisMonth: {
          revenue: Number(thisMonthData.revenue),
          units: Number(thisMonthData.units),
          orders: Number(thisMonthData.orders),
          percentage: thisMonthTotal > 0 ? Math.round((Number(thisMonthData.revenue) / thisMonthTotal) * 100 * 10) / 10 : 0,
        },
        previousMonth: {
          revenue: Number(previousMonthData.revenue),
          units: Number(previousMonthData.units),
          orders: Number(previousMonthData.orders),
          percentage: previousMonthTotal > 0 ? Math.round((Number(previousMonthData.revenue) / previousMonthTotal) * 100 * 10) / 10 : 0,
        },
        periodToDate: {
          revenue: Number(ytdData.revenue),
          units: Number(ytdData.units),
          orders: Number(ytdData.orders),
          percentage: ytdTotal > 0 ? Math.round((Number(ytdData.revenue) / ytdTotal) * 100 * 10) / 10 : 0,
        },
      }
    })

    // Sort by this month revenue
    branches.sort((a, b) => b.thisMonth.revenue - a.thisMonth.revenue)

    return NextResponse.json({
      branches,
      totals: {
        yesterday: yesterdayTotal,
        thisWeek: thisWeekTotal,
        thisMonth: thisMonthTotal,
        previousMonth: previousMonthTotal,
        periodToDate: ytdTotal,
      },
      orderType: orderType || 'all',
    })
  } catch (error) {
    console.error('Analytics multi-period branches error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch multi-period branch analytics' },
      { status: 500 }
    )
  }
}
