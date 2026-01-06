import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { sql } from '@vercel/postgres'

// PUT update a channel (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const channelId = parseInt(params.id)
    if (isNaN(channelId)) {
      return NextResponse.json({ error: 'Invalid channel ID' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, icon, is_read_only } = body

    // Check channel exists
    const existing = await sql`
      SELECT * FROM chat_channels WHERE id = ${channelId}
    `
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Update channel
    const result = await sql`
      UPDATE chat_channels
      SET 
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description}, description),
        icon = COALESCE(${icon || null}, icon),
        is_read_only = COALESCE(${is_read_only}, is_read_only),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${channelId}
      RETURNING *
    `

    return NextResponse.json({ channel: result.rows[0] })
  } catch (error) {
    console.error('Error updating channel:', error)
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 })
  }
}

// DELETE a channel (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const channelId = parseInt(params.id)
    if (isNaN(channelId)) {
      return NextResponse.json({ error: 'Invalid channel ID' }, { status: 400 })
    }

    // Check if it's the general channel (protected)
    const existing = await sql`
      SELECT slug FROM chat_channels WHERE id = ${channelId}
    `
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    if (existing.rows[0].slug === 'general') {
      return NextResponse.json({ error: 'Cannot delete the General channel' }, { status: 400 })
    }

    // Delete channel (messages will cascade delete)
    await sql`
      DELETE FROM chat_channels WHERE id = ${channelId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting channel:', error)
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 })
  }
}

