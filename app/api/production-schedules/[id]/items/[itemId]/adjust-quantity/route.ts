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

    const { date, adjustedQuantity, reason, inventoryOffset } = await request.json()

    if (!date || adjustedQuantity === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (adjustedQuantity < 0) {
      return NextResponse.json({ error: 'Adjusted quantity cannot be negative' }, { status: 400 })
    }

    const schedules = readSchedules()
    const scheduleIndex = schedules.findIndex((s: any) => s.scheduleId === params.id)

    if (scheduleIndex === -1) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const dayIndex = schedules[scheduleIndex].days.findIndex((d: any) => d.date === date)
    if (dayIndex === -1) {
      return NextResponse.json({ error: 'Date not found in schedule' }, { status: 404 })
    }

    const itemIndex = schedules[scheduleIndex].days[dayIndex].items.findIndex(
      (i: any) => i.itemId === params.itemId
    )

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const item = schedules[scheduleIndex].days[dayIndex].items[itemIndex]
    const timestamp = new Date().toISOString()

    // Update item with adjustment information
    schedules[scheduleIndex].days[dayIndex].items[itemIndex] = {
      ...item,
      originalQuantity: item.originalQuantity || item.quantity,
      adjustedQuantity,
      quantity: adjustedQuantity, // Update the main quantity field for recipe scaling
      adjustmentReason: reason,
      inventoryOffset: inventoryOffset || 0,
      adjustedBy: session.user.id.toString(),
      adjustedAt: timestamp
    }

    writeSchedules(schedules)

    return NextResponse.json({
      success: true,
      item: schedules[scheduleIndex].days[dayIndex].items[itemIndex]
    })
  } catch (error) {
    console.error('Error adjusting quantity:', error)
    return NextResponse.json({ error: 'Failed to adjust quantity' }, { status: 500 })
  }
}
