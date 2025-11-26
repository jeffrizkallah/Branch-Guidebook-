import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

interface RouteParams {
  params: {
    id: string
  }
}

// POST - Mark notification as read for user
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Insert read record (ignore if already exists)
    await sql`
      INSERT INTO notification_reads (notification_id, user_identifier)
      VALUES (${id}::uuid, ${userId})
      ON CONFLICT (notification_id, user_identifier) DO NOTHING
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}

