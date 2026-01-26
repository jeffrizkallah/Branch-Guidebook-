import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
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

    const { date, itemIds, station, assignedBy } = await request.json()

    if (!date || !itemIds || !Array.isArray(itemIds) || !station) {
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
    const dayIndex = schedule.days.findIndex((d: any) => d.date === date)

    if (dayIndex === -1) {
      return NextResponse.json({ error: 'Day not found in schedule' }, { status: 404 })
    }

    const timestamp = new Date().toISOString()
    let assignedCount = 0

    // Update each item
    for (const itemId of itemIds) {
      const itemIndex = schedule.days[dayIndex].items.findIndex(
        (i: any) => i.itemId === itemId
      )

      if (itemIndex !== -1) {
        schedule.days[dayIndex].items[itemIndex] = {
          ...schedule.days[dayIndex].items[itemIndex],
          assignedTo: station,
          assignedBy: assignedBy || session.user.id.toString(),
          assignedAt: timestamp
        }
        assignedCount++
      }
    }

    // Save back to database
    await sql`
      UPDATE production_schedules
      SET schedule_data = ${JSON.stringify(schedule)}::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = ${params.id}
    `

    return NextResponse.json({
      success: true,
      assigned: assignedCount,
      station
    })
  } catch (error) {
    console.error('Error assigning items:', error)
    return NextResponse.json({ error: 'Failed to assign items' }, { status: 500 })
  }
}
