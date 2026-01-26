import { NextRequest, NextResponse } from 'next/server'
import { getLatestCheck } from '@/lib/inventory-checker'

/**
 * GET /api/inventory-check/[scheduleId]
 * 
 * Get the latest inventory check result for a schedule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const { scheduleId } = params
    
    const result = await getLatestCheck(scheduleId)
    
    if (!result) {
      return NextResponse.json(
        { error: 'No check found for this schedule' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      result
    })
    
  } catch (error: any) {
    console.error('Error getting inventory check:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get inventory check' },
      { status: 500 }
    )
  }
}
