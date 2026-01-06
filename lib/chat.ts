// Chat types and utilities
import { sql } from '@vercel/postgres'

export interface ChatChannel {
  id: number
  name: string
  slug: string
  description: string | null
  is_read_only: boolean
  icon: string
  created_at: string
  created_by: number | null
  unread_count?: number
}

export interface ChatMessage {
  id: number
  channel_id: number
  user_id: number
  content: string
  image_url: string | null
  is_urgent: boolean
  is_pinned: boolean
  created_at: string
  updated_at: string
  // Joined fields
  user_first_name?: string
  user_last_name?: string
  user_role?: string
  reactions?: ChatReaction[]
}

export interface ChatReaction {
  emoji: string
  count: number
  users: { id: number; name: string }[]
  hasReacted: boolean
}

export interface ChatMember {
  id: number
  channel_id: number
  user_id: number
  joined_at: string
  last_read_at: string
  is_muted: boolean
}

export interface QuickReply {
  id: number
  text: string
  emoji: string | null
  sort_order: number
}

// Predefined emoji reactions for chat
export const CHAT_REACTIONS = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '✅', label: 'Done' },
  { emoji: '👀', label: 'Looking into it' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👨‍🍳', label: "Chef's kiss" },
  { emoji: '❤️', label: 'Love' },
]

// Format relative time for chat messages
export function formatChatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  // Show date for older messages
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' })
  })
}

