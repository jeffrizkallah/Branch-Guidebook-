'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Hash, Users, Pin, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChatMessageComponent } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ChatMessage, ChatChannel, QuickReply } from '@/lib/chat'

interface ChatSlidePanelProps {
  isOpen: boolean
  onClose: () => void
}

interface OnlineUser {
  id: number
  name: string
  role: string
}

export function ChatSlidePanel({ isOpen, onClose }: ChatSlidePanelProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showPinned, setShowPinned] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Set mounted state for portal
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Get current user info from session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        if (data?.user?.id) {
          setCurrentUserId(parseInt(data.user.id))
          setUserRole(data.user.role)
        }
      } catch (error) {
        console.error('Error fetching session:', error)
      }
    }
    fetchSession()
  }, [])

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/channels')
      const data = await res.json()
      if (data.channels) {
        setChannels(data.channels)
        if (!activeChannel && data.channels.length > 0) {
          setActiveChannel(data.channels[0])
        }
      }
      if (data.quickReplies) {
        setQuickReplies(data.quickReplies)
      }
    } catch (error) {
      console.error('Error fetching channels:', error)
    }
  }, [activeChannel])

  // Fetch messages for active channel
  const fetchMessages = useCallback(async (showLoader = true) => {
    if (!activeChannel) return
    
    if (showLoader) setIsLoading(true)
    try {
      const res = await fetch(`/api/chat/messages?channelId=${activeChannel.id}`)
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages)
      }
      if (data.pinnedMessages) {
        setPinnedMessages(data.pinnedMessages)
      }
      if (data.onlineUsers) {
        setOnlineUsers(data.onlineUsers)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [activeChannel])

  // Initial load
  useEffect(() => {
    if (isOpen) {
      fetchChannels()
    }
  }, [isOpen, fetchChannels])

  // Load messages when channel changes
  useEffect(() => {
    if (activeChannel) {
      fetchMessages()
    }
  }, [activeChannel, fetchMessages])

  // Poll for new messages (every 3 seconds when panel is open)
  useEffect(() => {
    if (isOpen && activeChannel) {
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(false) // Don't show loader for polling
      }, 3000)
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [isOpen, activeChannel, fetchMessages])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Handle send message
  const handleSendMessage = async (content: string, imageUrl?: string, isUrgent?: boolean) => {
    if (!activeChannel || !content.trim()) return
    
    setIsSending(true)
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: activeChannel.id,
          content,
          imageUrl,
          isUrgent
        })
      })
      
      if (res.ok) {
        // Refresh messages to get the new one
        await fetchMessages(false)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Handle reaction
  const handleReaction = async (messageId: number, emoji: string) => {
    try {
      await fetch('/api/chat/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji })
      })
      // Refresh messages to update reactions
      await fetchMessages(false)
    } catch (error) {
      console.error('Error toggling reaction:', error)
    }
  }

  // Handle pin/unpin
  const handlePin = async (messageId: number) => {
    try {
      await fetch('/api/chat/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId })
      })
      await fetchMessages(false)
    } catch (error) {
      console.error('Error toggling pin:', error)
    }
  }

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isMounted) return null

  const panelContent = (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/30 z-[60] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-[420px] md:w-[480px] bg-card border-l shadow-2xl z-[70]",
          "flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Mikana Chat</h2>
              {/* Channel selector */}
              {channels.length > 1 ? (
                <select
                  value={activeChannel?.id || ''}
                  onChange={(e) => {
                    const channel = channels.find(c => c.id === parseInt(e.target.value))
                    if (channel) setActiveChannel(channel)
                  }}
                  className="text-xs text-muted-foreground bg-transparent border-none p-0 cursor-pointer hover:text-foreground focus:outline-none"
                >
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name} {(ch.unread_count || 0) > 0 ? `(${ch.unread_count})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  #{activeChannel?.name || 'Loading...'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchMessages(true)}
              className="h-8 w-8"
              title="Refresh messages"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Channel tabs (when multiple channels) */}
        {channels.length > 1 && (
          <div className="flex gap-1 px-4 py-2 border-b overflow-x-auto bg-muted/20">
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors",
                  activeChannel?.id === ch.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                #{ch.name}
                {(ch.unread_count || 0) > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                    {ch.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Pinned messages bar */}
        {pinnedMessages.length > 0 && (
          <button
            onClick={() => setShowPinned(!showPinned)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b text-sm hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
          >
            <Pin className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700 dark:text-amber-400">
              {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? 's' : ''}
            </span>
          </button>
        )}

        {/* Pinned messages dropdown */}
        {showPinned && pinnedMessages.length > 0 && (
          <div className="max-h-48 overflow-y-auto border-b bg-amber-50/50 dark:bg-amber-950/10">
            {pinnedMessages.map(msg => (
              <div key={msg.id} className="px-4 py-2 border-b border-amber-200/50 last:border-b-0">
                <p className="text-xs text-muted-foreground">
                  {msg.user_first_name} {msg.user_last_name}
                </p>
                <p className="text-sm line-clamp-2">{msg.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Online users bar */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b overflow-x-auto">
            <Users className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-xs text-muted-foreground flex-shrink-0">Online:</span>
            <div className="flex gap-2">
              {onlineUsers.slice(0, 5).map(user => (
                <span 
                  key={user.id}
                  className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full whitespace-nowrap"
                >
                  {user.name.split(' ')[0]}
                </span>
              ))}
              {onlineUsers.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{onlineUsers.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Messages area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Hash className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No messages yet</h3>
              <p className="text-sm text-muted-foreground">
                Be the first to say hello! 👋
              </p>
            </div>
          ) : (
            <div className="py-2">
              {messages.map((msg) => (
                <ChatMessageComponent
                  key={msg.id}
                  message={msg}
                  isOwnMessage={msg.user_id === currentUserId}
                  onReact={handleReaction}
                  onPin={handlePin}
                  canPin={userRole === 'admin'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <ChatInput
          onSend={handleSendMessage}
          quickReplies={quickReplies}
          disabled={isSending || !activeChannel}
          placeholder={activeChannel?.is_read_only ? "This channel is read-only" : undefined}
        />
      </div>
    </>
  )

  return createPortal(panelContent, document.body)
}

