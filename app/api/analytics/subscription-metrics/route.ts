import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Get subscription-specific metrics
 */
export async function GET(request: Request) {
  try {
    // This month subscription stats
    const thisMonthResult = await sql`
      SELECT 
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders,
        COUNT(DISTINCT client) as unique_clients
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
        AND order_type = 'Sales Order'
    `

    // Last month subscription stats
    const lastMonthResult = await sql`
      SELECT 
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders,
        COUNT(DISTINCT client) as unique_clients
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        AND date < DATE_TRUNC('month', CURRENT_DATE)
        AND order_type = 'Sales Order'
    `

    // Counter sales for comparison
    const counterThisMonthResult = await sql`
      SELECT 
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
        AND order_type = 'POS Order'
    `

    const thisMonth = thisMonthResult.rows[0]
    const lastMonth = lastMonthResult.rows[0]
    const counterThisMonth = counterThisMonthResult.rows[0]

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100 * 10) / 10
    }

    const calcAOV = (revenue: number, orders: number) => orders > 0 ? revenue / orders : 0

    const subscriptionRevenue = Number(thisMonth.revenue)
    const counterRevenue = Number(counterThisMonth.revenue)
    const totalRevenue = subscriptionRevenue + counterRevenue

    // Top subscription clients
    const topClientsResult = await sql`
      SELECT 
        client,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
        AND order_type = 'Sales Order'
        AND client IS NOT NULL
      GROUP BY client
      ORDER BY revenue DESC
      LIMIT 5
    `

    const topClients = topClientsResult.rows.map(row => ({
      client: row.client,
      revenue: Number(row.revenue),
      orders: Number(row.orders),
      aov: calcAOV(Number(row.revenue), Number(row.orders)),
    }))

    return NextResponse.json({
      thisMonth: {
        revenue: subscriptionRevenue,
        units: Number(thisMonth.units),
        orders: Number(thisMonth.orders),
        uniqueClients: Number(thisMonth.unique_clients),
        aov: Math.round(calcAOV(subscriptionRevenue, Number(thisMonth.orders)) * 100) / 100,
        changes: {
          revenue: calcChange(subscriptionRevenue, Number(lastMonth.revenue)),
          orders: calcChange(Number(thisMonth.orders), Number(lastMonth.orders)),
          clients: calcChange(Number(thisMonth.unique_clients), Number(lastMonth.unique_clients)),
        }
      },
      comparison: {
        subscriptionRevenue,
        counterRevenue,
        subscriptionPercentage: totalRevenue > 0 ? Math.round((subscriptionRevenue / totalRevenue) * 100 * 10) / 10 : 0,
        counterPercentage: totalRevenue > 0 ? Math.round((counterRevenue / totalRevenue) * 100 * 10) / 10 : 0,
        subscriptionAOV: Math.round(calcAOV(subscriptionRevenue, Number(thisMonth.orders)) * 100) / 100,
        counterAOV: Math.round(calcAOV(counterRevenue, Number(counterThisMonth.orders)) * 100) / 100,
      },
      topClients,
    })
  } catch (error) {
    console.error('Subscription metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription metrics' },
      { status: 500 }
    )
  }
}
