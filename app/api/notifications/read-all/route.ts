import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

// POST - Mark all notifications as read for user
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Insert read records for all unread notifications
    await sql`
      INSERT INTO notification_reads (notification_id, user_identifier)
      SELECT n.id, ${userId}
      FROM notifications n
      WHERE n.is_active = true 
        AND n.expires_at > NOW()
        AND NOT EXISTS (
          SELECT 1 FROM notification_reads nr 
          WHERE nr.notification_id = n.id 
            AND nr.user_identifier = ${userId}
        )
      ON CONFLICT (notification_id, user_identifier) DO NOTHING
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to mark all as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark all as read' },
      { status: 500 }
    )
  }
}

