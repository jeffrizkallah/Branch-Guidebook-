import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Generate automated insights and alerts based on sales data
 */
export async function GET(request: Request) {
  try {
    const insights: Array<{
      type: 'positive' | 'negative' | 'neutral' | 'alert'
      title: string
      description: string
      metric?: string
      value?: string
    }> = []

    // Get this month vs last month
    const thisMonthResult = await sql`
      SELECT COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
    `

    const lastMonthResult = await sql`
      SELECT COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        AND date < DATE_TRUNC('month', CURRENT_DATE)
    `

    const thisMonthRevenue = Number(thisMonthResult.rows[0].revenue)
    const lastMonthRevenue = Number(lastMonthResult.rows[0].revenue)
    const monthOverMonthChange = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0

    // Month-over-month insight
    if (Math.abs(monthOverMonthChange) > 5) {
      insights.push({
        type: monthOverMonthChange > 0 ? 'positive' : 'negative',
        title: monthOverMonthChange > 0 ? 'Strong Month-over-Month Growth' : 'Month-over-Month Decline',
        description: `Revenue is ${Math.abs(monthOverMonthChange).toFixed(1)}% ${monthOverMonthChange > 0 ? 'higher' : 'lower'} this month compared to last month`,
        metric: 'Month-over-Month',
        value: `${monthOverMonthChange > 0 ? '+' : ''}${monthOverMonthChange.toFixed(1)}%`,
      })
    }

    // Get top branch this month
    const topBranchResult = await sql`
      SELECT branch, COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY branch
      ORDER BY revenue DESC
      LIMIT 1
    `

    if (topBranchResult.rows.length > 0) {
      const topBranch = topBranchResult.rows[0]
      const topBranchPercentage = thisMonthRevenue > 0 
        ? (Number(topBranch.revenue) / thisMonthRevenue) * 100 
        : 0

      insights.push({
        type: 'neutral',
        title: `${topBranch.branch} Leading This Month`,
        description: `${topBranch.branch} accounts for ${topBranchPercentage.toFixed(1)}% of total revenue`,
        metric: 'Top Branch',
        value: `AED ${Number(topBranch.revenue).toLocaleString('en-AE', { maximumFractionDigits: 0 })}`,
      })
    }

    // Compare subscription vs counter sales
    const salesByTypeResult = await sql`
      SELECT 
        order_type,
        COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
      FROM odoo_sales
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY order_type
    `

    const subscriptionRevenue = Number(salesByTypeResult.rows.find(r => r.order_type === 'Sales Order')?.revenue || 0)
    const counterRevenue = Number(salesByTypeResult.rows.find(r => r.order_type === 'POS Order')?.revenue || 0)
    const totalBoth = subscriptionRevenue + counterRevenue

    if (totalBoth > 0) {
      const subscriptionPercentage = (subscriptionRevenue / totalBoth) * 100
      const counterPercentage = (counterRevenue / totalBoth) * 100

      insights.push({
        type: 'neutral',
        title: 'Sales Mix This Month',
        description: `Subscription sales: ${subscriptionPercentage.toFixed(1)}% | Counter sales: ${counterPercentage.toFixed(1)}%`,
        metric: 'Revenue Split',
        value: `${subscriptionPercentage > counterPercentage ? 'Subscription' : 'Counter'} Leading`,
      })
    }

    // Check for branches with significant growth
    const branchGrowthResult = await sql`
      WITH this_month AS (
        SELECT branch, COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
        FROM odoo_sales
        WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY branch
      ),
      last_month AS (
        SELECT branch, COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
        FROM odoo_sales
        WHERE date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
          AND date < DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY branch
      )
      SELECT 
        this_month.branch,
        this_month.revenue as this_month_revenue,
        COALESCE(last_month.revenue, 0) as last_month_revenue,
        CASE 
          WHEN COALESCE(last_month.revenue, 0) > 0 
          THEN ((this_month.revenue - COALESCE(last_month.revenue, 0)) / COALESCE(last_month.revenue, 1)) * 100
          ELSE 0
        END as growth_percentage
      FROM this_month
      LEFT JOIN last_month ON this_month.branch = last_month.branch
      WHERE this_month.revenue > 0
      ORDER BY growth_percentage DESC
      LIMIT 1
    `

    if (branchGrowthResult.rows.length > 0) {
      const topGrowth = branchGrowthResult.rows[0]
      const growthPct = Number(topGrowth.growth_percentage)

      if (Math.abs(growthPct) > 20) {
        insights.push({
          type: growthPct > 0 ? 'positive' : 'alert',
          title: growthPct > 0 ? 'Outstanding Branch Growth' : 'Branch Performance Alert',
          description: `${topGrowth.branch} has ${growthPct > 0 ? 'grown' : 'declined'} by ${Math.abs(growthPct).toFixed(1)}% this month`,
          metric: topGrowth.branch,
          value: `${growthPct > 0 ? '+' : ''}${growthPct.toFixed(1)}%`,
        })
      }
    }

    // Check yesterday vs 2 days ago for sudden changes
    const yesterdayResult = await sql`
      SELECT COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
      FROM odoo_sales
      WHERE date = CURRENT_DATE - INTERVAL '1 day'
    `

    const twoDaysAgoResult = await sql`
      SELECT COALESCE(SUM(price_subtotal_with_tax), 0) as revenue
      FROM odoo_sales
      WHERE date = CURRENT_DATE - INTERVAL '2 days'
    `

    const yesterdayRevenue = Number(yesterdayResult.rows[0].revenue)
    const twoDaysAgoRevenue = Number(twoDaysAgoResult.rows[0].revenue)
    const dailyChange = twoDaysAgoRevenue > 0 
      ? ((yesterdayRevenue - twoDaysAgoRevenue) / twoDaysAgoRevenue) * 100 
      : 0

    if (Math.abs(dailyChange) > 30) {
      insights.push({
        type: dailyChange > 0 ? 'positive' : 'alert',
        title: dailyChange > 0 ? 'Strong Daily Performance' : 'Daily Sales Alert',
        description: `Yesterday's revenue was ${Math.abs(dailyChange).toFixed(1)}% ${dailyChange > 0 ? 'higher' : 'lower'} than the previous day`,
        metric: 'Daily Change',
        value: `${dailyChange > 0 ? '+' : ''}${dailyChange.toFixed(1)}%`,
      })
    }

    return NextResponse.json({
      insights,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analytics insights error:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
