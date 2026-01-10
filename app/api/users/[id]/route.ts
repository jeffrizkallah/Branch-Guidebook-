import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getUserById, updateUser, resetUserPassword, approveUser, rejectUser } from '@/lib/auth'
import { sql } from '@vercel/postgres'

// GET - Get single user
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['admin', 'dispatcher'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's branch access
    const branchResult = await sql`
      SELECT branch_slug FROM user_branch_access WHERE user_id = ${userId}
    `
    
    return NextResponse.json({ 
      user: {
        ...user,
        branches: branchResult.rows.map(row => row.branch_slug)
      }
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// PATCH - Update user (approve, reject, change role, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['admin', 'dispatcher'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const body = await request.json()
    const { action, role, status, branches, reason, newPassword } = body

    // Helper to delete signup notification for this user
    const deleteSignupNotification = async (targetUserId: number) => {
      try {
        await sql`
          DELETE FROM notifications 
          WHERE type = 'user_signup' 
            AND related_user_id = ${targetUserId}
        `
      } catch (error) {
        console.error('Failed to delete signup notification:', error)
        // Don't throw - this is not critical
      }
    }

    // Handle different actions
    switch (action) {
      case 'approve':
        if (!role) {
          return NextResponse.json({ error: 'Role is required for approval' }, { status: 400 })
        }
        const approveResult = await approveUser(userId, role, session.user.id, branches)
        if (!approveResult.success) {
          return NextResponse.json({ error: approveResult.error }, { status: 400 })
        }
        // Delete the signup notification since user is now approved
        await deleteSignupNotification(userId)
        return NextResponse.json({ success: true, message: 'User approved successfully' })

      case 'reject':
        const rejectResult = await rejectUser(userId, reason || 'Application rejected')
        if (!rejectResult.success) {
          return NextResponse.json({ error: rejectResult.error }, { status: 400 })
        }
        // Delete the signup notification since user is now rejected
        await deleteSignupNotification(userId)
        return NextResponse.json({ success: true, message: 'User rejected' })

      case 'reset_password':
        if (!newPassword) {
          return NextResponse.json({ error: 'New password is required' }, { status: 400 })
        }
        const resetResult = await resetUserPassword(userId, newPassword)
        if (!resetResult.success) {
          return NextResponse.json({ error: resetResult.error }, { status: 400 })
        }
        return NextResponse.json({ success: true, message: 'Password reset successfully' })

      case 'update':
        const updateResult = await updateUser(userId, { role, status, branches }, session.user.id)
        if (!updateResult.success) {
          return NextResponse.json({ error: updateResult.error }, { status: 400 })
        }
        return NextResponse.json({ success: true, message: 'User updated successfully' })

      default:
        // Default update without action
        const defaultResult = await updateUser(userId, { role, status, branches }, session.user.id)
        if (!defaultResult.success) {
          return NextResponse.json({ error: defaultResult.error }, { status: 400 })
        }
        return NextResponse.json({ success: true, message: 'User updated successfully' })
    }
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE - Deactivate user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['admin', 'dispatcher'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    // Don't allow deleting yourself
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
    }

    // Deactivate instead of delete
    await sql`
      UPDATE users 
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `

    return NextResponse.json({ success: true, message: 'User deactivated' })
  } catch (error) {
    console.error('Error deactivating user:', error)
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 })
  }
}

