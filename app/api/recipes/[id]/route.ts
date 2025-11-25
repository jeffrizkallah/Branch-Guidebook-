import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { Recipe } from '@/lib/data'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updates: Recipe = await request.json()
    
    // Update recipe in database
    const result = await sql`
      UPDATE recipes
      SET recipe_data = ${JSON.stringify(updates)}::jsonb
      WHERE recipe_id = ${id}
      RETURNING recipe_data as data
    `
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0].data)
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Delete recipe from database
    const result = await sql`
      DELETE FROM recipes
      WHERE recipe_id = ${id}
      RETURNING recipe_id
    `
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
