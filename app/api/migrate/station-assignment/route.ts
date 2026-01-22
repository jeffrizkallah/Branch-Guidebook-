import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST() {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Add station_assignment column if it doesn't exist
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS station_assignment VARCHAR(50)
    `

    return NextResponse.json({
      success: true,
      message: 'Migration completed: station_assignment column added to users table'
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check if column exists
    const result = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'station_assignment'
    `

    return NextResponse.json({
      columnExists: result.rows.length > 0
    })
  } catch (error) {
    console.error('Error checking migration status:', error)
    return NextResponse.json({ error: 'Failed to check migration status' }, { status: 500 })
  }
}
