import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // 'today', 'yesterday', '2daysago', 'week', 'month', 'year'

    let dateFilter = ''
    switch (period) {
      case 'today':
        dateFilter = 'date = CURRENT_DATE'
        break
      case 'yesterday':
        dateFilter = 'date = CURRENT_DATE - INTERVAL \'1 day\''
        break
      case '2daysago':
        dateFilter = 'date = CURRENT_DATE - INTERVAL \'2 days\''
        break
      case 'week':
        dateFilter = 'date >= DATE_TRUNC(\'week\', CURRENT_DATE)'
        break
      case 'year':
        dateFilter = 'date >= DATE_TRUNC(\'year\', CURRENT_DATE)'
        break
      case 'month':
      default:
        dateFilter = 'date >= DATE_TRUNC(\'month\', CURRENT_DATE)'
    }

    // Get revenue by branch for current period
    const currentResult = await sql.query(`
      SELECT 
        branch,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue,
        COALESCE(SUM(qty), 0) as units,
        COUNT(DISTINCT order_number) as orders
      FROM odoo_sales
      WHERE ${dateFilter}
      GROUP BY branch
      ORDER BY revenue DESC
    `)

    // Get total for calculating percentages
    const totalRevenue = currentResult.rows.reduce((sum, row) => sum + Number(row.revenue), 0)

    const branches = currentResult.rows.map(row => ({
      branch: row.branch || 'Unknown',
      revenue: Number(row.revenue),
      units: Number(row.units),
      orders: Number(row.orders),
      percentage: totalRevenue > 0 
        ? Math.round((Number(row.revenue) / totalRevenue) * 100 * 10) / 10
        : 0,
    }))

    return NextResponse.json({
      branches,
      totalRevenue,
      period,
    })
  } catch (error) {
    console.error('Analytics branches error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch branch analytics' },
      { status: 500 }
    )
  }
}