// Get full timestamp for hover tooltip
export function formatFullTimestamp(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Get channels for a user
export async function getChannelsForUser(userId: number): Promise<ChatChannel[]> {
  try {
    const result = await sql`
      SELECT 
        c.*,
        COALESCE(
          (SELECT COUNT(*) 
           FROM chat_messages m 
           WHERE m.channel_id = c.id 
           AND m.created_at > COALESCE(
             (SELECT last_read_at FROM chat_members WHERE channel_id = c.id AND user_id = ${userId}),
             '1970-01-01'
           )
          ), 0
        )::int as unread_count
      FROM chat_channels c
      LEFT JOIN chat_members cm ON c.id = cm.channel_id AND cm.user_id = ${userId}
      ORDER BY c.name ASC
    `
    return result.rows as ChatChannel[]
  } catch (error) {
    console.error('Error getting channels:', error)
    return []
  }
}

// Get messages for a channel
export async function getChannelMessages(
  channelId: number, 
  limit: number = 50,
  beforeId?: number
): Promise<ChatMessage[]> {
  try {
    let result
    if (beforeId) {
      result = await sql`
        SELECT 
          m.*,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          u.role as user_role
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ${channelId}
        AND m.id < ${beforeId}
        ORDER BY m.created_at DESC
        LIMIT ${limit}
      `
    } else {
      result = await sql`
        SELECT 
          m.*,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          u.role as user_role
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ${channelId}
        ORDER BY m.created_at DESC
        LIMIT ${limit}
      `
    }
    // Return in chronological order (oldest first)
    return (result.rows as ChatMessage[]).reverse()
  } catch (error) {
    console.error('Error getting messages:', error)
    return []
  }
}

// Get reactions for messages
export async function getReactionsForMessages(
  messageIds: number[], 
  userId: number
): Promise<Map<number, ChatReaction[]>> {
  if (messageIds.length === 0) return new Map()
  
  try {
    const result = await sql`
      SELECT 
        r.message_id,
        r.emoji,
        r.user_id,
        u.first_name,
        u.last_name
      FROM chat_reactions r
      JOIN users u ON r.user_id = u.id
      WHERE r.message_id = ANY(${messageIds}::int[])
      ORDER BY r.created_at ASC
    `

    const reactionsMap = new Map<number, ChatReaction[]>()
    const tempMap = new Map<string, { emoji: string; users: { id: number; name: string }[] }>()

    for (const row of result.rows) {
      const key = `${row.message_id}-${row.emoji}`
      if (!tempMap.has(key)) {
        tempMap.set(key, { emoji: row.emoji, users: [] })
      }
      tempMap.get(key)!.users.push({ 
        id: row.user_id, 
        name: `${row.first_name} ${row.last_name}` 
      })
    }

    for (const [key, value] of tempMap) {
      const messageId = parseInt(key.split('-')[0])
      if (!reactionsMap.has(messageId)) {
        reactionsMap.set(messageId, [])
      }
      reactionsMap.get(messageId)!.push({
        emoji: value.emoji,
        count: value.users.length,
        users: value.users,
        hasReacted: value.users.some(u => u.id === userId)
      })
    }

    return reactionsMap
  } catch (error) {
    console.error('Error getting reactions:', error)
    return new Map()
  }
}

// Send a message
export async function sendMessage(
  channelId: number,
  userId: number,
  content: string,
  imageUrl?: string,
  isUrgent: boolean = false
): Promise<ChatMessage | null> {
  try {
    const result = await sql`
      INSERT INTO chat_messages (channel_id, user_id, content, image_url, is_urgent)
      VALUES (${channelId}, ${userId}, ${content}, ${imageUrl || null}, ${isUrgent})
      RETURNING *
    `
    
    // Get user info
    const userResult = await sql`
      SELECT first_name, last_name, role FROM users WHERE id = ${userId}
    `
    
    const message = result.rows[0] as ChatMessage
    if (userResult.rows[0]) {
      message.user_first_name = userResult.rows[0].first_name
      message.user_last_name = userResult.rows[0].last_name
      message.user_role = userResult.rows[0].role
    }
    
    return message
  } catch (error) {
    console.error('Error sending message:', error)
    return null
  }
}

// Toggle reaction on a message
export async function toggleReaction(
  messageId: number,
  userId: number,
  emoji: string
): Promise<{ added: boolean }> {
  try {
    // Check if reaction exists
    const existing = await sql`
      SELECT id FROM chat_reactions 
      WHERE message_id = ${messageId} AND user_id = ${userId} AND emoji = ${emoji}
    `
    
    if (existing.rows.length > 0) {
      // Remove reaction
      await sql`
        DELETE FROM chat_reactions 
        WHERE message_id = ${messageId} AND user_id = ${userId} AND emoji = ${emoji}
      `
      return { added: false }
    } else {
      // Add reaction
      await sql`
        INSERT INTO chat_reactions (message_id, user_id, emoji)
        VALUES (${messageId}, ${userId}, ${emoji})
      `
      return { added: true }
    }
  } catch (error) {
    console.error('Error toggling reaction:', error)
    return { added: false }
  }
}

// Update last read time for user in channel
export async function updateLastRead(channelId: number, userId: number): Promise<void> {
  try {
    await sql`
      INSERT INTO chat_members (channel_id, user_id, last_read_at)
      VALUES (${channelId}, ${userId}, CURRENT_TIMESTAMP)
      ON CONFLICT (channel_id, user_id) 
      DO UPDATE SET last_read_at = CURRENT_TIMESTAMP
    `
  } catch (error) {
    console.error('Error updating last read:', error)
  }
}

// Get total unread count for user
export async function getTotalUnreadCount(userId: number): Promise<number> {
  try {
    const result = await sql`
      SELECT COALESCE(SUM(
        (SELECT COUNT(*) 
         FROM chat_messages m 
         WHERE m.channel_id = c.id 
         AND m.created_at > COALESCE(
           (SELECT last_read_at FROM chat_members WHERE channel_id = c.id AND user_id = ${userId}),
           '1970-01-01'
         )
         AND m.user_id != ${userId}
        )
      ), 0)::int as total_unread
      FROM chat_channels c
    `
    return result.rows[0]?.total_unread || 0
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

// Get quick replies
export async function getQuickReplies(): Promise<QuickReply[]> {
  try {
    const result = await sql`
      SELECT * FROM chat_quick_replies 
      WHERE is_active = true 
      ORDER BY sort_order ASC
    `
    return result.rows as QuickReply[]
  } catch (error) {
    console.error('Error getting quick replies:', error)
    return []
  }
}

// Pin/unpin a message (admin only)
export async function togglePinMessage(messageId: number): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE chat_messages 
      SET is_pinned = NOT is_pinned, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${messageId}
      RETURNING is_pinned
    `
    return result.rows[0]?.is_pinned || false
  } catch (error) {
    console.error('Error toggling pin:', error)
    return false
  }
}

// Get pinned messages for a channel
export async function getPinnedMessages(channelId: number): Promise<ChatMessage[]> {
  try {
    const result = await sql`
      SELECT 
        m.*,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.role as user_role
      FROM chat_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = ${channelId} AND m.is_pinned = true
      ORDER BY m.created_at DESC
    `
    return result.rows as ChatMessage[]
  } catch (error) {
    console.error('Error getting pinned messages:', error)
    return []
  }
}

// Get online users (users who have been active in the last 5 minutes)
// For now, we'll track this via last_read_at in chat_members
export async function getOnlineUsers(): Promise<{ id: number; name: string; role: string }[]> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const result = await sql`
      SELECT DISTINCT ON (u.id)
        u.id,
        u.first_name || ' ' || u.last_name as name,
        u.role
      FROM users u
      JOIN chat_members cm ON u.id = cm.user_id
      WHERE cm.last_read_at > ${fiveMinutesAgo}
      ORDER BY u.id, cm.last_read_at DESC
    `
    return result.rows as { id: number; name: string; role: string }[]
  } catch (error) {
    console.error('Error getting online users:', error)
    return []
  }
}

