import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { 
  getChannelMessages, 
  getReactionsForMessages, 
  sendMessage, 
  updateLastRead,
  getPinnedMessages,
  getOnlineUsers
} from '@/lib/chat'

// GET messages for a channel
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const { searchParams } = new URL(request.url)
    const channelId = parseInt(searchParams.get('channelId') || '0')
    const beforeId = searchParams.get('beforeId') ? parseInt(searchParams.get('beforeId')!) : undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
    }

    // Get messages and update last read
    const [messages, pinnedMessages, onlineUsers] = await Promise.all([
      getChannelMessages(channelId, limit, beforeId),
      beforeId ? Promise.resolve([]) : getPinnedMessages(channelId),
      beforeId ? Promise.resolve([]) : getOnlineUsers()
    ])

    // Update last read time
    await updateLastRead(channelId, userId)

    // Get reactions for all messages
    const messageIds = messages.map(m => m.id)
    const reactionsMap = await getReactionsForMessages(messageIds, userId)

    // Attach reactions to messages
    const messagesWithReactions = messages.map(msg => ({
      ...msg,
      reactions: reactionsMap.get(msg.id) || []
    }))

    return NextResponse.json({ 
      messages: messagesWithReactions,
      pinnedMessages,
      onlineUsers
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST a new message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const body = await request.json()
    const { channelId, content, imageUrl, isUrgent } = body

    if (!channelId || !content?.trim()) {
      return NextResponse.json({ error: 'Channel ID and content required' }, { status: 400 })
    }

    const message = await sendMessage(
      channelId,
      userId,
      content.trim(),
      imageUrl,
      isUrgent || false
    )

    if (!message) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

