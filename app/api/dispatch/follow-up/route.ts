import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

interface FollowUpItemRequest {
  branchSlug: string
  branchName: string
  itemId: string
  itemName: string
  quantity: number
  unit: string
  originalIssue: string
}

interface FollowUpRequest {
  parentDispatchId: string
  deliveryDate: string
  items: FollowUpItemRequest[]
}

export async function POST(request: Request) {
  try {
    const body: FollowUpRequest = await request.json()
    const { parentDispatchId, deliveryDate, items } = body

    // Validate input
    if (!parentDispatchId || !deliveryDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the parent dispatch
    const parentResult = await sql`
      SELECT 
        id,
        branch_dispatches as "branchDispatches",
        follow_up_dispatch_ids as "followUpDispatchIds"
      FROM dispatches
      WHERE id = ${parentDispatchId} AND is_archived = false
    `

    if (parentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Parent dispatch not found' },
        { status: 404 }
      )
    }

    const parentDispatch = parentResult.rows[0]

    // Generate follow-up dispatch ID
    const followUpId = `followup-${parentDispatchId.replace('dispatch-', '')}-${Date.now()}`

    // Group items by branch
    const itemsByBranch: Record<string, FollowUpItemRequest[]> = {}
    items.forEach(item => {
      if (!itemsByBranch[item.branchSlug]) {
        itemsByBranch[item.branchSlug] = []
      }
      itemsByBranch[item.branchSlug].push(item)
    })

    // Create branch dispatches for follow-up
    const branchDispatches = Object.entries(itemsByBranch).map(([branchSlug, branchItems]) => ({
      branchSlug,
      branchName: branchItems[0].branchName,
      status: 'pending',
      items: branchItems.map((item, index) => ({
        id: `${branchSlug}-followup-${index}-${Date.now()}`,
        name: item.itemName,
        orderedQty: item.quantity,
        packedQty: null,
        receivedQty: null,
        unit: item.unit,
        packedChecked: false,
        receivedChecked: false,
        notes: '',
        issue: null,
        // Follow-up specific fields
        originalDispatchId: parentDispatchId,
        originalItemId: item.itemId,
        originalIssue: item.originalIssue
      })),
      // Packing checkpoint
      packedBy: null,
      packingStartedAt: null,
      packingCompletedAt: null,
      // Receiving checkpoint
      receivedBy: null,
      receivingStartedAt: null,
      receivedAt: null,
      completedAt: null,
      overallNotes: ''
    }))

    // Create the follow-up dispatch
    await sql`
      INSERT INTO dispatches (
        id,
        created_date,
        delivery_date,
        created_by,
        branch_dispatches,
        is_archived,
        type,
        parent_dispatch_id,
        follow_up_dispatch_ids
      ) VALUES (
        ${followUpId},
        ${new Date().toISOString()},
        ${deliveryDate},
        ${'System (Follow-Up)'},
        ${JSON.stringify(branchDispatches)}::jsonb,
        false,
        'follow_up',
        ${parentDispatchId},
        '[]'::jsonb
      )
    `

    // Update parent dispatch to add this follow-up ID and mark items as scheduled
    const parentBranchDispatches = parentDispatch.branchDispatches
    
    // Mark original items as 'scheduled' for resolution
    items.forEach(item => {
      const branchDispatch = parentBranchDispatches.find(
        (bd: any) => bd.branchSlug === item.branchSlug
      )
      if (branchDispatch) {
        const originalItem = branchDispatch.items.find(
          (i: any) => i.id === item.itemId
        )
        if (originalItem) {
          originalItem.resolutionStatus = 'scheduled'
          originalItem.resolvedByDispatchId = followUpId
        }
      }
    })

    // Update parent dispatch's followUpDispatchIds and branchDispatches
    const existingFollowUps = parentDispatch.followUpDispatchIds || []
    const updatedFollowUps = [...existingFollowUps, followUpId]

    await sql`
      UPDATE dispatches
      SET 
        follow_up_dispatch_ids = ${JSON.stringify(updatedFollowUps)}::jsonb,
        branch_dispatches = ${JSON.stringify(parentBranchDispatches)}::jsonb
      WHERE id = ${parentDispatchId}
    `

    return NextResponse.json({ 
      success: true, 
      id: followUpId,
      message: `Follow-up dispatch created with ${items.length} items for ${Object.keys(itemsByBranch).length} branches`
    })

  } catch (error) {
    console.error('Error creating follow-up dispatch:', error)
    return NextResponse.json(
      { error: 'Failed to create follow-up dispatch' },
      { status: 500 }
    )
  }
}
