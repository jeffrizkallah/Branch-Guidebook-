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

    const allowedRoles = ['admin', 'operations_lead', 'head_chef']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { date, newStation, reassignedBy } = await request.json()

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

    const timestamp = new Date().toISOString()

    // Update the item's assignment
    if (newStation === null) {
      // Unassign the item
      schedules[scheduleIndex].days[dayIndex].items[itemIndex] = {
        ...schedules[scheduleIndex].days[dayIndex].items[itemIndex],
        assignedTo: null,
        assignedBy: null,
        assignedAt: null
      }
    } else {
      // Reassign to new station
      schedules[scheduleIndex].days[dayIndex].items[itemIndex] = {
        ...schedules[scheduleIndex].days[dayIndex].items[itemIndex],
        assignedTo: newStation,
        assignedBy: reassignedBy || session.user.id.toString(),
        assignedAt: timestamp
      }
    }

    writeSchedules(schedules)

    return NextResponse.json({
      success: true,
      item: schedules[scheduleIndex].days[dayIndex].items[itemIndex]
    })
  } catch (error) {
    console.error('Error reassigning item:', error)
    return NextResponse.json({ error: 'Failed to reassign item' }, { status: 500 })
  }
}
