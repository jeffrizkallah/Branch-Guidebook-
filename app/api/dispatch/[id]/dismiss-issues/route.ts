import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

interface DismissIssuesRequest {
  branchSlug: string
  itemIds: string[]
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission (admin, operations_lead, dispatcher, branch_manager)
    const userRole = session.user.role
    if (!['admin', 'operations_lead', 'dispatcher', 'branch_manager'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'You do not have permission to dismiss issues' },
        { status: 403 }
      )
    }

    const { id: dispatchId } = await params
    const body: DismissIssuesRequest = await request.json()

    // Validate request body
    if (!body.branchSlug?.trim()) {
      return NextResponse.json({ error: 'Branch slug is required' }, { status: 400 })
    }

    if (!body.itemIds || !Array.isArray(body.itemIds) || body.itemIds.length === 0) {
      return NextResponse.json({ error: 'At least one item ID is required' }, { status: 400 })
    }

    // Get the current dispatch
    const dispatch = await sql`
      SELECT id, branch_dispatches as "branchDispatches"
      FROM dispatches
      WHERE id = ${dispatchId} AND is_archived = false
    `

    if (dispatch.rows.length === 0) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    }

    const branchDispatches = dispatch.rows[0].branchDispatches

    // Find the branch
    const branchIndex = branchDispatches.findIndex(
      (bd: any) => bd.branchSlug === body.branchSlug
    )

    if (branchIndex === -1) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    const branchDispatch = branchDispatches[branchIndex]
    const dismissedItems: string[] = []

    // Update each item to clear the issue
    for (const itemId of body.itemIds) {
      const itemIndex = branchDispatch.items.findIndex(
        (item: any) => item.id === itemId
      )

      if (itemIndex !== -1) {
        const item = branchDispatch.items[itemIndex]
        if (item.issue !== null) {
          // Clear the issue
          branchDispatches[branchIndex].items[itemIndex].issue = null
          // Also clear expectedVariance since it's no longer relevant
          branchDispatches[branchIndex].items[itemIndex].expectedVariance = false
          dismissedItems.push(item.name)
        }
      }
    }

    if (dismissedItems.length === 0) {
      return NextResponse.json(
        { error: 'No items with issues found to dismiss' },
        { status: 400 }
      )
    }

    // Update the database
    await sql`
      UPDATE dispatches
      SET branch_dispatches = ${JSON.stringify(branchDispatches)}::jsonb
      WHERE id = ${dispatchId}
    `

    // Log who dismissed the issues
    const dismissedBy = session.user.firstName && session.user.lastName
      ? `${session.user.firstName} ${session.user.lastName}`
      : session.user.email || 'Unknown'

    console.log(`Issues dismissed for ${dismissedItems.length} items in ${branchDispatch.branchName} by ${dismissedBy}: ${dismissedItems.join(', ')}`)

    return NextResponse.json({
      success: true,
      message: `Dismissed issues for ${dismissedItems.length} item(s)`,
      dismissedItems,
      branchName: branchDispatch.branchName
    })

  } catch (error) {
    console.error('Error dismissing issues:', error)
    return NextResponse.json(
      { error: 'Failed to dismiss issues' },
      { status: 500 }
    )
  }
}
