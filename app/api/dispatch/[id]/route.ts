import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const updates = await request.json()
    const { id: dispatchId } = await params
    
    // Get the current dispatch including type and parent info
    const dispatch = await sql`
      SELECT 
        branch_dispatches as "branchDispatches",
        type,
        parent_dispatch_id as "parentDispatchId"
      FROM dispatches
      WHERE id = ${dispatchId} AND is_archived = false
    `
    
    if (dispatch.rows.length === 0) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    }
    
    const dispatchData = dispatch.rows[0]
    
    // Update branch dispatch in the JSONB array
    const branchDispatches = dispatchData.branchDispatches
    const branchIndex = branchDispatches.findIndex(
      (bd: any) => bd.branchSlug === updates.branchSlug
    )
    
    if (branchIndex === -1) {
      return NextResponse.json({ error: 'Branch dispatch not found' }, { status: 404 })
    }
    
    // Merge updates
    branchDispatches[branchIndex] = {
      ...branchDispatches[branchIndex],
      ...updates
    }
    
    // Update the database
    await sql`
      UPDATE dispatches
      SET branch_dispatches = ${JSON.stringify(branchDispatches)}::jsonb
      WHERE id = ${dispatchId}
    `
    
    // If this is a follow-up dispatch and a branch is being completed,
    // mark the original items in the parent dispatch as "resolved"
    if (dispatchData.type === 'follow_up' && 
        dispatchData.parentDispatchId && 
        updates.status === 'completed') {
      
      try {
        // Get parent dispatch
        const parentResult = await sql`
          SELECT branch_dispatches as "branchDispatches"
          FROM dispatches
          WHERE id = ${dispatchData.parentDispatchId} AND is_archived = false
        `
        
        if (parentResult.rows.length > 0) {
          const parentBranchDispatches = parentResult.rows[0].branchDispatches
          const completedBranchItems = branchDispatches[branchIndex].items
          
          // Mark each original item as resolved
          completedBranchItems.forEach((followUpItem: any) => {
            if (followUpItem.originalItemId) {
              // Find the original branch dispatch
              const parentBranchDispatch = parentBranchDispatches.find(
                (bd: any) => bd.branchSlug === updates.branchSlug
              )
              
              if (parentBranchDispatch) {
                const originalItem = parentBranchDispatch.items.find(
                  (item: any) => item.id === followUpItem.originalItemId
                )
                
                if (originalItem) {
                  originalItem.resolutionStatus = 'resolved'
                  originalItem.resolvedAt = new Date().toISOString()
                }
              }
            }
          })
          
          // Update parent dispatch
          await sql`
            UPDATE dispatches
            SET branch_dispatches = ${JSON.stringify(parentBranchDispatches)}::jsonb
            WHERE id = ${dispatchData.parentDispatchId}
          `
        }
      } catch (parentError) {
        console.error('Error updating parent dispatch resolution status:', parentError)
        // Don't fail the main operation if parent update fails
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating dispatch:', error)
    return NextResponse.json({ error: 'Failed to update dispatch' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dispatchId } = await params
    
    // Mark dispatch as archived instead of physically deleting
    const result = await sql`
      UPDATE dispatches
      SET 
        is_archived = true,
        deleted_at = NOW(),
        deleted_by = 'Admin'
      WHERE id = ${dispatchId} AND is_archived = false
      RETURNING id
    `
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Dispatch archived successfully',
      archivedId: dispatchId
    })
  } catch (error) {
    console.error('Error deleting dispatch:', error)
    return NextResponse.json({ error: 'Failed to delete dispatch' }, { status: 500 })
  }
}

