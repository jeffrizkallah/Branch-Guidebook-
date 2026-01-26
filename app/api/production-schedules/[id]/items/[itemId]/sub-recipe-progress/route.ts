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

    const allowedRoles = ['admin', 'operations_lead', 'head_chef', 'station_staff']
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { date, subRecipeId, completed, completedAt } = await request.json()

    if (!date || !subRecipeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Station staff can only update items assigned to their station
    if (session.user.role === 'station_staff' && session.user.stationAssignment) {
      const item = schedule.days[dayIndex].items[itemIndex]
      if (item.assignedTo !== session.user.stationAssignment) {
        return NextResponse.json({ error: 'Forbidden: Item not assigned to your station' }, { status: 403 })
      }
    }

    const item = schedule.days[dayIndex].items[itemIndex]

    // Initialize subRecipeProgress if it doesn't exist
    if (!item.subRecipeProgress) {
      item.subRecipeProgress = {}
    }

    // Update the sub-recipe progress
    item.subRecipeProgress[subRecipeId] = {
      completed: completed !== undefined ? completed : true,
      completedAt: completed ? (completedAt || new Date().toISOString()) : null
    }

    schedule.days[dayIndex].items[itemIndex] = item

    await sql`
      UPDATE production_schedules
      SET schedule_data = ${JSON.stringify(schedule)}::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = ${params.id}
    `

    return NextResponse.json({
      success: true,
      item
    })
  } catch (error) {
    console.error('Error updating sub-recipe progress:', error)
    return NextResponse.json({ error: 'Failed to update sub-recipe progress' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 })
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
    const day = schedule.days.find((d: any) => d.date === date)

    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }

    const item = day.items.find((i: any) => i.itemId === params.itemId)

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({
      itemId: item.itemId,
      subRecipeProgress: item.subRecipeProgress || {}
    })
  } catch (error) {
    console.error('Error getting sub-recipe progress:', error)
    return NextResponse.json({ error: 'Failed to get sub-recipe progress' }, { status: 500 })
  }
}
