import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface QualityCheckData {
  id: number
  branchName: string
  branchSlug: string
  submissionDate: string
  mealService: string
  productName: string
  section: string
  tasteScore: number
  appearanceScore: number
  portionQtyGm: number
  tempCelsius: number
  tasteNotes: string | null
  portionNotes: string | null
  appearanceNotes: string | null
  remarks: string | null
  correctiveActionTaken: boolean
  correctiveActionNotes: string | null
}

// POST - Generate AI analysis for quality checks
export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is not set. Please add it to your .env.local file.'
      }, { status: 500 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const isAdmin = user.role === 'admin' || user.role === 'operations_lead'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can generate analytics' }, { status: 403 })
    }

    const body = await request.json()
    const { periodType = 'weekly', startDate, endDate } = body

    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Missing date parameters',
        details: 'Both startDate and endDate are required'
      }, { status: 400 })
    }

    // Check if analysis already exists for this period
    const existingAnalysis = await sql`
      SELECT id, summary, insights, created_at
      FROM quality_analytics_cache
      WHERE period_type = ${periodType}
        AND period_start = ${startDate}
        AND period_end = ${endDate}
        AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `

    // If exists and less than 1 hour old, return cached
    if (existingAnalysis.rows.length > 0) {
      const cached = existingAnalysis.rows[0]
      const cacheAge = Date.now() - new Date(cached.created_at).getTime()
      if (cacheAge < 3600000) { // 1 hour
        return NextResponse.json({
          cached: true,
          analysis: cached,
          message: 'Returning cached analysis (generated less than 1 hour ago)'
        })
      }
    }

    console.log(`Generating ${periodType} analysis for ${startDate} to ${endDate}...`)

    // Fetch quality check data for the period
    const checks = await sql<QualityCheckData>`
      SELECT 
        qc.id,
        qc.branch_slug as "branchSlug",
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
        b.name as "branchName"
      FROM quality_checks qc
      LEFT JOIN branches b ON qc.branch_slug = b.slug
      WHERE qc.submission_date >= ${startDate}::timestamp
        AND qc.submission_date <= ${endDate}::timestamp
      ORDER BY qc.submission_date DESC
    `

    if (checks.rows.length === 0) {
      return NextResponse.json({ 
        error: 'No quality check data found',
        details: `No quality check submissions found between ${new Date(startDate).toLocaleDateString()} and ${new Date(endDate).toLocaleDateString()}. Please select a different date range or add quality check submissions first.`,
        submissionsCount: 0
      }, { status: 404 })
    }

    // Prepare data for AI analysis
    const submissions = checks.rows
    const submissionCount = submissions.length

    // Calculate basic statistics
    const avgTaste = submissions.reduce((acc, s) => acc + s.tasteScore, 0) / submissionCount
    const avgAppearance = submissions.reduce((acc, s) => acc + s.appearanceScore, 0) / submissionCount
    
    const lowScores = submissions.filter(s => s.tasteScore <= 2 || s.appearanceScore <= 2)
    const highScores = submissions.filter(s => s.tasteScore >= 4 && s.appearanceScore >= 4)

    // Get unique branches
    const uniqueBranches = [...new Set(submissions.map(s => s.branchSlug))]

    // Branch performance
    const branchStats = uniqueBranches.map(branchSlug => {
      const branchSubs = submissions.filter(s => s.branchSlug === branchSlug)
      const branchName = branchSubs[0]?.branchName || branchSlug
      return {
        branchSlug,
        branchName,
        count: branchSubs.length,
        avgTaste: (branchSubs.reduce((acc, s) => acc + s.tasteScore, 0) / branchSubs.length).toFixed(1),
        avgAppearance: (branchSubs.reduce((acc, s) => acc + s.appearanceScore, 0) / branchSubs.length).toFixed(1),
      }
    })

    // Prepare text content for AI (notes and remarks)
    const textualData = submissions
      .filter(s => s.tasteNotes || s.appearanceNotes || s.remarks || s.correctiveActionNotes)
      .map(s => ({
        branch: s.branchName,
        product: s.productName,
        section: s.section,
        tasteScore: s.tasteScore,
        appearanceScore: s.appearanceScore,
        notes: [
          s.tasteNotes ? `Taste: ${s.tasteNotes}` : null,
          s.appearanceNotes ? `Appearance: ${s.appearanceNotes}` : null,
          s.portionNotes ? `Portion: ${s.portionNotes}` : null,
          s.remarks ? `Remarks: ${s.remarks}` : null,
          s.correctiveActionNotes ? `Action Taken: ${s.correctiveActionNotes}` : null,
        ].filter(Boolean).join(' | ')
      }))

    // Create AI prompt
    const prompt = `You are a food quality analyst for Mikana, a catering company operating 12 branches in UAE. Analyze the following quality control data and provide actionable insights.

PERIOD: ${periodType} analysis from ${startDate} to ${endDate}
TOTAL SUBMISSIONS: ${submissionCount}
BRANCHES ANALYZED: ${uniqueBranches.length}

AGGREGATE STATISTICS:
- Average Taste Score: ${avgTaste.toFixed(2)}/5
- Average Appearance Score: ${avgAppearance.toFixed(2)}/5
- Low Scores (≤2): ${lowScores.length} submissions (${((lowScores.length/submissionCount)*100).toFixed(1)}%)
- High Scores (≥4): ${highScores.length} submissions (${((highScores.length/submissionCount)*100).toFixed(1)}%)

BRANCH PERFORMANCE:
${branchStats.map(b => `- ${b.branchName}: ${b.count} checks, Taste ${b.avgTaste}, Appearance ${b.avgAppearance}`).join('\n')}

DETAILED NOTES AND FEEDBACK:
${textualData.slice(0, 100).map((item, i) => 
  `${i+1}. [${item.branch}] ${item.product} (${item.section}) - Scores: ${item.tasteScore}/5 taste, ${item.appearanceScore}/5 appearance
   Notes: ${item.notes}`
).join('\n\n')}

${textualData.length > 100 ? `\n(... ${textualData.length - 100} more submissions with notes)` : ''}

Please analyze this data and provide:

1. **Executive Summary** (2-3 sentences): Overall quality status and key takeaways

2. **Critical Issues** (3-5 items): Urgent problems requiring immediate attention, with specific branch/product details

3. **Common Patterns** (3-5 items): Recurring themes in the notes/feedback (e.g., "underseasoning", "portion inconsistency", "temperature issues"). Include frequency count if possible.

4. **Top Performers** (2-3 items): Branches or products with excellent consistent quality

5. **Low Performers** (2-3 items): Branches or products needing improvement, with specific scores

6. **Actionable Recommendations** (3-5 items): Specific, practical steps to improve quality

7. **Trends & Insights**: Any notable patterns (meal service differences, section performance, temperature/portion issues)

Format your response as valid JSON with this structure:
{
  "summary": "string",
  "insights": [
    {"type": "critical|warning|success|info", "title": "string", "description": "string", "branches": ["branch1"], "products": ["product1"]}
  ],
  "commonIssues": [
    {"issue": "string", "frequency": number, "branches": ["branch1", "branch2"], "sections": ["Hot", "Cold"]}
  ],
  "topPerformers": [
    {"name": "string", "type": "branch|product", "avgScore": number, "note": "string"}
  ],
  "lowPerformers": [
    {"name": "string", "type": "branch|product", "avgScore": number, "criticalProducts": ["product1"], "note": "string"}
  ],
  "recommendations": [
    {"priority": "high|medium|low", "action": "string", "target": "string", "expectedImpact": "string"}
  ],
  "trends": {
    "mealServiceComparison": "string",
    "sectionComparison": "string", 
    "temperatureIssues": "string",
    "portionConsistency": "string"
  }
}

Important: Return ONLY the JSON object, no additional text or markdown formatting.`

    // Call OpenAI API
    console.log('Calling OpenAI API...')
    let completion
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o', // or 'gpt-4-turbo' for lower cost
        messages: [
          {
            role: 'system',
            content: 'You are an expert food quality analyst. Analyze quality control data and provide actionable insights in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: "json_object" }
      })
    } catch (openaiError: any) {
      console.error('OpenAI API Error:', openaiError)
      throw new Error(`OpenAI API error: ${openaiError.message || openaiError}. Check your API key and billing status.`)
    }

    const aiResponse = completion.choices[0].message.content
    if (!aiResponse) {
      throw new Error('OpenAI returned empty response')
    }

    let analysis
    try {
      analysis = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', aiResponse)
      throw new Error('OpenAI returned invalid JSON. This may be a temporary issue, please try again.')
    }

    // Calculate cost (approximate)
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0
    const estimatedCost = (inputTokens * 0.01 / 1000) + (outputTokens * 0.03 / 1000) // GPT-4o pricing

    const generationTime = Date.now() - startTime

    console.log(`Analysis complete. Tokens: ${inputTokens + outputTokens}, Cost: $${estimatedCost.toFixed(4)}, Time: ${generationTime}ms`)

    // Store in cache
    const cacheResult = await sql`
      INSERT INTO quality_analytics_cache (
        analysis_date,
        period_type,
        period_start,
        period_end,
        summary,
        insights,
        common_issues,
        recommendations,
        top_performers,
        low_performers,
        trends,
        total_submissions,
        branches_analyzed,
        generated_by,
        generation_cost,
        generation_time_ms,
        status
      ) VALUES (
        CURRENT_DATE,
        ${periodType},
        ${startDate},
        ${endDate},
        ${analysis.summary},
        ${JSON.stringify(analysis.insights)}::jsonb,
        ${JSON.stringify(analysis.commonIssues || [])}::jsonb,
        ${JSON.stringify(analysis.recommendations || [])}::jsonb,
        ${JSON.stringify(analysis.topPerformers || [])}::jsonb,
        ${JSON.stringify(analysis.lowPerformers || [])}::jsonb,
        ${JSON.stringify(analysis.trends || {})}::jsonb,
        ${submissionCount},
        ${JSON.stringify(uniqueBranches)}::jsonb,
        'openai-gpt-4o',
        ${estimatedCost},
        ${generationTime},
        'completed'
      )
      ON CONFLICT (period_type, period_start, period_end)
      DO UPDATE SET
        analysis_date = CURRENT_DATE,
        summary = EXCLUDED.summary,
        insights = EXCLUDED.insights,
        common_issues = EXCLUDED.common_issues,
        recommendations = EXCLUDED.recommendations,
        top_performers = EXCLUDED.top_performers,
        low_performers = EXCLUDED.low_performers,
        trends = EXCLUDED.trends,
        total_submissions = EXCLUDED.total_submissions,
        branches_analyzed = EXCLUDED.branches_analyzed,
        generation_cost = EXCLUDED.generation_cost,
        generation_time_ms = EXCLUDED.generation_time_ms,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      cached: false,
      analysis: {
        ...analysis,
        metadata: {
          periodType,
          periodStart: startDate,
          periodEnd: endDate,
          totalSubmissions: submissionCount,
          branchesAnalyzed: uniqueBranches.length,
          generationCost: estimatedCost,
          generationTimeMs: generationTime,
        }
      }
    })

  } catch (error: any) {
    console.error('Error generating analysis:', error)
    
    // Store error in cache
    try {
      const body = await request.json()
      await sql`
        INSERT INTO quality_analytics_cache (
          analysis_date,
          period_type,
          period_start,
          period_end,
          summary,
          insights,
          status,
          error_message,
          total_submissions
        ) VALUES (
          CURRENT_DATE,
          ${body.periodType || 'weekly'},
          ${body.startDate},
          ${body.endDate},
          'Analysis failed',
          '[]'::jsonb,
          'failed',
          ${error.message},
          0
        )
        ON CONFLICT (period_type, period_start, period_end) DO NOTHING
      `
    } catch (e) {
      console.error('Failed to log error to cache:', e)
    }

    return NextResponse.json({ 
      error: 'Failed to generate analysis',
      details: error.message 
    }, { status: 500 })
  }
}

// GET - Retrieve cached analysis
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodType = searchParams.get('periodType') || 'weekly'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const latest = searchParams.get('latest') === 'true'

    let query: any
    
    if (latest) {
      // Get most recent analysis of this type
      query = await sql`
        SELECT *
        FROM quality_analytics_cache
        WHERE period_type = ${periodType}
          AND status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1
      `
    } else if (startDate && endDate) {
      // Get specific period analysis
      query = await sql`
        SELECT *
        FROM quality_analytics_cache
        WHERE period_type = ${periodType}
          AND period_start = ${startDate}
          AND period_end = ${endDate}
          AND status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1
      `
    } else {
      // Get recent analyses
      query = await sql`
        SELECT *
        FROM quality_analytics_cache
        WHERE status = 'completed'
        ORDER BY created_at DESC
        LIMIT 10
      `
    }

    return NextResponse.json(query.rows)

  } catch (error) {
    console.error('Error fetching cached analysis:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch analysis' 
    }, { status: 500 })
  }
}

