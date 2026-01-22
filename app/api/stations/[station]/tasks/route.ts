import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { normalizeStationName } from '@/lib/data'

const schedulesFilePath = path.join(process.cwd(), 'data', 'production-schedules.json')

function readSchedules() {
  const fileContents = fs.readFileSync(schedulesFilePath, 'utf8')
  return JSON.parse(fileContents)
}

export async function GET(
  request: Request,
  { params }: { params: { station: string } }
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

    // Station staff can only access their assigned station
    const requestedStation = decodeURIComponent(params.station)
    if (session.user.role === 'station_staff' && session.user.stationAssignment) {
      if (normalizeStationName(requestedStation) !== normalizeStationName(session.user.stationAssignment)) {
        return NextResponse.json({ error: 'Forbidden: Not your station' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 })
    }

    const schedules = readSchedules()

    // Find the schedule containing this date
    let targetDay = null
    let scheduleId = null

    for (const schedule of schedules) {
      const day = schedule.days.find((d: any) => d.date === date)
      if (day) {
        targetDay = day
        scheduleId = schedule.scheduleId
        break
      }
    }

    if (!targetDay) {
      return NextResponse.json({
        station: requestedStation,
        date,
        scheduleId: null,
        tasks: []
      })
    }

    // Filter items assigned to this station
    const normalizedRequestedStation = normalizeStationName(requestedStation)
    const tasks = targetDay.items
      .filter((item: any) => {
        if (!item.assignedTo) return false
        return normalizeStationName(item.assignedTo) === normalizedRequestedStation
      })
      .map((item: any) => ({
        itemId: item.itemId,
        recipeName: item.recipeName,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        station: item.station,
        assignedAt: item.assignedAt,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        completed: item.completed,
        actualQuantity: item.actualQuantity,
        actualUnit: item.actualUnit,
        subRecipeProgress: item.subRecipeProgress || {},
        recipeId: item.recipeId
      }))

    // Sort: in-progress first, then pending, then completed
    tasks.sort((a: any, b: any) => {
      const getOrder = (task: any) => {
        if (task.startedAt && !task.completed && !task.completedAt) return 0 // In progress
        if (!task.startedAt && !task.completed && !task.completedAt) return 1 // Pending
        return 2 // Completed
      }
      return getOrder(a) - getOrder(b)
    })

    return NextResponse.json({
      station: requestedStation,
      date,
      scheduleId,
      tasks
    })
  } catch (error) {
    console.error('Error getting station tasks:', error)
    return NextResponse.json({ error: 'Failed to get station tasks' }, { status: 500 })
  }
}
