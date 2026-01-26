import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

/**
 * PATCH /api/inventory-shortages/[shortageId]/resolve
 * 
 * Resolve an inventory shortage
 * 
 * Body: {
 *   resolutionStatus: 'RESOLVED' | 'CANNOT_FULFILL',
 *   resolutionAction: 'ORDERED' | 'IN_STOCK_ERROR' | 'SUBSTITUTED' | 'RESCHEDULED' | 'CANCELLED',
 *   resolutionNotes: string,
 *   resolvedBy: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { shortageId: string } }
) {
  try {
    const { shortageId } = params
    const body = await request.json()
    const { resolutionStatus, resolutionAction, resolutionNotes, resolvedBy } = body
    
    if (!resolutionStatus || !resolvedBy) {
      return NextResponse.json(
        { error: 'resolutionStatus and resolvedBy are required' },
        { status: 400 }
      )
    }
    
    // Update shortage
    await sql`
      UPDATE ingredient_shortages
      SET 
        resolution_status = ${resolutionStatus},
        resolution_action = ${resolutionAction || null},
        resolution_notes = ${resolutionNotes || null},
        resolved_by = ${resolvedBy},
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE shortage_id = ${shortageId}
    `
    
    // Get updated shortage
    const result = await sql`
      SELECT *
      FROM ingredient_shortages
      WHERE shortage_id = ${shortageId}
    `
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Shortage not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      shortage: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('Error resolving shortage:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resolve shortage' },
      { status: 500 }
    )
  }
}
