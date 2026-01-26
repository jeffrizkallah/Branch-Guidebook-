import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET() {
  try {
    const result = await sql`
      SELECT schedule_data
      FROM production_schedules
      ORDER BY (schedule_data->>'weekStart')::date DESC
    `
    
    const schedules = result.rows.map(row => row.schedule_data)
    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Error reading production schedules:', error)
    return NextResponse.json({ error: 'Failed to read production schedules' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const newSchedule = await request.json()
    
    // Insert or update schedule
    await sql`
      INSERT INTO production_schedules (schedule_id, schedule_data)
      VALUES (${newSchedule.scheduleId}, ${JSON.stringify(newSchedule)}::jsonb)
      ON CONFLICT (schedule_id)
      DO UPDATE SET
        schedule_data = ${JSON.stringify(newSchedule)}::jsonb,
        updated_at = CURRENT_TIMESTAMP
    `
    
    return NextResponse.json(newSchedule, { status: 201 })
  } catch (error) {
    console.error('Error creating production schedule:', error)
    return NextResponse.json({ error: 'Failed to create production schedule' }, { status: 500 })
  }
}

