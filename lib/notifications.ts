// Notification types and utilities

export interface Notification {
  id: string
  type: 'feature' | 'patch' | 'alert' | 'announcement' | 'urgent'
  priority: 'normal' | 'urgent'
  title: string
  preview: string
  content: string
  created_at: string
  expires_at: string
  created_by: string
  is_active: boolean
  is_read?: boolean
}

export interface NotificationRead {
  id: string
  notification_id: string
  user_identifier: string
  read_at: string
}

// Get or create user identifier for tracking read status
export function getUserIdentifier(): string {
  if (typeof window === 'undefined') return ''
  
  let id = localStorage.getItem('notification_user_id')
  if (!id) {
    id = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('notification_user_id', id)
  }
  return id
}

// Format relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  }

  return date.toLocaleDateString()
}

// Get notification type config (icon, color, label)
export function getNotificationTypeConfig(type: Notification['type']) {
  const configs = {
    feature: {
      label: 'New Feature',
      color: 'bg-blue-500',
      borderColor: 'border-l-blue-500',
      textColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
    },
    patch: {
      label: 'Patch Notes',
      color: 'bg-green-500',
      borderColor: 'border-l-green-500',
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
    },
    alert: {
      label: 'Alert',
      color: 'bg-amber-500',
      borderColor: 'border-l-amber-500',
      textColor: 'text-amber-600',
      bgLight: 'bg-amber-50',
    },
    announcement: {
      label: 'Announcement',
      color: 'bg-gray-500',
      borderColor: 'border-l-gray-500',
      textColor: 'text-gray-600',
      bgLight: 'bg-gray-50',
    },
    urgent: {
      label: 'Urgent',
      color: 'bg-red-500',
      borderColor: 'border-l-red-500',
      textColor: 'text-red-600',
      bgLight: 'bg-red-50',
    },
  }

  return configs[type] || configs.announcement
}

