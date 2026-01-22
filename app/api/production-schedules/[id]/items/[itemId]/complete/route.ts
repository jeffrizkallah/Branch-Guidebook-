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

    const schedules = readSchedules()
    const scheduleIndex = schedules.findIndex((s: any) => s.scheduleId === params.id)

    if (scheduleIndex === -1) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const dayIndex = schedules[scheduleIndex].days.findIndex((d: any) => d.date === date)

    if (dayIndex === -1) {
      return NextResponse.json({ error: 'Day not found in schedule' }, { status: 404 })
    }

    const itemIndex = schedules[scheduleIndex].days[dayIndex].items.findIndex(
      (i: any) => i.itemId === params.itemId
    )

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Station staff can only complete items assigned to their station
    if (session.user.role === 'station_staff' && session.user.stationAssignment) {
      const item = schedules[scheduleIndex].days[dayIndex].items[itemIndex]
      if (item.assignedTo !== session.user.stationAssignment) {
        return NextResponse.json({ error: 'Forbidden: Item not assigned to your station' }, { status: 403 })
      }
    }

    const timestamp = completedAt || new Date().toISOString()
    const item = schedules[scheduleIndex].days[dayIndex].items[itemIndex]

    // Update the item
    schedules[scheduleIndex].days[dayIndex].items[itemIndex] = {
      ...item,
      completed: completed !== undefined ? completed : true,
      actualQuantity: actualQuantity !== undefined ? actualQuantity : item.actualQuantity,
      actualUnit: actualUnit || item.actualUnit || item.unit,
      completedAt: completed ? timestamp : null,
      // If we're uncompleting, also reset startedAt if it wasn't set before
      ...(completed === false && !item.startedAt ? {} : {})
    }

    writeSchedules(schedules)

    return NextResponse.json({
      success: true,
      item: schedules[scheduleIndex].days[dayIndex].items[itemIndex]
    })
  } catch (error) {
    console.error('Error completing item:', error)
    return NextResponse.json({ error: 'Failed to complete item' }, { status: 500 })
  }
}
