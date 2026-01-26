import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['admin', 'operations_lead', 'head_chef']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { currentDate, newDate, reason } = await request.json()

    if (!currentDate || !newDate || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get schedule from database
    const result = await sql`
      SELECT schedule_data
      FROM production_schedules
      WHERE schedule_id = ${params.id}
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const schedule = result.rows[0].schedule_data

    // Find the item in the current date
    const currentDayIndex = schedule.days.findIndex((d: any) => d.date === currentDate)
    if (currentDayIndex === -1) {
      return NextResponse.json({ error: 'Current date not found in schedule' }, { status: 404 })
    }

    const itemIndex = schedule.days[currentDayIndex].items.findIndex(
      (i: any) => i.itemId === params.itemId
    )

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Check if target date exists in the schedule
    const newDayIndex = schedule.days.findIndex((d: any) => d.date === newDate)
    if (newDayIndex === -1) {
      return NextResponse.json({ error: 'Target date not found in schedule' }, { status: 404 })
    }

    // Get the item
    const item = schedule.days[currentDayIndex].items[itemIndex]
    const timestamp = new Date().toISOString()

    // Update item with reschedule information
    const updatedItem = {
      ...item,
      originalScheduledDate: item.originalScheduledDate || currentDate,
      rescheduledDate: newDate,
      rescheduleReason: reason,
      rescheduledBy: session.user.id.toString(),
      rescheduledAt: timestamp
    }

    // Remove item from current date
    schedule.days[currentDayIndex].items.splice(itemIndex, 1)

    // Add item to new date
    schedule.days[newDayIndex].items.push(updatedItem)

    // Save back to database
    await sql`
      UPDATE production_schedules
      SET schedule_data = ${JSON.stringify(schedule)}::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = ${params.id}
    `

    return NextResponse.json({
      success: true,
      item: updatedItem,
      movedFrom: currentDate,
      movedTo: newDate
    })
  } catch (error) {
    console.error('Error rescheduling item:', error)
    return NextResponse.json({ error: 'Failed to reschedule item' }, { status: 500 })
  }
}
