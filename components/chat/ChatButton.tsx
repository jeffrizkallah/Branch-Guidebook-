'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChatSlidePanel } from './ChatSlidePanel'

interface ChatButtonProps {
  isCollapsed?: boolean
}

export function ChatButton({ isCollapsed }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/unread')
      const data = await res.json()
      if (typeof data.totalUnread === 'number') {
        setUnreadCount(data.totalUnread)
      }
    } catch (error) {
      // Silently fail - not critical
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    fetchUnreadCount()
    
    // Poll every 10 seconds for unread count
    const interval = setInterval(fetchUnreadCount, 10000)
    
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Reset unread when opening panel
  useEffect(() => {
    if (isOpen) {
      // Small delay to let panel load, then refresh count
      const timer = setTimeout(fetchUnreadCount, 1000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, fetchUnreadCount])

  return (
    <>
      <Button
        variant="ghost"
        className={cn(
          "relative w-full justify-start gap-3 px-4 py-3 rounded-lg",
          "text-sm font-medium transition-all duration-200",
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          isCollapsed && "justify-center px-0"
        )}
        onClick={() => setIsOpen(true)}
        title={isCollapsed ? 'Chat' : undefined}
      >
        <MessageCircle className="h-5 w-5 flex-shrink-0" />
        {!isCollapsed && <span>Chat</span>}
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span 
            className={cn(
              "flex items-center justify-center text-[10px] font-bold text-white rounded-full bg-primary",
              isCollapsed 
                ? "absolute -top-1 -right-1 min-w-[18px] h-[18px]"
                : "ml-auto min-w-[20px] h-5 px-1.5"
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <ChatSlidePanel 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  )
}

