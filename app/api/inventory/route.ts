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

// GET - Get inventory for user's branches
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const user = session.user
    const isAdmin = user.role === 'admin' || user.role === 'operations_lead'

    // Determine which locations to query
    let locations: string[] = []
    
    if (branch) {
      // Specific branch requested
      if (!isAdmin && user.role === 'branch_manager' && !user.branches?.includes(branch)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      locations = branchLocationMapping[branch] || [branch]
    } else if (isAdmin) {
      // Admin can see all
      locations = Object.values(branchLocationMapping).flat()
    } else if (user.branches && user.branches.length > 0) {
      // Filter to user's branches
      locations = user.branches.flatMap(b => branchLocationMapping[b] || [b])
    } else {
      return NextResponse.json([])
    }

    // Build query
    let query = `
      SELECT 
        id,
        product,
        location,
        lot_serial as "lotSerial",
        inventoried_quantity as "inventoriedQuantity",
        available_quantity as "availableQuantity",
        unit_of_measure as "unitOfMeasure",
        value,
        date as "syncDate"
      FROM odoo_inventory
      WHERE location = ANY($1)
    `
    const params: any[] = [locations]
    let paramIndex = 2

    if (search) {
      query += ` AND LOWER(product) LIKE LOWER($${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    // Get the most recent sync date and filter to that
    query += ` AND date = (SELECT MAX(date) FROM odoo_inventory WHERE location = ANY($1))`

    query += ` ORDER BY product ASC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await sql.query(query, params)

    // Get sync metadata
    const syncInfoResult = await sql`
      SELECT MAX(synced_at) as "lastSynced", MAX(date) as "dataDate"
      FROM odoo_inventory
    `

    // Get total count for pagination
    const countResult = await sql.query(`
      SELECT COUNT(*) as total
      FROM odoo_inventory
      WHERE location = ANY($1)
      AND date = (SELECT MAX(date) FROM odoo_inventory WHERE location = ANY($1))
    `, [locations])

    return NextResponse.json({
      items: result.rows,
      total: parseInt(countResult.rows[0].total),
      syncInfo: {
        lastSynced: syncInfoResult.rows[0]?.lastSynced,
        dataDate: syncInfoResult.rows[0]?.dataDate
      }
    })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

