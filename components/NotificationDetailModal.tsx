'use client'

import { useEffect } from 'react'
import { X, Sparkles, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Notification, formatRelativeTime, getNotificationTypeConfig } from '@/lib/notifications'

interface NotificationDetailModalProps {
  notification: Notification | null
  onClose: () => void
  onMarkAsRead: (id: string) => void
}

const typeIcons = {
  feature: Sparkles,
  patch: CheckCircle,
  alert: AlertTriangle,
  announcement: Info,
  urgent: AlertCircle,
}

// Simple markdown-like renderer for notification content
function renderContent(content: string) {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let listItems: string[] = []
  let inList = false

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-4 text-sm">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
          ))}
        </ul>
      )
      listItems = []
    }
    inList = false
  }

  const formatInlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-muted rounded text-xs">$1</code>')
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    // Heading 2
    if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={index} className="text-lg font-bold mb-3 mt-4 first:mt-0 text-foreground">
          {trimmed.replace('## ', '')}
        </h2>
      )
      return
    }

    // Heading 3
    if (trimmed.startsWith('### ')) {
      flushList()
      const heading = trimmed.replace('### ', '')
      let headingColor = 'text-foreground'
      if (heading.toLowerCase().includes('added')) headingColor = 'text-green-600'
      if (heading.toLowerCase().includes('changed')) headingColor = 'text-amber-600'
      if (heading.toLowerCase().includes('deleted') || heading.toLowerCase().includes('removed')) headingColor = 'text-red-600'
      if (heading.toLowerCase().includes('fixed')) headingColor = 'text-blue-600'
      
      elements.push(
        <h3 key={index} className={`text-sm font-semibold mb-2 mt-3 ${headingColor}`}>
          {heading}
        </h3>
      )
      return
    }

    // List item
    if (trimmed.startsWith('- ')) {
      inList = true
      listItems.push(trimmed.replace('- ', ''))
      return
    }

    // Empty line
    if (!trimmed) {
      flushList()
      return
    }

    // Regular paragraph
    flushList()
    elements.push(
      <p 
        key={index} 
        className="text-sm text-muted-foreground mb-3"
        dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }}
      />
    )
  })

  flushList()
  return elements
}

export function NotificationDetailModal({ notification, onClose, onMarkAsRead }: NotificationDetailModalProps) {
  useEffect(() => {
    if (notification && !notification.is_read) {
      onMarkAsRead(notification.id)
    }
  }, [notification, onMarkAsRead])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  if (!notification) return null

  const config = getNotificationTypeConfig(notification.type)
  const Icon = typeIcons[notification.type] || Info

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-4 border-b border-border ${config.bgLight}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${config.color}`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">{notification.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bgLight} ${config.textColor}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {renderContent(notification.content)}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Posted by {notification.created_by}
            </span>
            <Button onClick={onClose} size="sm">
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

