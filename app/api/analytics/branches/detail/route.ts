import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Get detailed breakdown for a specific branch (subscription vs counter)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch')

    if (!branch) {
      return NextResponse.json(
        { error: 'Branch parameter is required' },
        { status: 400 }
      )
    }

    // Get this month data broken down by order type
    const thisMonthResult = await sql.query(`
      SELECT 
        order_type,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE branch = $1
        AND date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY order_type
    `, [branch])

    const subscription = thisMonthResult.rows.find(r => r.order_type === 'Sales Order') || { revenue: 0, units: 0, orders: 0 }
    const counter = thisMonthResult.rows.find(r => r.order_type === 'POS Order') || { revenue: 0, units: 0, orders: 0 }

    const totalRevenue = Number(subscription.revenue) + Number(counter.revenue)
    const subscriptionPercentage = totalRevenue > 0 ? (Number(subscription.revenue) / totalRevenue) * 100 : 0
    const counterPercentage = totalRevenue > 0 ? (Number(counter.revenue) / totalRevenue) * 100 : 0

    // Get top products for this branch this month
    const topProductsResult = await sql.query(`
      SELECT 
        items,
        category,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units
      FROM odoo_sales
      WHERE branch = $1
        AND date >= DATE_TRUNC('month', CURRENT_DATE)
        AND items IS NOT NULL
      GROUP BY items, category
      ORDER BY revenue DESC
      LIMIT 5
    `, [branch])

    const topProducts = topProductsResult.rows.map(row => ({
      product: row.items,
      category: row.category || 'Uncategorized',
      revenue: Number(row.revenue),
      units: Number(row.units),
    }))

    // Get daily trend for last 7 days with order type breakdown
    const dailyTrendResult = await sql.query(`
      SELECT 
        date,
        order_type,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE branch = $1
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        AND date < CURRENT_DATE
      GROUP BY date, order_type
      ORDER BY date ASC
    `, [branch])

    // Process daily data to combine by date with subscription/counter breakdown
    const dailyDataMap = new Map<string, {
      date: string
      totalRevenue: number
      subscriptionRevenue: number
      counterRevenue: number
      totalOrders: number
      subscriptionOrders: number
      counterOrders: number
    }>()

    dailyTrendResult.rows.forEach(row => {
      // Format date as ISO string for consistency
      const date = new Date(row.date)
      const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD format
      
      if (!dailyDataMap.has(dateKey)) {
        dailyDataMap.set(dateKey, {
          date: dateKey,
          totalRevenue: 0,
          subscriptionRevenue: 0,
          counterRevenue: 0,
          totalOrders: 0,
          subscriptionOrders: 0,
          counterOrders: 0,
        })
      }
      
      const dayData = dailyDataMap.get(dateKey)!
      const revenue = Number(row.revenue) || 0
      const orders = Number(row.orders) || 0
      
      dayData.totalRevenue += revenue
      dayData.totalOrders += orders
      
      if (row.order_type === 'Sales Order') {
        dayData.subscriptionRevenue += revenue
        dayData.subscriptionOrders += orders
      } else if (row.order_type === 'POS Order') {
        dayData.counterRevenue += revenue
        dayData.counterOrders += orders
      }
    })

    const dailyTrend = Array.from(dailyDataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    console.log(`Branch ${branch} daily trend:`, dailyTrend)

    return NextResponse.json({
      branch,
      thisMonth: {
        subscription: {
          revenue: Number(subscription.revenue),
          units: Number(subscription.units),
          orders: Number(subscription.orders),
          percentage: Math.round(subscriptionPercentage * 10) / 10,
        },
        counter: {
          revenue: Number(counter.revenue),
          units: Number(counter.units),
          orders: Number(counter.orders),
          percentage: Math.round(counterPercentage * 10) / 10,
        },
        total: {
          revenue: totalRevenue,
          units: Number(subscription.units) + Number(counter.units),
          orders: Number(subscription.orders) + Number(counter.orders),
        }
      },
      topProducts,
      dailyTrend,
    })
  } catch (error) {
    console.error('Branch detail error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch branch detail' },
      { status: 500 }
    )
  }
}
