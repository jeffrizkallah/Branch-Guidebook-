import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Get sales summary broken down by order type (Subscription vs Counter)
 * Sales Order = Subscription sales
 * POS Order = Counter sales
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // 'today', 'week', 'month', 'year'

    // Helper to get date filter
    const getDateFilter = (periodType: string) => {
      switch (periodType) {
        case 'today':
          return "date = CURRENT_DATE - INTERVAL '1 day'"
        case 'week':
          return "date >= DATE_TRUNC('week', CURRENT_DATE)"
        case 'year':
          return "date >= DATE_TRUNC('year', CURRENT_DATE)"
        case 'month':
        default:
          return "date >= DATE_TRUNC('month', CURRENT_DATE)"
      }
    }

    // Get stats for current period by order type
    const currentByTypeResult = await sql.query(`
      SELECT 
        order_type,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE ${getDateFilter(period)}
      GROUP BY order_type
    `)

    // Get previous period for comparison
    const getPreviousDateFilter = (periodType: string) => {
      switch (periodType) {
        case 'today':
          return "date = CURRENT_DATE - INTERVAL '2 days'"
        case 'week':
          return "date >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week') AND date < DATE_TRUNC('week', CURRENT_DATE)"
        case 'year':
          return "date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year') AND date < DATE_TRUNC('year', CURRENT_DATE)"
        case 'month':
        default:
          return "date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND date < DATE_TRUNC('month', CURRENT_DATE)"
      }
    }

    const previousByTypeResult = await sql.query(`
      SELECT 
        order_type,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE ${getPreviousDateFilter(period)}
      GROUP BY order_type
    `)

    // Process results
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100 * 10) / 10
    }

    const currentData = {
      subscription: currentByTypeResult.rows.find(r => r.order_type === 'Sales Order') || { revenue: 0, units: 0, orders: 0 },
      counter: currentByTypeResult.rows.find(r => r.order_type === 'POS Order') || { revenue: 0, units: 0, orders: 0 },
    }

    const previousData = {
      subscription: previousByTypeResult.rows.find(r => r.order_type === 'Sales Order') || { revenue: 0, units: 0, orders: 0 },
      counter: previousByTypeResult.rows.find(r => r.order_type === 'POS Order') || { revenue: 0, units: 0, orders: 0 },
    }

    // Calculate totals
    const currentTotal = {
      revenue: Number(currentData.subscription.revenue) + Number(currentData.counter.revenue),
      units: Number(currentData.subscription.units) + Number(currentData.counter.units),
      orders: Number(currentData.subscription.orders) + Number(currentData.counter.orders),
    }

    const previousTotal = {
      revenue: Number(previousData.subscription.revenue) + Number(previousData.counter.revenue),
      units: Number(previousData.subscription.units) + Number(previousData.counter.units),
      orders: Number(previousData.subscription.orders) + Number(previousData.counter.orders),
    }

    const calcAOV = (revenue: number, orders: number) => orders > 0 ? revenue / orders : 0

    return NextResponse.json({
      total: {
        revenue: currentTotal.revenue,
        units: currentTotal.units,
        orders: currentTotal.orders,
        aov: Math.round(calcAOV(currentTotal.revenue, currentTotal.orders) * 100) / 100,
        changes: {
          revenue: calcChange(currentTotal.revenue, previousTotal.revenue),
          units: calcChange(currentTotal.units, previousTotal.units),
          orders: calcChange(currentTotal.orders, previousTotal.orders),
          aov: calcChange(calcAOV(currentTotal.revenue, currentTotal.orders), calcAOV(previousTotal.revenue, previousTotal.orders)),
        }
      },
      subscription: {
        revenue: Number(currentData.subscription.revenue),
        units: Number(currentData.subscription.units),
        orders: Number(currentData.subscription.orders),
        aov: Math.round(calcAOV(Number(currentData.subscription.revenue), Number(currentData.subscription.orders)) * 100) / 100,
        percentage: currentTotal.revenue > 0 ? Math.round((Number(currentData.subscription.revenue) / currentTotal.revenue) * 100 * 10) / 10 : 0,
        changes: {
          revenue: calcChange(Number(currentData.subscription.revenue), Number(previousData.subscription.revenue)),
          units: calcChange(Number(currentData.subscription.units), Number(previousData.subscription.units)),
          orders: calcChange(Number(currentData.subscription.orders), Number(previousData.subscription.orders)),
          aov: calcChange(calcAOV(Number(currentData.subscription.revenue), Number(currentData.subscription.orders)), calcAOV(Number(previousData.subscription.revenue), Number(previousData.subscription.orders))),
        }
      },
      counter: {
        revenue: Number(currentData.counter.revenue),
        units: Number(currentData.counter.units),
        orders: Number(currentData.counter.orders),
        aov: Math.round(calcAOV(Number(currentData.counter.revenue), Number(currentData.counter.orders)) * 100) / 100,
        percentage: currentTotal.revenue > 0 ? Math.round((Number(currentData.counter.revenue) / currentTotal.revenue) * 100 * 10) / 10 : 0,
        changes: {
          revenue: calcChange(Number(currentData.counter.revenue), Number(previousData.counter.revenue)),
          units: calcChange(Number(currentData.counter.units), Number(previousData.counter.units)),
          orders: calcChange(Number(currentData.counter.orders), Number(previousData.counter.orders)),
          aov: calcChange(calcAOV(Number(currentData.counter.revenue), Number(currentData.counter.orders)), calcAOV(Number(previousData.counter.revenue), Number(previousData.counter.orders))),
        }
      },
      period,
    })
  } catch (error) {
    console.error('Analytics summary by type error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics summary by type' },
      { status: 500 }
    )
  }
}
