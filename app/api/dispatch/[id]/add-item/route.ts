import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

interface AddItemRequest {
  itemName: string
  unit: string
  reason?: string
  branches: {
    branchSlug: string
    quantity: number
  }[]
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
        { error: 'You do not have permission to add items to dispatches' }, 
        { status: 403 }
      )
    }

    const { id: dispatchId } = await params
    const body: AddItemRequest = await request.json()

    // Validate request body
    if (!body.itemName?.trim()) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
    }

    if (!body.unit?.trim()) {
      return NextResponse.json({ error: 'Unit is required' }, { status: 400 })
    }

    if (!body.branches || body.branches.length === 0) {
      return NextResponse.json({ error: 'At least one branch must be selected' }, { status: 400 })
    }

    // Validate all quantities are positive
    const invalidBranches = body.branches.filter(b => b.quantity <= 0)
    if (invalidBranches.length > 0) {
      return NextResponse.json(
        { error: 'All quantities must be greater than 0' }, 
        { status: 400 }
      )
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

    // Track which branches were updated
    const updatedBranches: string[] = []
    const skippedBranches: string[] = []

    // Add item to each selected branch
    for (const branchItem of body.branches) {
      const branchIndex = branchDispatches.findIndex(
        (bd: any) => bd.branchSlug === branchItem.branchSlug
      )

      if (branchIndex === -1) {
        skippedBranches.push(branchItem.branchSlug)
        continue
      }

      const branchDispatch = branchDispatches[branchIndex]

      // Only allow adding to pending or packing status
      if (!['pending', 'packing'].includes(branchDispatch.status)) {
        skippedBranches.push(branchDispatch.branchName)
        continue
      }

      // Create new item with late addition flags
      const newItem = {
        id: `${branchItem.branchSlug}-late-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: body.itemName.trim(),
        orderedQty: branchItem.quantity,
        packedQty: null,
        receivedQty: null,
        unit: body.unit,
        packedChecked: false,
        receivedChecked: false,
        notes: '',
        issue: null,
        // Late addition fields
        addedLate: true,
        addedAt: new Date().toISOString(),
        addedBy: session.user.firstName && session.user.lastName 
          ? `${session.user.firstName} ${session.user.lastName}` 
          : session.user.email || 'Unknown',
        addedReason: body.reason?.trim() || null
      }

      // Add item to the branch's items array
      branchDispatches[branchIndex].items.push(newItem)
      updatedBranches.push(branchDispatch.branchName)
    }

    if (updatedBranches.length === 0) {
      return NextResponse.json(
        { 
          error: 'Could not add item to any branches. They may already be dispatched or completed.',
          skippedBranches 
        }, 
        { status: 400 }
      )
    }

    // Update the database
    await sql`
      UPDATE dispatches
      SET branch_dispatches = ${JSON.stringify(branchDispatches)}::jsonb
      WHERE id = ${dispatchId}
    `

    return NextResponse.json({ 
      success: true,
      message: `Item added to ${updatedBranches.length} branch(es)`,
      updatedBranches,
      skippedBranches
    })

  } catch (error) {
    console.error('Error adding item to dispatch:', error)
    return NextResponse.json(
      { error: 'Failed to add item to dispatch' }, 
      { status: 500 }
    )
  }
}
