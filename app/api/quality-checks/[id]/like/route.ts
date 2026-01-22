import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'
import { canGiveLikes, validateLikeTags, validateLikeNote, CreateLikeRequest } from '@/lib/quality-likes'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST - Add a like to a quality check
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const userId = session.user.id

    // Only managers can give likes
    if (!canGiveLikes(userRole)) {
      return NextResponse.json(
        { error: 'Only managers can give likes' },
        { status: 403 }
      )
    }

    const { id } = await params
    const qualityCheckId = parseInt(id)

    if (isNaN(qualityCheckId)) {
      return NextResponse.json({ error: 'Invalid quality check ID' }, { status: 400 })
    }

    const body = await request.json() as CreateLikeRequest
    const { note, tags = [] } = body

    // Validate note length
    if (!validateLikeNote(note)) {
      return NextResponse.json(
        { error: 'Note must be 200 characters or less' },
        { status: 400 }
      )
    }

    // Validate tags
    if (tags.length > 0 && !validateLikeTags(tags)) {
      return NextResponse.json(
        { error: 'Invalid tags provided' },
        { status: 400 }
      )
    }

    // Verify the quality check exists and get submitter info
    const qcResult = await sql`
      SELECT 
        qc.id,
        qc.submitted_by,
        qc.product_name,
        qc.branch_slug,
        qc.meal_service,
        u.first_name || ' ' || u.last_name as submitter_name
      FROM quality_checks qc
      JOIN users u ON qc.submitted_by = u.id
      WHERE qc.id = ${qualityCheckId}
    `

    if (qcResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quality check not found' }, { status: 404 })
    }

    const qualityCheck = qcResult.rows[0]

    // Prevent users from liking their own submissions
    if (qualityCheck.submitted_by === userId) {
      return NextResponse.json(
        { error: 'You cannot like your own submission' },
        { status: 400 }
      )
    }

    // Insert the like (will fail if duplicate due to unique constraint)
    try {
      const likeResult = await sql`
        INSERT INTO quality_likes (
          quality_check_id,
          given_by,
          note,
          tags
        ) VALUES (
          ${qualityCheckId},
          ${userId},
          ${note || null},
          ${JSON.stringify(tags)}
        )
        RETURNING 
          id,
          quality_check_id as "qualityCheckId",
          given_by as "givenBy",
          note,
          tags,
          created_at as "createdAt"
      `

      // Create a notification for the submitter
      const likerName = `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || 'A manager'
      const notificationTitle = `🎉 Your submission was liked!`
      const notificationPreview = `${likerName} liked your ${qualityCheck.product_name} quality check`
      
      let notificationContent = `## Quality Check Liked! 👍\n\n**Product:** ${qualityCheck.product_name} (${qualityCheck.meal_service}, ${qualityCheck.branch_slug})\n\n**Liked by:** ${likerName} (${session.user.role})\n\n`
      
      if (tags.length > 0) {
        notificationContent += `**Tags:**\n`
        tags.forEach((tag: string) => {
          notificationContent += `✨ ${tag}\n`
        })
        notificationContent += `\n`
      }
      
      if (note) {
        notificationContent += `**Note:**\n"${note}"\n\n`
      }
      
      notificationContent += `---\n*View the full quality check to see all likes and feedback.*`

      try {
        await sql`
          INSERT INTO notifications (
            type,
            priority,
            title,
            preview,
            content,
            created_by,
            expires_at,
            related_user_id,
            metadata
          ) VALUES (
            'alert',
            'normal',
            ${notificationTitle},
            ${notificationPreview},
            ${notificationContent},
            ${likerName},
            NOW() + INTERVAL '14 days',
            ${qualityCheck.submitted_by},
            ${JSON.stringify({
              qualityCheckId: qualityCheckId,
              likeId: likeResult.rows[0].id,
              productName: qualityCheck.product_name,
              branchSlug: qualityCheck.branch_slug,
              type: 'quality_like'
            })}
          )
        `
      } catch (notifError) {
        // Log but don't fail if notification creation fails
        console.error('Failed to create like notification:', notifError)
      }

      return NextResponse.json(
        { 
          success: true, 
          like: likeResult.rows[0],
          message: 'Like added successfully'
        },
        { status: 201 }
      )

    } catch (insertError: any) {
      // Check if it's a duplicate key error
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already liked this submission' },
          { status: 400 }
        )
      }
      throw insertError
    }

  } catch (error) {
    console.error('Error creating quality like:', error)
    return NextResponse.json(
      { error: 'Failed to create like' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a like from a quality check
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = await params
    const qualityCheckId = parseInt(id)

    if (isNaN(qualityCheckId)) {
      return NextResponse.json({ error: 'Invalid quality check ID' }, { status: 400 })
    }

    // Delete the like (only if it belongs to the current user)
    const deleteResult = await sql`
      DELETE FROM quality_likes
      WHERE quality_check_id = ${qualityCheckId}
      AND given_by = ${userId}
      RETURNING id
    `

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Like not found or you do not have permission to remove it' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Like removed successfully'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error removing quality like:', error)
    return NextResponse.json(
      { error: 'Failed to remove like' },
      { status: 500 }
    )
  }
}
