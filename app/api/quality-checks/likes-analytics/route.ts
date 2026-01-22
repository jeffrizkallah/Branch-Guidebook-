import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers can view analytics
    const userRole = session.user.role
    if (!['admin', 'regional_manager', 'operations_lead'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'

    // Calculate date range
    let startDate: Date
    const endDate = new Date()
    
    if (period === 'week') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
    } else if (period === 'month') {
      startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 1)
    } else {
      // Default to month
      startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 1)
    }

    // Get total likes in period
    const likesResult = await sql`
      SELECT COUNT(*)::int as total
      FROM quality_likes ql
      JOIN quality_checks qc ON ql.quality_check_id = qc.id
      WHERE qc.submission_date >= ${startDate.toISOString()}
      AND qc.submission_date <= ${endDate.toISOString()}
    `

    const totalLikes = likesResult.rows[0]?.total || 0

    // Get number of submissions with at least one like
    const likedSubmissionsResult = await sql`
      SELECT COUNT(DISTINCT ql.quality_check_id)::int as count
      FROM quality_likes ql
      JOIN quality_checks qc ON ql.quality_check_id = qc.id
      WHERE qc.submission_date >= ${startDate.toISOString()}
      AND qc.submission_date <= ${endDate.toISOString()}
    `

    const likedSubmissions = likedSubmissionsResult.rows[0]?.count || 0

    // Get total submissions in period
    const totalSubmissionsResult = await sql`
      SELECT COUNT(*)::int as total
      FROM quality_checks
      WHERE submission_date >= ${startDate.toISOString()}
      AND submission_date <= ${endDate.toISOString()}
    `

    const totalSubmissions = totalSubmissionsResult.rows[0]?.total || 0

    // Calculate like rate
    const likeRate = totalSubmissions > 0 ? (likedSubmissions / totalSubmissions) * 100 : 0

    // Get top performers (users with most likes)
    const topPerformersResult = await sql`
      SELECT 
        u.first_name || ' ' || u.last_name as name,
        COUNT(ql.id)::int as "likesCount",
        COUNT(DISTINCT qc.id)::int as "submissionsCount"
      FROM quality_checks qc
      JOIN users u ON qc.submitted_by = u.id
      LEFT JOIN quality_likes ql ON qc.id = ql.quality_check_id
      WHERE qc.submission_date >= ${startDate.toISOString()}
      AND qc.submission_date <= ${endDate.toISOString()}
      AND ql.id IS NOT NULL
      GROUP BY u.id, u.first_name, u.last_name
      HAVING COUNT(ql.id) > 0
      ORDER BY "likesCount" DESC
      LIMIT 10
    `

    // Get top recognition tags
    const topTagsResult = await sql`
      SELECT 
        tag,
        COUNT(*)::int as count
      FROM (
        SELECT jsonb_array_elements_text(tags) as tag
        FROM quality_likes ql
        JOIN quality_checks qc ON ql.quality_check_id = qc.id
        WHERE qc.submission_date >= ${startDate.toISOString()}
        AND qc.submission_date <= ${endDate.toISOString()}
        AND jsonb_array_length(tags) > 0
      ) tags
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 5
    `

    return NextResponse.json({
      totalLikes,
      likedSubmissions,
      totalSubmissions,
      likeRate,
      topPerformers: topPerformersResult.rows,
      topTags: topTagsResult.rows,
      recentTrend: 'stable' // Could be enhanced with historical comparison
    })

  } catch (error) {
    console.error('Error fetching like analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
