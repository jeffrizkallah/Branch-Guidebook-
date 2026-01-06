import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getChannelsForUser, getQuickReplies, getTotalUnreadCount } from '@/lib/chat'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    
    const [channels, quickReplies, totalUnread] = await Promise.all([
      getChannelsForUser(userId),
      getQuickReplies(),
      getTotalUnreadCount(userId)
    ])

    return NextResponse.json({ 
      channels, 
      quickReplies,
      totalUnread 
    })
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}

