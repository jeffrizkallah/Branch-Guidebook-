import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { togglePinMessage } from '@/lib/chat'

// POST toggle pin on a message (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can pin messages
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { messageId } = body

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    const isPinned = await togglePinMessage(messageId)

    return NextResponse.json({ isPinned })
  } catch (error) {
    console.error('Error toggling pin:', error)
    return NextResponse.json({ error: 'Failed to toggle pin' }, { status: 500 })
  }
}

