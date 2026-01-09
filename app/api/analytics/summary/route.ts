import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // 'today', 'week', 'month', 'year'

    // Get yesterday's stats (most recent synced data)
    const yesterdayResult = await sql`
      SELECT 
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date = CURRENT_DATE - INTERVAL '1 day'
    `

    // Get day before yesterday for comparison
    const twoDaysAgoResult = await sql`
      SELECT 
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date = CURRENT_DATE - INTERVAL '2 days'
    `

    // Get this month's stats
    const thisMonthResult = await sql`
      SELECT 
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
    `

    // Get last month's stats for comparison
    const lastMonthResult = await sql`
      SELECT 
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        AND date < DATE_TRUNC('month', CURRENT_DATE)
    `

    // Get this week's stats
    const thisWeekResult = await sql`
      SELECT 
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('week', CURRENT_DATE)
    `

    // Get last week's stats
    const lastWeekResult = await sql`
      SELECT 
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
        AND date < DATE_TRUNC('week', CURRENT_DATE)
    `

    // Calculate percentage changes
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100 * 10) / 10
    }

    const yesterday = yesterdayResult.rows[0]
    const twoDaysAgo = twoDaysAgoResult.rows[0]
    const thisMonth = thisMonthResult.rows[0]
    const lastMonth = lastMonthResult.rows[0]
    const thisWeek = thisWeekResult.rows[0]
    const lastWeek = lastWeekResult.rows[0]

    console.log('Analytics Summary - Yesterday:', yesterday)
    console.log('Analytics Summary - This Month:', thisMonth)

    // Calculate average order value
    const yesterdayAOV = Number(yesterday.orders) > 0 
      ? Number(yesterday.revenue) / Number(yesterday.orders) 
      : 0
    const twoDaysAgoAOV = Number(twoDaysAgo.orders) > 0 
      ? Number(twoDaysAgo.revenue) / Number(twoDaysAgo.orders) 
      : 0
    const thisMonthAOV = Number(thisMonth.orders) > 0 
      ? Number(thisMonth.revenue) / Number(thisMonth.orders) 
      : 0
    const lastMonthAOV = Number(lastMonth.orders) > 0 
      ? Number(lastMonth.revenue) / Number(lastMonth.orders) 
      : 0

    return NextResponse.json({
      today: {
        revenue: Number(yesterday.revenue),
        units: Number(yesterday.units),
        orders: Number(yesterday.orders),
        aov: Math.round(yesterdayAOV * 100) / 100,
        changes: {
          revenue: calcChange(Number(yesterday.revenue), Number(twoDaysAgo.revenue)),
          units: calcChange(Number(yesterday.units), Number(twoDaysAgo.units)),
          orders: calcChange(Number(yesterday.orders), Number(twoDaysAgo.orders)),
          aov: calcChange(yesterdayAOV, twoDaysAgoAOV),
        }
      },
      thisWeek: {
        revenue: Number(thisWeek.revenue),
        units: Number(thisWeek.units),
        orders: Number(thisWeek.orders),
        changes: {
          revenue: calcChange(Number(thisWeek.revenue), Number(lastWeek.revenue)),
          units: calcChange(Number(thisWeek.units), Number(lastWeek.units)),
          orders: calcChange(Number(thisWeek.orders), Number(lastWeek.orders)),
        }
      },
      thisMonth: {
        revenue: Number(thisMonth.revenue),
        units: Number(thisMonth.units),
        orders: Number(thisMonth.orders),
        aov: Math.round(thisMonthAOV * 100) / 100,
        changes: {
          revenue: calcChange(Number(thisMonth.revenue), Number(lastMonth.revenue)),
          units: calcChange(Number(thisMonth.units), Number(lastMonth.units)),
          orders: calcChange(Number(thisMonth.orders), Number(lastMonth.orders)),
          aov: calcChange(thisMonthAOV, lastMonthAOV),
        }
      },
      lastMonth: {
        revenue: Number(lastMonth.revenue),
        units: Number(lastMonth.units),
        orders: Number(lastMonth.orders),
      }
    })
  } catch (error) {
    console.error('Analytics summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics summary' },
      { status: 500 }
    )
  }
}

