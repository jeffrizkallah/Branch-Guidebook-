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

    const schedules = readSchedules()
    const scheduleIndex = schedules.findIndex((s: any) => s.scheduleId === params.id)

    if (scheduleIndex === -1) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Find the item in the current date
    const currentDayIndex = schedules[scheduleIndex].days.findIndex((d: any) => d.date === currentDate)
    if (currentDayIndex === -1) {
      return NextResponse.json({ error: 'Current date not found in schedule' }, { status: 404 })
    }

    const itemIndex = schedules[scheduleIndex].days[currentDayIndex].items.findIndex(
      (i: any) => i.itemId === params.itemId
    )

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Check if target date exists in the schedule
    const newDayIndex = schedules[scheduleIndex].days.findIndex((d: any) => d.date === newDate)
    if (newDayIndex === -1) {
      return NextResponse.json({ error: 'Target date not found in schedule' }, { status: 404 })
    }

    // Get the item
    const item = schedules[scheduleIndex].days[currentDayIndex].items[itemIndex]
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
    schedules[scheduleIndex].days[currentDayIndex].items.splice(itemIndex, 1)

    // Add item to new date
    schedules[scheduleIndex].days[newDayIndex].items.push(updatedItem)

    writeSchedules(schedules)

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
