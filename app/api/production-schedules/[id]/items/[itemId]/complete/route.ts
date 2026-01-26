import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

const dataFilePath = path.join(process.cwd(), 'data', 'production-schedules.json')

function readSchedules() {
  const fileContents = fs.readFileSync(dataFilePath, 'utf8')
  return JSON.parse(fileContents)
}

function writeSchedules(data: any) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2))
}

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

    const allowedRoles = ['admin', 'operations_lead', 'head_chef', 'station_staff']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { date, completed, actualQuantity, actualUnit, completedAt } = await request.json()

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

    // Station staff can only complete items assigned to their station
    if (session.user.role === 'station_staff' && session.user.stationAssignment) {
      const item = schedule.days[dayIndex].items[itemIndex]
      if (item.assignedTo !== session.user.stationAssignment) {
        return NextResponse.json({ error: 'Forbidden: Item not assigned to your station' }, { status: 403 })
      }
    }

    const timestamp = completedAt || new Date().toISOString()
    const item = schedule.days[dayIndex].items[itemIndex]

    // Update the item
    schedule.days[dayIndex].items[itemIndex] = {
      ...item,
      completed: completed !== undefined ? completed : true,
      actualQuantity: actualQuantity !== undefined ? actualQuantity : item.actualQuantity,
      actualUnit: actualUnit || item.actualUnit || item.unit,
      completedAt: completed ? timestamp : null,
      // If we're uncompleting, also reset startedAt if it wasn't set before
      ...(completed === false && !item.startedAt ? {} : {})
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
    console.error('Error completing item:', error)
    return NextResponse.json({ error: 'Failed to complete item' }, { status: 500 })
  }
}
