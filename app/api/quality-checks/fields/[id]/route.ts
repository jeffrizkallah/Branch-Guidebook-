import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

// GET - Fetch single field configuration
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const result = await sql`
      SELECT 
        id,
        field_key as "fieldKey",
        label,
        field_type as "fieldType",
        is_required as "isRequired",
        is_active as "isActive",
        sort_order as "sortOrder",
        options,
        min_value as "minValue",
        max_value as "maxValue",
        placeholder,
        notes_enabled as "notesEnabled",
        section,
        icon,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM quality_check_field_config
      WHERE id = ${parseInt(id)}
    `
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching field config:', error)
    return NextResponse.json({ error: 'Failed to fetch field configuration' }, { status: 500 })
  }
}

// PUT - Update field configuration (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can modify field config
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can modify form fields' }, { status: 403 })
    }

    const { id } = await params
    const data = await request.json()

    // Check if field exists
    const existing = await sql`SELECT * FROM quality_check_field_config WHERE id = ${parseInt(id)}`
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 })
    }

    const currentField = existing.rows[0]

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.label !== undefined) {
      updates.push(`label = $${paramIndex}`)
      values.push(data.label)
      paramIndex++
    }

    if (data.isRequired !== undefined) {
      updates.push(`is_required = $${paramIndex}`)
      values.push(data.isRequired)
      paramIndex++
    }

    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`)
      values.push(data.isActive)
      paramIndex++
    }

    if (data.sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex}`)
      values.push(data.sortOrder)
      paramIndex++
    }

    if (data.options !== undefined) {
      updates.push(`options = $${paramIndex}::jsonb`)
      values.push(data.options ? JSON.stringify(data.options) : null)
      paramIndex++
    }

    if (data.minValue !== undefined) {
      updates.push(`min_value = $${paramIndex}`)
      values.push(data.minValue)
      paramIndex++
    }

    if (data.maxValue !== undefined) {
      updates.push(`max_value = $${paramIndex}`)
      values.push(data.maxValue)
      paramIndex++
    }

    if (data.placeholder !== undefined) {
      updates.push(`placeholder = $${paramIndex}`)
      values.push(data.placeholder)
      paramIndex++
    }

    if (data.notesEnabled !== undefined) {
      updates.push(`notes_enabled = $${paramIndex}`)
      values.push(data.notesEnabled)
      paramIndex++
    }

    if (data.icon !== undefined) {
      updates.push(`icon = $${paramIndex}`)
      values.push(data.icon)
      paramIndex++
    }

    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    if (updates.length === 1) { // Only updated_at
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(parseInt(id))
    const query = `UPDATE quality_check_field_config SET ${updates.join(', ')} WHERE id = $${paramIndex}`
    
    await sql.query(query, values)

    return NextResponse.json({ 
      success: true, 
      message: 'Field configuration updated successfully'
    })
  } catch (error) {
    console.error('Error updating field config:', error)
    return NextResponse.json({ error: 'Failed to update field configuration' }, { status: 500 })
  }
}

// DELETE - Delete field configuration (admin only, custom fields only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete field config
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can delete form fields' }, { status: 403 })
    }

    const { id } = await params

    // Check if field exists and is not a core field
    const existing = await sql`SELECT section, label FROM quality_check_field_config WHERE id = ${parseInt(id)}`
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 })
    }

    if (existing.rows[0].section === 'core') {
      return NextResponse.json({ 
        error: 'Cannot delete core fields. You can disable them instead.' 
      }, { status: 400 })
    }

    await sql`DELETE FROM quality_check_field_config WHERE id = ${parseInt(id)}`

    return NextResponse.json({ 
      success: true, 
      message: `Field "${existing.rows[0].label}" deleted successfully`
    })
  } catch (error) {
    console.error('Error deleting field config:', error)
    return NextResponse.json({ error: 'Failed to delete field configuration' }, { status: 500 })
  }
}

