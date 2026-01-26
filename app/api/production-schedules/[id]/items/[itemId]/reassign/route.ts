import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['admin', 'operations_lead', 'head_chef']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { date, newStation, reassignedBy } = await request.json()

    if (!date) {
      return NextResponse.json({ error: 'Missing date field' }, { status: 400 })
    }

    const result = await sql`
      SELECT schedule_data
      FROM production_schedules
      WHERE schedule_id = ${params.id}
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const schedule = result.rows[0].schedule_data

    const dayIndex = schedule.days.findIndex((d: any) => d.date === date)

    if (dayIndex === -1) {
      return NextResponse.json({ error: 'Day not found in schedule' }, { status: 404 })
    }

    const itemIndex = schedule.days[dayIndex].items.findIndex(
      (i: any) => i.itemId === params.itemId
    )

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const timestamp = new Date().toISOString()

    // Update the item's assignment
    if (newStation === null) {
      // Unassign the item
      schedule.days[dayIndex].items[itemIndex] = {
        ...schedule.days[dayIndex].items[itemIndex],
        assignedTo: null,
        assignedBy: null,
        assignedAt: null
      }
    } else {
      // Reassign to new station
      schedule.days[dayIndex].items[itemIndex] = {
        ...schedule.days[dayIndex].items[itemIndex],
        assignedTo: newStation,
        assignedBy: reassignedBy || session.user.id.toString(),
        assignedAt: timestamp
      }
    }

    await sql`
      UPDATE production_schedules
      SET schedule_data = ${JSON.stringify(schedule)}::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = ${params.id}
    `

    return NextResponse.json({
      success: true,
      item: schedule.days[dayIndex].items[itemIndex]
    })
  } catch (error) {
    console.error('Error reassigning item:', error)
    return NextResponse.json({ error: 'Failed to reassign item' }, { status: 500 })
  }
}
