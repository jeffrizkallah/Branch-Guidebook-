import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'

// GET - Get quality check summary for dashboard
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today' // today, week, month
    
    const user = session.user
    const isAdmin = user.role === 'admin' || user.role === 'operations_lead'
    
    // If not admin and no branches, return empty
    if (!isAdmin && (!user.branches || user.branches.length === 0)) {
      return NextResponse.json({
        totalSubmissions: 0,
        complianceRate: 0,
        completedBranches: [],
        pendingBranches: [],
        todayCompliance: [],
        averageScores: { taste: 0, appearance: 0 },
        bySection: [],
        recentSubmissions: [],
        lowScores: []
      })
    }

    // Calculate date range
    const now = new Date()
    let startDate: Date
    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get all branches (for compliance tracking)
    const branchesResult = await sql`
      SELECT slug, name FROM branches WHERE slug != 'central-kitchen' ORDER BY name
    `
    
    let relevantBranches = branchesResult.rows
    if (!isAdmin && user.branches) {
      relevantBranches = branchesResult.rows.filter(b => user.branches!.includes(b.slug))
    }

    // Get total submissions in period
    let totalResult
    if (isAdmin) {
      totalResult = await sql`
        SELECT COUNT(*) as count
        FROM quality_checks
        WHERE submission_date >= ${startDate.toISOString()}
      `
    } else {
      totalResult = await sql`
        SELECT COUNT(*) as count
        FROM quality_checks
        WHERE submission_date >= ${startDate.toISOString()}
        AND branch_slug = ANY(${user.branches})
      `
    }
    const totalSubmissions = parseInt(totalResult.rows[0].count)

    // Get today's submissions for compliance check
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    let todaySubmissionsResult
    if (isAdmin) {
      todaySubmissionsResult = await sql`
        SELECT DISTINCT branch_slug, meal_service
        FROM quality_checks
        WHERE submission_date >= ${todayStart}
      `
    } else {
      todaySubmissionsResult = await sql`
        SELECT DISTINCT branch_slug, meal_service
        FROM quality_checks
        WHERE submission_date >= ${todayStart}
        AND branch_slug = ANY(${user.branches})
      `
    }

    // Build compliance map
    const submittedMap = new Map<string, { breakfast: boolean; lunch: boolean }>()
    todaySubmissionsResult.rows.forEach(row => {
      const existing = submittedMap.get(row.branch_slug) || { breakfast: false, lunch: false }
      if (row.meal_service === 'breakfast') existing.breakfast = true
      if (row.meal_service === 'lunch') existing.lunch = true
      submittedMap.set(row.branch_slug, existing)
    })

    const todayCompliance = relevantBranches.map(b => ({
      branchSlug: b.slug,
      branchName: b.name,
      breakfastSubmitted: submittedMap.get(b.slug)?.breakfast || false,
      lunchSubmitted: submittedMap.get(b.slug)?.lunch || false
    }))

    const completedBranches = todayCompliance.filter(b => b.breakfastSubmitted || b.lunchSubmitted)
    const pendingBranches = todayCompliance.filter(b => !b.breakfastSubmitted && !b.lunchSubmitted)

    // Get average scores
    let avgResult
    if (isAdmin) {
      avgResult = await sql`
        SELECT 
          ROUND(AVG(taste_score)::numeric, 1) as "avgTaste",
          ROUND(AVG(appearance_score)::numeric, 1) as "avgAppearance"
        FROM quality_checks
        WHERE submission_date >= ${startDate.toISOString()}
      `
    } else {
      avgResult = await sql`
        SELECT 
          ROUND(AVG(taste_score)::numeric, 1) as "avgTaste",
          ROUND(AVG(appearance_score)::numeric, 1) as "avgAppearance"
        FROM quality_checks
        WHERE submission_date >= ${startDate.toISOString()}
        AND branch_slug = ANY(${user.branches})
      `
    }

    // Get submissions by section
    let sectionResult
    if (isAdmin) {
      sectionResult = await sql`
        SELECT 
          section,
          COUNT(*) as count,
          ROUND(AVG(taste_score)::numeric, 1) as "avgTaste",
          ROUND(AVG(appearance_score)::numeric, 1) as "avgAppearance"
        FROM quality_checks
        WHERE submission_date >= ${startDate.toISOString()}
        GROUP BY section
        ORDER BY count DESC
      `
    } else {
      sectionResult = await sql`
        SELECT 
          section,
          COUNT(*) as count,
          ROUND(AVG(taste_score)::numeric, 1) as "avgTaste",
          ROUND(AVG(appearance_score)::numeric, 1) as "avgAppearance"
        FROM quality_checks
        WHERE submission_date >= ${startDate.toISOString()}
        AND branch_slug = ANY(${user.branches})
        GROUP BY section
        ORDER BY count DESC
      `
    }

    // Get recent submissions
    let recentResult
    if (isAdmin) {
      recentResult = await sql`
        SELECT 
          qc.id,
          qc.branch_slug as "branchSlug",
          qc.submission_date as "submissionDate",
          qc.meal_service as "mealService",
          qc.product_name as "productName",
          qc.section,
          qc.taste_score as "tasteScore",
          qc.appearance_score as "appearanceScore",
          qc.status,
          u.first_name || ' ' || u.last_name as "submitterName",
          b.name as "branchName"
        FROM quality_checks qc
        LEFT JOIN users u ON qc.submitted_by = u.id
        LEFT JOIN branches b ON qc.branch_slug = b.slug
        ORDER BY qc.submission_date DESC
        LIMIT 10
      `
    } else {
      recentResult = await sql`
        SELECT 
          qc.id,
          qc.branch_slug as "branchSlug",
          qc.submission_date as "submissionDate",
          qc.meal_service as "mealService",
          qc.product_name as "productName",
          qc.section,
          qc.taste_score as "tasteScore",
          qc.appearance_score as "appearanceScore",
          qc.status,
          u.first_name || ' ' || u.last_name as "submitterName",
          b.name as "branchName"
        FROM quality_checks qc
        LEFT JOIN users u ON qc.submitted_by = u.id
        LEFT JOIN branches b ON qc.branch_slug = b.slug
        WHERE qc.branch_slug = ANY(${user.branches})
        ORDER BY qc.submission_date DESC
        LIMIT 10
      `
    }

    // Calculate compliance rate
    const daysInPeriod = period === 'today' ? 1 : period === 'week' ? 7 : 30
    const branchCount = relevantBranches.length
    const expectedSubmissions = branchCount * 2 * daysInPeriod
    const complianceRate = expectedSubmissions > 0 
      ? Math.round((totalSubmissions / expectedSubmissions) * 100) 
      : 0

    // Get low scores
    let lowScoresResult
    if (isAdmin) {
      lowScoresResult = await sql`
        SELECT 
          qc.id,
          qc.branch_slug as "branchSlug",
          qc.product_name as "productName",
          qc.taste_score as "tasteScore",
          qc.appearance_score as "appearanceScore",
          qc.remarks,
          qc.submission_date as "submissionDate",
          b.name as "branchName"
        FROM quality_checks qc
        LEFT JOIN branches b ON qc.branch_slug = b.slug
        WHERE (qc.taste_score <= 2 OR qc.appearance_score <= 2)
        AND qc.submission_date >= ${startDate.toISOString()}
        ORDER BY qc.submission_date DESC
        LIMIT 5
      `
    } else {
      lowScoresResult = await sql`
        SELECT 
          qc.id,
          qc.branch_slug as "branchSlug",
          qc.product_name as "productName",
          qc.taste_score as "tasteScore",
          qc.appearance_score as "appearanceScore",
          qc.remarks,
          qc.submission_date as "submissionDate",
          b.name as "branchName"
        FROM quality_checks qc
        LEFT JOIN branches b ON qc.branch_slug = b.slug
        WHERE (qc.taste_score <= 2 OR qc.appearance_score <= 2)
        AND qc.submission_date >= ${startDate.toISOString()}
        AND qc.branch_slug = ANY(${user.branches})
        ORDER BY qc.submission_date DESC
        LIMIT 5
      `
    }

    return NextResponse.json({
      totalSubmissions,
      complianceRate,
      completedBranches,
      pendingBranches,
      todayCompliance,
      averageScores: {
        taste: parseFloat(avgResult.rows[0]?.avgTaste) || 0,
        appearance: parseFloat(avgResult.rows[0]?.avgAppearance) || 0
      },
      bySection: sectionResult.rows,
      recentSubmissions: recentResult.rows,
      lowScores: lowScoresResult.rows
    })
  } catch (error) {
    console.error('Error fetching quality check summary:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}

