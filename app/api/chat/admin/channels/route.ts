import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { sql } from '@vercel/postgres'

// GET all channels with stats (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const result = await sql`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM chat_messages WHERE channel_id = c.id) as message_count,
        (SELECT COUNT(DISTINCT user_id) FROM chat_members WHERE channel_id = c.id) as member_count,
        (SELECT MAX(created_at) FROM chat_messages WHERE channel_id = c.id) as last_message_at
      FROM chat_channels c
      ORDER BY c.created_at ASC
    `

    return NextResponse.json({ channels: result.rows })
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}

// POST create a new channel (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, icon, is_read_only } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 })
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check if slug already exists
    const existing = await sql`
      SELECT id FROM chat_channels WHERE slug = ${slug}
    `
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'A channel with this name already exists' }, { status: 400 })
    }

    const userId = Number(session.user.id)
    const result = await sql`
      INSERT INTO chat_channels (name, slug, description, icon, is_read_only, created_by)
      VALUES (${name.trim()}, ${slug}, ${description || null}, ${icon || 'hash'}, ${is_read_only || false}, ${userId})
      RETURNING *
    `

    return NextResponse.json({ channel: result.rows[0] })
  } catch (error) {
    console.error('Error creating channel:', error)
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
  }
}

