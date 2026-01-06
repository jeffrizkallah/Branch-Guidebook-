'use client'

import { useState } from 'react'
import { ChatMessage as ChatMessageType, ChatReaction, CHAT_REACTIONS, formatChatTime, formatFullTimestamp } from '@/lib/chat'
import { cn } from '@/lib/utils'
import { AlertTriangle, Pin, MoreHorizontal, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatMessageProps {
  message: ChatMessageType
  isOwnMessage: boolean
  onReact: (messageId: number, emoji: string) => void
  onPin?: (messageId: number) => void
  canPin?: boolean
}

export function ChatMessageComponent({ 
  message, 
  isOwnMessage, 
  onReact,
  onPin,
  canPin 
}: ChatMessageProps) {
  const [showReactions, setShowReactions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const userName = `${message.user_first_name || ''} ${message.user_last_name || ''}`.trim() || 'Unknown'
  const roleLabel = message.user_role?.replace('_', ' ') || ''

  return (
    <div 
      className={cn(
        "group relative px-4 py-2 hover:bg-muted/30 transition-colors",
        message.is_urgent && "bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500",
        message.is_pinned && "bg-amber-50 dark:bg-amber-950/20"
      )}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => { setShowMenu(false); setShowReactions(false) }}
    >
      {/* Pinned indicator */}
      {message.is_pinned && (
        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mb-1">
          <Pin className="h-3 w-3" />
          <span>Pinned message</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
          isOwnMessage 
            ? "bg-primary text-primary-foreground" 
            : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
        )}>
          {(message.user_first_name?.[0] || '?').toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-sm">{userName}</span>
            {roleLabel && (
              <span className="text-xs text-muted-foreground capitalize px-1.5 py-0.5 bg-muted rounded">
                {roleLabel}
              </span>
            )}
            <span 
              className="text-xs text-muted-foreground cursor-help"
              title={formatFullTimestamp(message.created_at)}
            >
              {formatChatTime(message.created_at)}
            </span>
            {message.is_urgent && (
              <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertTriangle className="h-3 w-3" />
                Urgent
              </span>
            )}
          </div>

          {/* Message text */}
          <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {/* Image attachment */}
          {message.image_url && (
            <div className="mt-2 relative">
              {!imageLoaded && (
                <div className="w-64 h-48 bg-muted rounded-lg animate-pulse" />
              )}
              <img
                src={message.image_url}
                alt="Attached image"
                className={cn(
                  "max-w-xs rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow",
                  !imageLoaded && "hidden"
                )}
                onClick={() => window.open(message.image_url!, '_blank')}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+Error'
                  setImageLoaded(true)
                }}
              />
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => onReact(message.id, reaction.emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                    reaction.hasReacted
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-muted hover:bg-muted/80 border border-transparent"
                  )}
                  title={reaction.users.map(u => u.name).join(', ')}
                >
                  <span>{reaction.emoji}</span>
                  <span className="font-medium">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover actions */}
        {showMenu && (
          <div className="absolute right-4 top-2 flex items-center gap-1 bg-card border rounded-lg shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100">
            {/* Reaction picker toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowReactions(!showReactions)}
            >
              <Smile className="h-4 w-4" />
            </Button>

            {/* Pin button (admin only) */}
            {canPin && onPin && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", message.is_pinned && "text-amber-500")}
                onClick={() => onPin(message.id)}
                title={message.is_pinned ? 'Unpin message' : 'Pin message'}
              >
                <Pin className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Reaction picker */}
        {showReactions && (
          <div className="absolute right-4 top-12 bg-card border rounded-lg shadow-lg p-2 flex gap-1 animate-in fade-in slide-in-from-top-2 duration-100 z-10">
            {CHAT_REACTIONS.map((r) => (
              <button
                key={r.emoji}
                onClick={() => {
                  onReact(message.id, r.emoji)
                  setShowReactions(false)
                }}
                className="p-1.5 hover:bg-muted rounded transition-colors text-lg"
                title={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

