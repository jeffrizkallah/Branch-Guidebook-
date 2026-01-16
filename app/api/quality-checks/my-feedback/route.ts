import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

// GET - Get all feedback given by the current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = session.user.role

    // Only managers can give feedback, so only they should see their feedback
    if (!['admin', 'regional_manager', 'operations_lead'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get feedback given by this user along with quality check and submitter info
    const feedbackResult = await sql`
      SELECT 
        qf.id,
        qf.quality_check_id as "qualityCheckId",
        qf.feedback_text as "feedbackText",
        qf.is_read as "isRead",
        qf.read_at as "readAt",
        qf.created_at as "createdAt",
        qc.product_name as "productName",
        qc.section,
        qc.branch_slug as "branchSlug",
        qc.meal_service as "mealService",
        qc.submission_date as "submissionDate",
        b.name as "branchName",
        u.first_name || ' ' || u.last_name as "submitterName",
        u.id as "submitterId"
      FROM quality_feedback qf
      JOIN quality_checks qc ON qf.quality_check_id = qc.id
      LEFT JOIN branches b ON qc.branch_slug = b.slug
      LEFT JOIN users u ON qc.submitted_by = u.id
      WHERE qf.feedback_by = ${userId}
      ORDER BY qf.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM quality_feedback
      WHERE feedback_by = ${userId}
    `

    // Get summary stats
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_read = true) as acknowledged,
        COUNT(*) FILTER (WHERE is_read = false) as pending
      FROM quality_feedback
      WHERE feedback_by = ${userId}
    `

    const stats = statsResult.rows[0]

    return NextResponse.json({
      feedback: feedbackResult.rows,
      total: parseInt(countResult.rows[0].count),
      stats: {
        total: parseInt(stats.total),
        acknowledged: parseInt(stats.acknowledged),
        pending: parseInt(stats.pending)
      }
    })

  } catch (error) {
    console.error('Error fetching my feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
