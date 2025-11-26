import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Fetch all notifications for admin (including expired/inactive)
export async function GET() {
  try {
    const result = await sql`
      SELECT 
        n.*,
        (SELECT COUNT(*) FROM notification_reads WHERE notification_id = n.id) as read_count
      FROM notifications n
      ORDER BY n.created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ notifications: result.rows })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

