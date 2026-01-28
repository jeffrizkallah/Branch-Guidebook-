import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get date range from params or default to current week
    let weekStart: string | null = searchParams.get('weekStart')
    let weekEnd: string | null = searchParams.get('weekEnd')

    if (!weekStart || !weekEnd) {
      const today = new Date()
      const dayOfWeek = today.getDay()

      const start = new Date(today)
      if (dayOfWeek === 6) {
        start.setDate(today.getDate() - 6)
      } else if (dayOfWeek === 0) {
        start.setDate(today.getDate() - 7)
      } else {
        start.setDate(today.getDate() - dayOfWeek)
      }

      const end = new Date(today)
      if (dayOfWeek === 6) {
        end.setDate(today.getDate() - 1)
      } else if (dayOfWeek === 0) {
        end.setDate(today.getDate() - 2)
      } else {
        end.setDate(today.getDate() - 1)
      }

      weekStart = start.toISOString().split('T')[0]
      weekEnd = end.toISOString().split('T')[0]
    }

    // Get all transfers to see what's in the table
    const allTransfers = await sql`
      SELECT 
        from_branch,
        to_branch,
        SUM(quantity) as total_quantity,
        SUM(cost) as total_cost,
        COUNT(*) as transfer_count,
        MIN(effective_date) as earliest_date,
        MAX(effective_date) as latest_date
      FROM odoo_transfer
      WHERE effective_date >= ${weekStart}::date AND effective_date <= ${weekEnd}::date
      GROUP BY from_branch, to_branch
      ORDER BY total_quantity DESC
      LIMIT 50
    `
    
    // Get the most recent sync time
    const syncInfo = await sql`
      SELECT 
        MAX(synced_at) as last_sync,
        COUNT(*) as total_records
      FROM odoo_transfer
    `
    
    // Get date range of all data
    const dateRange = await sql`
      SELECT 
        MIN(effective_date) as earliest_transfer,
        MAX(effective_date) as latest_transfer,
        COUNT(*) as total_transfers
      FROM odoo_transfer
    `

    // Get distinct from_branch values
    const distinctFromBranches = await sql`
      SELECT DISTINCT from_branch
      FROM odoo_transfer
      WHERE effective_date >= ${weekStart}::date AND effective_date <= ${weekEnd}::date
      ORDER BY from_branch
    `

    // Get sum of all transfers
    const totalTransfers = await sql`
      SELECT 
        COUNT(*) as total_records,
        SUM(quantity) as total_quantity,
        SUM(cost) as total_cost
      FROM odoo_transfer
      WHERE effective_date >= ${weekStart}::date AND effective_date <= ${weekEnd}::date
    `

    // Check what matches the current patterns (with updated patterns)
    const matchingPatterns = await sql`
      SELECT 
        from_branch,
        SUM(quantity) as qty,
        SUM(cost) as cost,
        COUNT(*) as records
      FROM odoo_transfer
      WHERE effective_date >= ${weekStart}::date AND effective_date <= ${weekEnd}::date
        AND (
          from_branch ILIKE '%Mikana International Catering Services - UAE%'
          OR from_branch ILIKE '%Mikana International Catering Services%'
          OR from_branch ILIKE '%central%kitchen%'
          OR from_branch ILIKE '%central_kitchen%'
          OR from_branch ILIKE 'ck %'
          OR from_branch ILIKE 'ck_%'
          OR from_branch ILIKE '%/ck/%'
          OR LOWER(TRIM(from_branch)) = 'ck'
          OR LOWER(TRIM(from_branch)) = 'central kitchen'
          OR LOWER(TRIM(from_branch)) LIKE '%production%'
          OR from_branch ILIKE '%mikana%ck%'
          OR from_branch ILIKE '%mikana%kitchen%'
          OR from_branch ILIKE '%mikana%international%catering%'
          OR from_branch ILIKE '%catering%services%'
        )
      GROUP BY from_branch
    `

    return NextResponse.json({
      dateRange: { 
        queryStart: weekStart, 
        queryEnd: weekEnd 
      },
      syncInfo: syncInfo.rows[0],
      dataRange: dateRange.rows[0],
      totalTransfers: totalTransfers.rows[0],
      transfersByRoute: allTransfers.rows,
      distinctFromBranches: distinctFromBranches.rows,
      matchingCentralKitchenPatterns: matchingPatterns.rows,
      message: matchingPatterns.rows.length === 0 
        ? '⚠️ No transfers matching Central Kitchen patterns found in this date range'
        : `✅ Found ${matchingPatterns.rows.length} Central Kitchen transfer record(s)`
    })
  } catch (error) {
    console.error('Debug transfers error:', error)
    return NextResponse.json(
      { error: 'Failed to debug transfers', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
