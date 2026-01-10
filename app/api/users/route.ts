import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getAllUsers, getPendingUsers, createUser, hashPassword } from '@/lib/auth'
import { sql } from '@vercel/postgres'

// GET - List all users or pending users
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['admin', 'dispatcher'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pending = searchParams.get('pending') === 'true'

    if (pending) {
      const users = await getPendingUsers()
      return NextResponse.json({ users })
    }

    const users = await getAllUsers()
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST - Create a new user (admin creating user directly)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['admin', 'dispatcher'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, firstName, lastName, nationality, phone, role, branches } = body

    // Validation
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user with active status (admin creating directly)
    const result = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, nationality, phone, role, status, approved_by, approved_at)
      VALUES (
        ${email.toLowerCase()}, 
        ${passwordHash}, 
        ${firstName}, 
        ${lastName}, 
        ${nationality || null}, 
        ${phone || null},
        ${role},
        'active',
        ${session.user.id},
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `

    const userId = result.rows[0].id

    // If branch_manager or branch_staff, assign branches
    if ((role === 'branch_manager' || role === 'branch_staff') && branches && branches.length > 0) {
      // For branch_staff, only take the first branch
      const branchesToAssign = role === 'branch_staff' ? [branches[0]] : branches
      
      for (const branchSlug of branchesToAssign) {
        await sql`
          INSERT INTO user_branch_access (user_id, branch_slug, assigned_by)
          VALUES (${userId}, ${branchSlug}, ${session.user.id})
          ON CONFLICT (user_id, branch_slug) DO NOTHING
        `
      }
    }

    return NextResponse.json({ success: true, userId })
  } catch (error: any) {
    console.error('Error creating user:', error)
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

