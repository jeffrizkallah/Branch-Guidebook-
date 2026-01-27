import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

interface RemoveItemRequest {
  branchSlug: string
  itemId: string
  reason?: string
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

    // Check if user has permission (admin, operations_lead, dispatcher)
    const userRole = session.user.role
    if (!['admin', 'operations_lead', 'dispatcher'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'You do not have permission to remove items from dispatches' },
        { status: 403 }
      )
    }

    const { id: dispatchId } = await params
    const body: RemoveItemRequest = await request.json()

    // Validate request body
    if (!body.branchSlug?.trim()) {
      return NextResponse.json({ error: 'Branch slug is required' }, { status: 400 })
    }

    if (!body.itemId?.trim()) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
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

    // Only allow removing from pending or packing status
    if (!['pending', 'packing'].includes(branchDispatch.status)) {
      return NextResponse.json(
        { error: 'Cannot remove items from a dispatch that is already dispatched or completed' },
        { status: 400 }
      )
    }

    // Find the item
    const itemIndex = branchDispatch.items.findIndex(
      (item: any) => item.id === body.itemId
    )

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const removedItem = branchDispatch.items[itemIndex]

    // Remove the item from the array
    branchDispatches[branchIndex].items.splice(itemIndex, 1)

    // Update the database
    await sql`
      UPDATE dispatches
      SET branch_dispatches = ${JSON.stringify(branchDispatches)}::jsonb
      WHERE id = ${dispatchId}
    `

    // Log who removed the item (could be expanded to a proper audit log)
    const removedBy = session.user.firstName && session.user.lastName
      ? `${session.user.firstName} ${session.user.lastName}`
      : session.user.email || 'Unknown'

    console.log(`Item "${removedItem.name}" removed from ${branchDispatch.branchName} by ${removedBy}. Reason: ${body.reason || 'Not specified'}`)

    return NextResponse.json({
      success: true,
      message: `Item "${removedItem.name}" removed from ${branchDispatch.branchName}`,
      removedItem: {
        id: removedItem.id,
        name: removedItem.name,
        branchName: branchDispatch.branchName
      }
    })

  } catch (error) {
    console.error('Error removing item from dispatch:', error)
    return NextResponse.json(
      { error: 'Failed to remove item from dispatch' },
      { status: 500 }
    )
  }
}
