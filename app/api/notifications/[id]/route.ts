import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Get single notification
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params
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
      WHERE n.id = ${id}::uuid
    `

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ notification: result.rows[0] })
  } catch (error) {
    console.error('Failed to fetch notification:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    )
  }
}

// PUT - Update notification (admin)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params
    const body = await request.json()
    const { type, priority, title, preview, content, is_active, expires_in_days } = body

    // Build update query dynamically based on provided fields
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (type !== undefined) {
      updates.push(`type = $${paramIndex}`)
      values.push(type)
      paramIndex++
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`)
      values.push(priority)
      paramIndex++
    }
    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`)
      values.push(title)
      paramIndex++
    }
    if (preview !== undefined) {
      updates.push(`preview = $${paramIndex}`)
      values.push(preview)
      paramIndex++
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex}`)
      values.push(content)
      paramIndex++
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`)
      values.push(is_active)
      paramIndex++
    }
    if (expires_in_days !== undefined) {
      updates.push(`expires_at = NOW() + INTERVAL '1 day' * $${paramIndex}`)
      values.push(expires_in_days)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Use sql template for the update
    const result = await sql`
      UPDATE notifications 
      SET type = COALESCE(${type}, type),
          priority = COALESCE(${priority}, priority),
          title = COALESCE(${title}, title),
          preview = COALESCE(${preview}, preview),
          content = COALESCE(${content}, content),
          is_active = COALESCE(${is_active}, is_active)
      WHERE id = ${id}::uuid
      RETURNING *
    `

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ notification: result.rows[0] })
  } catch (error) {
    console.error('Failed to update notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

// DELETE - Delete notification (admin)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params

    const result = await sql`
      DELETE FROM notifications 
      WHERE id = ${id}::uuid
      RETURNING id
    `

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Failed to delete notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}

