import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

/**
 * DELETE /api/inventory-check/[scheduleId]/delete
 * 
 * Delete inventory check records for a specific schedule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const { scheduleId } = params
    
    console.log(`🗑️  Deleting inventory check for schedule: ${scheduleId}`)
    
    // Delete shortages first (due to foreign key constraint)
    const shortagesResult = await sql`
      DELETE FROM ingredient_shortages
      WHERE schedule_id = ${scheduleId}
    `
    
    // Delete checks
    const checksResult = await sql`
      DELETE FROM inventory_checks
      WHERE schedule_id = ${scheduleId}
    `
    
    console.log(`✅ Deleted ${checksResult.rowCount} checks and ${shortagesResult.rowCount} shortages`)
    
    return NextResponse.json({
      success: true,
      message: `Deleted inventory check for schedule ${scheduleId}`,
      deleted: {
        checks: checksResult.rowCount,
        shortages: shortagesResult.rowCount
      }
    })
    
  } catch (error: any) {
    console.error('Error deleting inventory check:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete inventory check' },
      { status: 500 }
    )
  }
}
