import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Fetch all active notifications with read status for user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || ''

    const result = await sql`
      SELECT 
        n.*,
        CASE WHEN nr.id IS NOT NULL THEN true ELSE false END as is_read
      FROM notifications n
      LEFT JOIN notification_reads nr 
        ON n.id = nr.notification_id 
        AND nr.user_identifier = ${userId}
      WHERE n.is_active = true 
        AND n.expires_at > NOW()
      ORDER BY n.created_at DESC
      LIMIT 50
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

// POST - Create new notification (admin)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, priority, title, preview, content, created_by, expires_in_days } = body

    // Validate required fields
    if (!type || !title || !preview || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, preview, content' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['feature', 'patch', 'alert', 'announcement', 'urgent']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Calculate expiration date
    const expiresInDays = expires_in_days || 7
    
    const result = await sql`
      INSERT INTO notifications (
        type, 
        priority, 
        title, 
        preview, 
        content, 
        created_by,
        expires_at
      ) VALUES (
        ${type},
        ${priority || 'normal'},
        ${title},
        ${preview},
        ${content},
        ${created_by || 'admin'},
        NOW() + INTERVAL '1 day' * ${expiresInDays}
      )
      RETURNING *
    `

    return NextResponse.json({ notification: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Failed to create notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

