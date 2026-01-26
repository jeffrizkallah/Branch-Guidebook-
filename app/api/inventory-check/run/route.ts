import { NextRequest, NextResponse } from 'next/server'
import { runInventoryCheck } from '@/lib/inventory-checker'

/**
 * POST /api/inventory-check/run
 * 
 * Run an inventory check for a production schedule
 * 
 * Body: { scheduleId: string, userId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scheduleId, userId } = body
    
    if (!scheduleId) {
      return NextResponse.json(
        { error: 'scheduleId is required' },
        { status: 400 }
      )
    }
    
    console.log(`Running inventory check for schedule: ${scheduleId}`)
    
    const result = await runInventoryCheck(scheduleId, userId)
    
    return NextResponse.json({
      success: true,
      result
    })
    
  } catch (error: any) {
    console.error('Error running inventory check:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run inventory check' },
      { status: 500 }
    )
  }
}
