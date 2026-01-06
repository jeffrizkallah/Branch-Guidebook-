import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

// GET - Get single quality check
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const user = session.user
    const isAdmin = user.role === 'admin' || user.role === 'operations_lead'

    const result = await sql`
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
        qc.status,
        qc.admin_notes as "adminNotes",
        qc.reviewed_by as "reviewedBy",
        qc.reviewed_at as "reviewedAt",
        qc.created_at as "createdAt",
        u.first_name || ' ' || u.last_name as "submitterName",
        u.email as "submitterEmail",
        b.name as "branchName"
      FROM quality_checks qc
      LEFT JOIN users u ON qc.submitted_by = u.id
      LEFT JOIN branches b ON qc.branch_slug = b.slug
      WHERE qc.id = ${parseInt(id)}
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quality check not found' }, { status: 404 })
    }

    const qualityCheck = result.rows[0]

    // Check access
    if (!isAdmin && !user.branches?.includes(qualityCheck.branchSlug)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(qualityCheck)
  } catch (error) {
    console.error('Error fetching quality check:', error)
    return NextResponse.json({ error: 'Failed to fetch quality check' }, { status: 500 })
  }
}

// PUT - Update quality check (admin review)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    
    // Only admin and operations_lead can review
    if (user.role !== 'admin' && user.role !== 'operations_lead') {
      return NextResponse.json({ error: 'Only admins can review quality checks' }, { status: 403 })
    }

    const { id } = await params
    const data = await request.json()

    await sql`
      UPDATE quality_checks
      SET 
        status = COALESCE(${data.status || null}, status),
        admin_notes = COALESCE(${data.adminNotes || null}, admin_notes),
        reviewed_by = ${user.id},
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(id)}
    `

    return NextResponse.json({ success: true, message: 'Quality check updated' })
  } catch (error) {
    console.error('Error updating quality check:', error)
    return NextResponse.json({ error: 'Failed to update quality check' }, { status: 500 })
  }
}

// DELETE - Delete quality check (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete quality checks' }, { status: 403 })
    }

    const { id } = await params

    await sql`DELETE FROM quality_checks WHERE id = ${parseInt(id)}`

    return NextResponse.json({ success: true, message: 'Quality check deleted' })
  } catch (error) {
    console.error('Error deleting quality check:', error)
    return NextResponse.json({ error: 'Failed to delete quality check' }, { status: 500 })
  }
}

