import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

export interface FieldConfig {
  id: number
  fieldKey: string
  label: string
  fieldType: 'rating' | 'number' | 'text' | 'textarea' | 'checkbox' | 'select'
  isRequired: boolean
  isActive: boolean
  sortOrder: number
  options: { options: string[] } | null
  minValue: number | null
  maxValue: number | null
  placeholder: string | null
  notesEnabled: boolean
  section: 'core' | 'custom'
  icon: string | null
  createdAt: string
  updatedAt: string
}

// GET - Fetch all field configurations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false' // Default to true
    
    let query = `
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
    `
    
    if (activeOnly) {
      query += ` WHERE is_active = true`
    }
    
    query += ` ORDER BY sort_order ASC, id ASC`
    
    const result = await sql.query(query)
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching field config:', error)
    return NextResponse.json({ error: 'Failed to fetch field configuration' }, { status: 500 })
  }
}

// POST - Create new field configuration (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can modify field config
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can modify form fields' }, { status: 403 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.fieldKey || !data.label || !data.fieldType) {
      return NextResponse.json({ error: 'Missing required fields: fieldKey, label, fieldType' }, { status: 400 })
    }

    // Validate field key format (alphanumeric with underscores)
    if (!/^[a-z][a-z0-9_]*$/.test(data.fieldKey)) {
      return NextResponse.json({ 
        error: 'Field key must start with a lowercase letter and contain only lowercase letters, numbers, and underscores' 
      }, { status: 400 })
    }

    // Validate field type
    const validTypes = ['rating', 'number', 'text', 'textarea', 'checkbox', 'select']
    if (!validTypes.includes(data.fieldType)) {
      return NextResponse.json({ error: `Invalid field type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    // For rating fields, set default min/max if not provided
    let minValue = data.minValue
    let maxValue = data.maxValue
    if (data.fieldType === 'rating') {
      minValue = data.minValue ?? 1
      maxValue = data.maxValue ?? 5
    }

    // Get the highest sort order
    const maxOrderResult = await sql`SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM quality_check_field_config`
    const nextOrder = maxOrderResult.rows[0].next_order

    const result = await sql`
      INSERT INTO quality_check_field_config (
        field_key, label, field_type, is_required, is_active, sort_order,
        options, min_value, max_value, placeholder, notes_enabled, section, icon
      ) VALUES (
        ${data.fieldKey},
        ${data.label},
        ${data.fieldType},
        ${data.isRequired ?? false},
        ${data.isActive ?? true},
        ${data.sortOrder ?? nextOrder},
        ${data.options ? JSON.stringify(data.options) : null}::jsonb,
        ${minValue ?? null},
        ${maxValue ?? null},
        ${data.placeholder ?? null},
        ${data.notesEnabled ?? false},
        'custom',
        ${data.icon ?? null}
      )
      RETURNING id
    `

    return NextResponse.json({ 
      success: true, 
      id: result.rows[0].id,
      message: 'Field configuration created successfully'
    })
  } catch (error: any) {
    console.error('Error creating field config:', error)
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'A field with this key already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create field configuration' }, { status: 500 })
  }
}

