import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

// POST - Reorder fields (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can modify field config
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can reorder form fields' }, { status: 403 })
    }

    const data = await request.json()

    // Expect an array of { id, sortOrder }
    if (!Array.isArray(data.fields)) {
      return NextResponse.json({ error: 'Expected fields array with { id, sortOrder } objects' }, { status: 400 })
    }

    // Update each field's sort order
    for (const field of data.fields) {
      if (typeof field.id !== 'number' || typeof field.sortOrder !== 'number') {
        continue
      }
      await sql`
        UPDATE quality_check_field_config 
        SET sort_order = ${field.sortOrder}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${field.id}
      `
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Field order updated successfully'
    })
  } catch (error) {
    console.error('Error reordering fields:', error)
    return NextResponse.json({ error: 'Failed to reorder fields' }, { status: 500 })
  }
}

