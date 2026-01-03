import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET() {
  try {
    const result = await sql`
      SELECT instruction_data as data
      FROM recipe_instructions
      ORDER BY (instruction_data->>'dishName')
    `
    
    const instructions = result.rows.map(row => row.data)
    return NextResponse.json(instructions)
  } catch (error) {
    console.error('Error fetching recipe instructions:', error)
    // Return empty array on error (table might not exist yet)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Support both direct instruction and wrapped with options
    const newInstruction = body.instruction || body
    const options = {
      updateIfExists: body.updateIfExists || false,
      skipIfExists: body.skipIfExists || false
    }

    // Basic validation
    if (!newInstruction.instructionId || !newInstruction.dishName) {
      return NextResponse.json(
        { error: 'Missing required fields: instructionId, dishName' },
        { status: 400 }
      )
    }

    // Check if instruction already exists
    const existing = await sql`
      SELECT instruction_id FROM recipe_instructions 
      WHERE instruction_id = ${newInstruction.instructionId}
    `

    if (existing.rows.length > 0) {
      if (options.updateIfExists) {
        // Update existing instruction
        await sql`
          UPDATE recipe_instructions 
          SET instruction_data = ${JSON.stringify(newInstruction)}::jsonb,
              updated_at = CURRENT_TIMESTAMP
          WHERE instruction_id = ${newInstruction.instructionId}
        `
        return NextResponse.json({ ...newInstruction, updated: true }, { status: 200 })
      } else if (options.skipIfExists) {
        // Skip silently
        return NextResponse.json({ ...newInstruction, skipped: true }, { status: 200 })
      } else {
        return NextResponse.json(
          { error: 'Instruction with this ID already exists' },
          { status: 400 }
        )
      }
    }

    // Insert new instruction
    await sql`
      INSERT INTO recipe_instructions (instruction_id, instruction_data)
      VALUES (${newInstruction.instructionId}, ${JSON.stringify(newInstruction)}::jsonb)
    `
    
    return NextResponse.json({ ...newInstruction, created: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating recipe instruction:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe instruction' },
      { status: 500 }
    )
  }
}
