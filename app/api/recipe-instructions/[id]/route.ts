import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sql`
      SELECT instruction_data as data
      FROM recipe_instructions
      WHERE instruction_id = ${params.id}
    `
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0].data)
  } catch (error) {
    console.error('Error reading recipe instruction:', error)
    return NextResponse.json({ error: 'Failed to read recipe instruction' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const updatedData = await request.json()
    
    // First check if it exists
    const existing = await sql`
      SELECT instruction_data as data
      FROM recipe_instructions
      WHERE instruction_id = ${params.id}
    `
    
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 })
    }
    
    // Merge existing data with updates
    const existingData = existing.rows[0].data
    const mergedData = { ...existingData, ...updatedData }
    
    // Update in database
    await sql`
      UPDATE recipe_instructions 
      SET instruction_data = ${JSON.stringify(mergedData)}::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE instruction_id = ${params.id}
    `
    
    return NextResponse.json(mergedData)
  } catch (error) {
    console.error('Error updating recipe instruction:', error)
    return NextResponse.json({ error: 'Failed to update recipe instruction' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // First get the instruction to return it
    const existing = await sql`
      SELECT instruction_data as data
      FROM recipe_instructions
      WHERE instruction_id = ${params.id}
    `
    
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 })
    }
    
    // Delete from database
    await sql`
      DELETE FROM recipe_instructions
      WHERE instruction_id = ${params.id}
    `
    
    return NextResponse.json(existing.rows[0].data)
  } catch (error) {
    console.error('Error deleting recipe instruction:', error)
    return NextResponse.json({ error: 'Failed to delete recipe instruction' }, { status: 500 })
  }
}
