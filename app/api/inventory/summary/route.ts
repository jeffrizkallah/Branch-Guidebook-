import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

// Branch location mapping to Odoo locations
const branchLocationMapping: Record<string, string[]> = {
  'isc-aljada': ['ISC_AlJada', 'ISC AlJada', 'Al Jada'],
  'isc-soufouh': ['ISC_Soufouh', 'ISC Soufouh', 'Soufouh'],
  'isc-sharja': ['ISC_Sharja', 'ISC Sharja', 'Sharjah'],
  'isc-springs': ['ISC_Springs', 'ISC Springs', 'Springs'],
  'isc-marina': ['ISC_Marina', 'ISC Marina', 'Marina'],
  'jv-circle': ['JV_Circle', 'JV Circle', 'Jumeirah Village'],
  'dubai-hills': ['Dubai_Hills', 'Dubai Hills'],
  'central-kitchen': ['Central Kitchen', 'CK', 'Central_Kitchen'],
}

// GET - Get inventory summary for dashboard
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch')
    
    const user = session.user
    const isAdmin = user.role === 'admin' || user.role === 'operations_lead'

    // Determine which locations to query
    let locations: string[] = []
    
    if (branch) {
      if (!isAdmin && user.role === 'branch_manager' && !user.branches?.includes(branch)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      locations = branchLocationMapping[branch] || [branch]
    } else if (isAdmin) {
      locations = Object.values(branchLocationMapping).flat()
    } else if (user.branches && user.branches.length > 0) {
      locations = user.branches.flatMap(b => branchLocationMapping[b] || [b])
    } else {
      return NextResponse.json({
        totalItems: 0,
        totalValue: 0,
        byLocation: [],
        syncInfo: null
      })
    }

    // Get total items and value
    const summaryResult = await sql.query(`
      SELECT 
        COUNT(DISTINCT product) as "totalItems",
        SUM(available_quantity) as "totalQuantity",
        SUM(value) as "totalValue"
      FROM odoo_inventory
      WHERE location = ANY($1)
      AND date = (SELECT MAX(date) FROM odoo_inventory WHERE location = ANY($1))
    `, [locations])

    // Get breakdown by location
    const byLocationResult = await sql.query(`
      SELECT 
        location,
        COUNT(DISTINCT product) as "itemCount",
        SUM(available_quantity) as "totalQuantity",
        SUM(value) as "totalValue"
      FROM odoo_inventory
      WHERE location = ANY($1)
      AND date = (SELECT MAX(date) FROM odoo_inventory WHERE location = ANY($1))
      GROUP BY location
      ORDER BY "totalValue" DESC
    `, [locations])

    // Get top items by value
    const topItemsResult = await sql.query(`
      SELECT 
        product,
        location,
        available_quantity as "availableQuantity",
        unit_of_measure as "unitOfMeasure",
        value
      FROM odoo_inventory
      WHERE location = ANY($1)
      AND date = (SELECT MAX(date) FROM odoo_inventory WHERE location = ANY($1))
      ORDER BY value DESC
      LIMIT 10
    `, [locations])

    // Get sync info
    const syncInfoResult = await sql`
      SELECT MAX(synced_at) as "lastSynced", MAX(date) as "dataDate"
      FROM odoo_inventory
    `

    return NextResponse.json({
      totalItems: parseInt(summaryResult.rows[0]?.totalItems) || 0,
      totalQuantity: parseFloat(summaryResult.rows[0]?.totalQuantity) || 0,
      totalValue: parseFloat(summaryResult.rows[0]?.totalValue) || 0,
      byLocation: byLocationResult.rows,
      topItems: topItemsResult.rows,
      syncInfo: {
        lastSynced: syncInfoResult.rows[0]?.lastSynced,
        dataDate: syncInfoResult.rows[0]?.dataDate
      }
    })
  } catch (error) {
    console.error('Error fetching inventory summary:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory summary' }, { status: 500 })
  }
}

