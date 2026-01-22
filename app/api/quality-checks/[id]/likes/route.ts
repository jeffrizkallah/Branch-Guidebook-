import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET - Get all likes for a quality check
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const qualityCheckId = parseInt(id)

    if (isNaN(qualityCheckId)) {
      return NextResponse.json({ error: 'Invalid quality check ID' }, { status: 400 })
    }

    const userId = session.user.id
    const userRole = session.user.role

    // First, get the quality check to verify access
    const qcResult = await sql`
      SELECT submitted_by FROM quality_checks WHERE id = ${qualityCheckId}
    `

    if (qcResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quality check not found' }, { status: 404 })
    }

    const submitterId = qcResult.rows[0].submitted_by

    // Check access: user can see likes if they are:
    // 1. The submitter of the quality check
    // 2. A manager role (admin, regional_manager, operations_lead)
    const isSubmitter = submitterId === userId
    const isManager = ['admin', 'regional_manager', 'operations_lead'].includes(userRole || '')

    if (!isSubmitter && !isManager) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all likes for this quality check
    const likesResult = await sql`
      SELECT 
        ql.id,
        ql.quality_check_id as "qualityCheckId",
        ql.given_by as "givenBy",
        ql.note,
        ql.tags,
        ql.created_at as "createdAt",
        u.first_name || ' ' || u.last_name as "givenByName",
        u.role as "givenByRole"
      FROM quality_likes ql
      JOIN users u ON ql.given_by = u.id
      WHERE ql.quality_check_id = ${qualityCheckId}
      ORDER BY ql.created_at DESC
    `

    // Check if current user has liked this
    const userHasLiked = likesResult.rows.some(like => like.givenBy === userId)
    const currentUserLike = likesResult.rows.find(like => like.givenBy === userId)

    return NextResponse.json({
      likes: likesResult.rows,
      userHasLiked,
      totalLikes: likesResult.rows.length,
      currentUserLikeId: currentUserLike?.id
    })

  } catch (error) {
    console.error('Error fetching quality likes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch likes' },
      { status: 500 }
    )
  }
}
