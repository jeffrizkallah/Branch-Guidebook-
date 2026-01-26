import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql`
      SELECT schedule_data
      FROM production_schedules
      WHERE schedule_id = ${params.id}
    `
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0].schedule_data)
  } catch (error) {
    console.error('Error reading production schedule:', error)
    return NextResponse.json({ error: 'Failed to read production schedule' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const updatedSchedule = await request.json()
    
    // Get existing schedule
    const existing = await sql`
      SELECT schedule_data
      FROM production_schedules
      WHERE schedule_id = ${params.id}
    `
    
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }
    
    // Merge updates
    const merged = { ...existing.rows[0].schedule_data, ...updatedSchedule }
    
    // Update in database
    await sql`
      UPDATE production_schedules
      SET schedule_data = ${JSON.stringify(merged)}::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = ${params.id}
    `
    
    return NextResponse.json(merged)
  } catch (error) {
    console.error('Error updating production schedule:', error)
    return NextResponse.json({ error: 'Failed to update production schedule' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    
    // Get existing schedule
    const existing = await sql`
      SELECT schedule_data
      FROM production_schedules
      WHERE schedule_id = ${params.id}
    `
    
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }
    
    let schedule = existing.rows[0].schedule_data
    
    // Handle item completion updates
    if (updates.itemId && typeof updates.completed === 'boolean') {
      const { date, itemId, completed } = updates
      const dayIndex = schedule.days.findIndex((d: any) => d.date === date)
      
      if (dayIndex !== -1) {
        const itemIndex = schedule.days[dayIndex].items.findIndex(
          (i: any) => i.itemId === itemId
        )
        
        if (itemIndex !== -1) {
          schedule.days[dayIndex].items[itemIndex].completed = completed
        }
      }
    } else {
      // Regular partial update
      schedule = { ...schedule, ...updates }
    }
    
    // Update in database
    await sql`
      UPDATE production_schedules
      SET schedule_data = ${JSON.stringify(schedule)}::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = ${params.id}
    `
    
    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Error patching production schedule:', error)
    return NextResponse.json({ error: 'Failed to update production schedule' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql`
      DELETE FROM production_schedules
      WHERE schedule_id = ${params.id}
      RETURNING schedule_data
    `
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0].schedule_data)
  } catch (error) {
    console.error('Error deleting production schedule:', error)
    return NextResponse.json({ error: 'Failed to delete production schedule' }, { status: 500 })
  }
}

