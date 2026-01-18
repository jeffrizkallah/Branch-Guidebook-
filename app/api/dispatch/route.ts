import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function POST(request: Request) {
  try {
    const dispatch = await request.json()
    
    // Insert new dispatch into database with new follow-up fields
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
        ${dispatch.id},
        ${dispatch.createdDate},
        ${dispatch.deliveryDate},
        ${dispatch.createdBy},
        ${JSON.stringify(dispatch.branchDispatches)}::jsonb,
        false,
        ${dispatch.type || 'primary'},
        ${dispatch.parentDispatchId || null},
        ${JSON.stringify(dispatch.followUpDispatchIds || [])}::jsonb
      )
    `
    
    return NextResponse.json({ success: true, id: dispatch.id })
  } catch (error) {
    console.error('Error saving dispatch:', error)
    return NextResponse.json({ error: 'Failed to save dispatch' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get all non-archived dispatches with new follow-up fields
    const result = await sql`
      SELECT 
        id,
        created_date as "createdDate",
        delivery_date as "deliveryDate",
        created_by as "createdBy",
        branch_dispatches as "branchDispatches",
        COALESCE(type, 'primary') as "type",
        parent_dispatch_id as "parentDispatchId",
        COALESCE(follow_up_dispatch_ids, '[]'::jsonb) as "followUpDispatchIds"
      FROM dispatches
      WHERE is_archived = false
      ORDER BY delivery_date DESC
    `
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching dispatches:', error)
    return NextResponse.json([], { status: 200 })
  }
}

