import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

// GET - List quality checks (filtered by user's branches for managers)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const section = searchParams.get('section')
    const mealService = searchParams.get('mealService')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const user = session.user
    const isAdmin = user.role === 'admin' || user.role === 'operations_lead' || user.role === 'regional_manager'
    const isCentralKitchen = user.role === 'central_kitchen'

    // Build the query with filters
    let query = `
      SELECT 
        qc.id,
        qc.branch_slug as "branchSlug",
        qc.submitted_by as "submittedBy",
        qc.submission_date as "submissionDate",
        qc.meal_service as "mealService",
        qc.product_name as "productName",
        qc.section,
        qc.taste_score as "tasteScore",
        qc.appearance_score as "appearanceScore",
        qc.portion_qty_gm as "portionQtyGm",
        qc.temp_celsius as "tempCelsius",
        qc.taste_notes as "tasteNotes",
        qc.portion_notes as "portionNotes",
        qc.appearance_notes as "appearanceNotes",
        qc.remarks,
        qc.corrective_action_taken as "correctiveActionTaken",
        qc.corrective_action_notes as "correctiveActionNotes",
        qc.photos,
        qc.custom_fields as "customFields",
        qc.status,
        qc.admin_notes as "adminNotes",
        qc.reviewed_by as "reviewedBy",
        qc.reviewed_at as "reviewedAt",
        qc.created_at as "createdAt",
        u.first_name || ' ' || u.last_name as "submitterName",
        b.name as "branchName"
      FROM quality_checks qc
      LEFT JOIN users u ON qc.submitted_by = u.id
      LEFT JOIN branches b ON qc.branch_slug = b.slug
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramIndex = 1

    // Filter by user's branches if not admin
    if (!isAdmin && !isCentralKitchen && user.branches && user.branches.length > 0) {
      query += ` AND qc.branch_slug = ANY($${paramIndex})`
      params.push(user.branches)
      paramIndex++
    } else if (!isAdmin && !isCentralKitchen) {
      // User has no branches, return empty
      return NextResponse.json([])
    } else if (isCentralKitchen) {
      // Central kitchen can only see central-kitchen branch quality checks
      query += ` AND qc.branch_slug = $${paramIndex}`
      params.push('central-kitchen')
      paramIndex++
    }

    // Apply filters
    if (branch) {
      query += ` AND qc.branch_slug = $${paramIndex}`
      params.push(branch)
      paramIndex++
    }

    if (startDate) {
      query += ` AND DATE(qc.submission_date) >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND DATE(qc.submission_date) <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    if (section) {
      query += ` AND qc.section = $${paramIndex}`
      params.push(section)
      paramIndex++
    }

    if (mealService) {
      query += ` AND qc.meal_service = $${paramIndex}`
      params.push(mealService)
      paramIndex++
    }

    if (status) {
      query += ` AND qc.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    query += ` ORDER BY qc.submission_date DESC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    // Use raw query for dynamic params
    const result = await sql.query(query, params)
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching quality checks:', error)
    return NextResponse.json({ error: 'Failed to fetch quality checks' }, { status: 500 })
  }
}

// POST - Create new quality check
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    
    // Managers, branch staff, and central kitchen can submit quality checks
    const canSubmitQualityChecks = user.role && ['branch_manager', 'branch_staff', 'admin', 'operations_lead', 'central_kitchen'].includes(user.role)
    if (!canSubmitQualityChecks) {
      return NextResponse.json({ error: 'You do not have permission to submit quality checks' }, { status: 403 })
    }

    const data = await request.json()

    // Validate required fields
    const requiredFields = [
      'branchSlug', 'mealService', 'productName', 'section',
      'tasteScore', 'appearanceScore', 'portionQtyGm', 'tempCelsius'
    ]
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Validate user has access to this branch (unless admin/operations)
    const requiresBranchAccess = user.role && ['branch_manager', 'branch_staff'].includes(user.role)
    if (requiresBranchAccess && !user.branches?.includes(data.branchSlug)) {
      return NextResponse.json({ error: 'You do not have access to this branch' }, { status: 403 })
    }

    // Validate meal service
    if (!['breakfast', 'lunch'].includes(data.mealService)) {
      return NextResponse.json({ error: 'Invalid meal service. Must be breakfast or lunch' }, { status: 400 })
    }

    // Validate scores
    if (data.tasteScore < 1 || data.tasteScore > 5) {
      return NextResponse.json({ error: 'Taste score must be between 1 and 5' }, { status: 400 })
    }
    if (data.appearanceScore < 1 || data.appearanceScore > 5) {
      return NextResponse.json({ error: 'Appearance score must be between 1 and 5' }, { status: 400 })
    }

      const result = await sql`
      INSERT INTO quality_checks (
        branch_slug,
        submitted_by,
        meal_service,
        product_name,
        section,
        taste_score,
        appearance_score,
        portion_qty_gm,
        temp_celsius,
        taste_notes,
        portion_notes,
        appearance_notes,
        remarks,
        corrective_action_taken,
        corrective_action_notes,
        photos,
        custom_fields
      ) VALUES (
        ${data.branchSlug},
        ${user.id},
        ${data.mealService},
        ${data.productName},
        ${data.section},
        ${data.tasteScore},
        ${data.appearanceScore},
        ${data.portionQtyGm},
        ${data.tempCelsius},
        ${data.tasteNotes || null},
        ${data.portionNotes || null},
        ${data.appearanceNotes || null},
        ${data.remarks || null},
        ${data.correctiveActionTaken || false},
        ${data.correctiveActionNotes || null},
        ${JSON.stringify(data.photos || [])}::jsonb,
        ${JSON.stringify(data.customFields || {})}::jsonb
      )
      RETURNING id
    `

    return NextResponse.json({ 
      success: true, 
      id: result.rows[0].id,
      message: 'Quality check submitted successfully'
    })
  } catch (error) {
    console.error('Error creating quality check:', error)
    return NextResponse.json({ error: 'Failed to submit quality check' }, { status: 500 })
  }
}

