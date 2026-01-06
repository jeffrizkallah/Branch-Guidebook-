import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { toggleReaction } from '@/lib/chat'

// POST toggle a reaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const body = await request.json()
    const { messageId, emoji } = body

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'Message ID and emoji required' }, { status: 400 })
    }

    const result = await toggleReaction(messageId, userId, emoji)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error toggling reaction:', error)
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 })
  }
}

