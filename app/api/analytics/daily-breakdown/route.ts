import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Get daily breakdown of sales for the specified period
 * Useful for calendar heatmaps and daily tables
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const orderType = searchParams.get('orderType') // 'all', 'subscription', 'counter'

    // Build order type filter
    const orderTypeFilter = orderType === 'subscription' 
      ? "AND order_type = 'Sales Order'"
      : orderType === 'counter'
      ? "AND order_type = 'POS Order'"
      : ''

    // Get daily sales data
    const dailyResult = await sql.query(`
      SELECT 
        date,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
        AND date < CURRENT_DATE ${orderTypeFilter}
      GROUP BY date
      ORDER BY date DESC
    `)

    // Process results
    const dailyData = dailyResult.rows.map(row => {
      const date = new Date(row.date)
      const revenue = Number(row.revenue)
      const units = Number(row.units)
      const orders = Number(row.orders)
      const aov = orders > 0 ? revenue / orders : 0

      return {
        date: row.date,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue,
        units,
        orders,
        aov: Math.round(aov * 100) / 100,
      }
    })

    // Calculate stats
    const totalRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0)
    const totalUnits = dailyData.reduce((sum, d) => sum + d.units, 0)
    const totalOrders = dailyData.reduce((sum, d) => sum + d.orders, 0)
    const avgDailyRevenue = dailyData.length > 0 ? totalRevenue / dailyData.length : 0

    // Find best and worst days
    const sortedByRevenue = [...dailyData].sort((a, b) => b.revenue - a.revenue)
    const bestDay = sortedByRevenue[0] || null
    const worstDay = sortedByRevenue[sortedByRevenue.length - 1] || null

    return NextResponse.json({
      daily: dailyData,
      summary: {
        totalRevenue,
        totalUnits,
        totalOrders,
        avgDailyRevenue: Math.round(avgDailyRevenue * 100) / 100,
        bestDay,
        worstDay,
        daysAnalyzed: dailyData.length,
      },
      orderType: orderType || 'all',
    })
  } catch (error) {
    console.error('Analytics daily breakdown error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily breakdown' },
      { status: 500 }
    )
  }
}
