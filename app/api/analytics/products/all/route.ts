import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') || '2025-09-01'
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0]
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sort') || 'revenue' // revenue, quantity, name, times
    const order = searchParams.get('order') || 'desc'

    // Build category filter
    const categoryFilter = category 
      ? `AND category = '${category.replace(/'/g, "''")}'` 
      : ''

    // Build order clause
    let orderClause = 'total_revenue DESC'
    switch (sortBy) {
      case 'quantity':
        orderClause = `total_quantity ${order.toUpperCase()}`
        break
      case 'name':
        orderClause = `product_name ${order.toUpperCase()}`
        break
      case 'times':
        orderClause = `times_sold ${order.toUpperCase()}`
        break
      case 'revenue':
      default:
        orderClause = `total_revenue ${order.toUpperCase()}`
    }

    // Query all unique products with aggregated stats
    const result = await sql.query(`
      SELECT DISTINCT 
        items as product_name,
        category,
        product_group,
        barcode,
        unit_of_measure,
        COUNT(*) as times_sold,
        SUM(qty) as total_quantity,
        SUM(price_subtotal_with_tax) as total_revenue,
        AVG(unit_price) as avg_unit_price,
        MIN(date) as first_sale_date,
        MAX(date) as last_sale_date
      FROM odoo_sales
      WHERE date >= $1 
        AND date <= $2
        AND items IS NOT NULL 
        AND items != ''
        ${categoryFilter}
      GROUP BY items, category, product_group, barcode, unit_of_measure
      ORDER BY ${orderClause}
    `, [startDate, endDate])

    // Get category summary
    const categoryResult = await sql.query(`
      SELECT 
        COALESCE(category, 'Uncategorized') as category,
        COUNT(DISTINCT items) as product_count,
        SUM(price_subtotal_with_tax) as total_revenue
      FROM odoo_sales
      WHERE date >= $1 
        AND date <= $2
        AND items IS NOT NULL 
        AND items != ''
      GROUP BY category
      ORDER BY total_revenue DESC
    `, [startDate, endDate])

    const totalRevenue = result.rows.reduce((sum, row) => sum + Number(row.total_revenue), 0)
    const totalQuantity = result.rows.reduce((sum, row) => sum + Number(row.total_quantity), 0)

    return NextResponse.json({
      dateRange: { 
        from: startDate, 
        to: endDate 
      },
      summary: {
        totalProducts: result.rows.length,
        totalRevenue,
        totalQuantitySold: totalQuantity,
        categoriesCount: categoryResult.rows.length,
        categoryBreakdown: categoryResult.rows.map(row => ({
          category: row.category,
          productCount: Number(row.product_count),
          totalRevenue: Number(row.total_revenue)
        }))
      },
      products: result.rows.map(row => ({
        name: row.product_name,
        category: row.category || 'Uncategorized',
        productGroup: row.product_group || null,
        barcode: row.barcode || null,
        unitOfMeasure: row.unit_of_measure || null,
        timesSold: Number(row.times_sold),
        totalQuantity: Number(row.total_quantity),
        totalRevenue: Number(row.total_revenue),
        avgUnitPrice: Number(row.avg_unit_price),
        firstSaleDate: row.first_sale_date,
        lastSaleDate: row.last_sale_date
      }))
    })
  } catch (error) {
    console.error('Error extracting products:', error)
    return NextResponse.json(
      { error: 'Failed to extract products' }, 
      { status: 500 }
    )
  }
}
