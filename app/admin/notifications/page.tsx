'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff, Sparkles, CheckCircle, AlertTriangle, Info, AlertCircle, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Notification, formatRelativeTime, getNotificationTypeConfig } from '@/lib/notifications'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'

const typeIcons: Record<string, typeof Info> = {
  feature: Sparkles,
  patch: CheckCircle,
  alert: AlertTriangle,
  announcement: Info,
  urgent: AlertCircle,
  user_signup: UserPlus,
}

interface AdminNotification extends Notification {
  read_count?: number
}

export default function NotificationsAdminPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingNotification, setEditingNotification] = useState<AdminNotification | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminNotification | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    type: 'announcement' as Notification['type'],
    priority: 'normal' as Notification['priority'],
    title: '',
    preview: '',
    content: '',
    expires_in_days: 7,
  })

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications/admin')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  // Reset form
  const resetForm = () => {
    setFormData({
      type: 'announcement',
      priority: 'normal',
      title: '',
      preview: '',
      content: '',
      expires_in_days: 7,
    })
    setEditingNotification(null)
    setShowCreateForm(false)
  }

  // Handle create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingNotification 
        ? `/api/notifications/${editingNotification.id}`
        : '/api/notifications'
      
      const method = editingNotification ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchNotifications()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save notification')
      }
    } catch (error) {
      console.error('Failed to save notification:', error)
      alert('Failed to save notification')
    }
  }

  // Handle edit
  const handleEdit = (notification: AdminNotification) => {
    setFormData({
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      preview: notification.preview,
      content: notification.content,
      expires_in_days: 7,
    })
    setEditingNotification(notification)
    setShowCreateForm(true)
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const response = await fetch(`/api/notifications/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchNotifications()
        setDeleteTarget(null)
      } else {
        alert('Failed to delete notification')
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
      alert('Failed to delete notification')
    }
  }

  // Toggle active status
  const toggleActive = async (notification: AdminNotification) => {
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !notification.is_active }),
      })

      if (response.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error('Failed to toggle notification:', error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-primary">Notifications</h1>
              <p className="text-muted-foreground">Manage announcements and updates</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Notification
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingNotification ? 'Edit Notification' : 'Create Notification'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Notification['type'] })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="feature">Feature Update</option>
                      <option value="patch">Patch Notes</option>
                      <option value="alert">Alert</option>
                      <option value="announcement">Announcement</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as Notification['priority'] })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Expires */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Expires In (days)</label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={formData.expires_in_days}
                      onChange={(e) => setFormData({ ...formData, expires_in_days: parseInt(e.target.value) || 7 })}
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Notification title..."
                    required
                  />
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium mb-1">Preview (shown in dropdown)</label>
                  <Input
                    value={formData.preview}
                    onChange={(e) => setFormData({ ...formData, preview: e.target.value })}
                    placeholder="Short preview text..."
                    required
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium mb-1">Content (supports markdown)</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="## What's New&#10;&#10;### Added&#10;- Feature 1&#10;- Feature 2&#10;&#10;### Changed&#10;- Change 1"
                    className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use ## for headings, ### for subheadings, - for lists, **bold**, *italic*
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4">
                  <Button type="submit">
                    {editingNotification ? 'Update' : 'Create'} Notification
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>All Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-muted-foreground">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No notifications yet. Create your first one!
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => {
                  const config = getNotificationTypeConfig(notification.type)
                  const Icon = typeIcons[notification.type] || Info
                  const isExpired = new Date(notification.expires_at) < new Date()

                  return (
                    <div
                      key={notification.id}
                      className={`
                        flex items-start gap-4 p-4 rounded-lg border
                        ${!notification.is_active || isExpired ? 'opacity-60 bg-muted/30' : 'bg-card'}
                      `}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-full ${config.bgLight} flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${config.textColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold">{notification.title}</span>
                          <Badge variant="outline" className={config.textColor}>
                            {config.label}
                          </Badge>
                          {notification.priority === 'urgent' && (
                            <Badge variant="destructive">Urgent</Badge>
                          )}
                          {!notification.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {isExpired && (
                            <Badge variant="secondary">Expired</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {notification.preview}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created {formatRelativeTime(notification.created_at)}</span>
                          <span>Expires {formatRelativeTime(notification.expires_at)}</span>
                          {notification.read_count !== undefined && (
                            <span>{notification.read_count} reads</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(notification)}
                          title={notification.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {notification.is_active ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(notification)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(notification)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <DeleteConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Notification"
          description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        />
      </div>
  )
}

