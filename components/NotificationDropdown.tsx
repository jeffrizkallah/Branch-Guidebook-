'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationItem } from '@/components/NotificationItem'
import { Notification, getUserIdentifier } from '@/lib/notifications'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  const unreadCount = notifications.filter(n => !n.is_read).length
  const hasUrgent = notifications.some(n => n.priority === 'urgent' && !n.is_read)

  // Set mounted state for portal
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 420
      const viewportWidth = window.innerWidth
      
      // Position below the button
      let left = rect.left
      
      // If dropdown would overflow right side, align to right edge of button
      if (left + dropdownWidth > viewportWidth - 16) {
        left = rect.right - dropdownWidth
      }
      
      // If still overflowing left, align to left with padding
      if (left < 16) {
        left = 16
      }
      
      setDropdownPosition({
        top: rect.bottom + 8,
        left: left,
      })
    }
  }, [isOpen])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const userId = getUserIdentifier()
      const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Refresh when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
      setExpandedId(null) // Reset expanded state when opening
    }
  }, [isOpen, fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (expandedId) {
          setExpandedId(null) // First close expanded item
        } else {
          setIsOpen(false) // Then close dropdown
        }
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, expandedId])

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const userId = getUserIdentifier()
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }, [])

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const userId = getUserIdentifier()
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleNotificationToggle = (notificationId: string) => {
    setExpandedId(prev => prev === notificationId ? null : notificationId)
  }

  // Dropdown content
  const dropdownContent = isOpen && isMounted ? createPortal(
    <div 
      ref={dropdownRef}
      className="fixed w-[420px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Notification List */}
      <div className="max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isExpanded={expandedId === notification.id}
                onToggle={() => handleNotificationToggle(notification.id)}
                onMarkAsRead={markAsRead}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            Mark all as read
          </Button>
        </div>
      )}
    </div>,
    document.body
  ) : null

  return (
    <>
      {/* Bell Button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className={`h-5 w-5 ${hasUrgent ? 'text-red-500' : ''}`} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className={`
            absolute -top-1 -right-1 min-w-[18px] h-[18px] 
            flex items-center justify-center
            text-[10px] font-bold text-white rounded-full
            ${hasUrgent ? 'bg-red-500 animate-pulse' : 'bg-primary'}
          `}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Portal */}
      {dropdownContent}
    </>
  )
}
