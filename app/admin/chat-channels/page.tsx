'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  Hash, 
  Users, 
  MessageCircle, 
  Lock, 
  Unlock,
  Megaphone,
  ChefHat,
  Building2,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { formatRelativeTime } from '@/lib/notifications'

interface ChatChannel {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string
  is_read_only: boolean
  created_at: string
  message_count: number
  member_count: number
  last_message_at: string | null
}

const ICON_OPTIONS = [
  { value: 'hash', label: 'Default', icon: Hash },
  { value: 'users', label: 'Team', icon: Users },
  { value: 'megaphone', label: 'Announcements', icon: Megaphone },
  { value: 'chef-hat', label: 'Kitchen', icon: ChefHat },
  { value: 'building', label: 'Branch', icon: Building2 },
  { value: 'star', label: 'Important', icon: Star },
]

function getIconComponent(iconName: string) {
  const found = ICON_OPTIONS.find(o => o.value === iconName)
  return found?.icon || Hash
}

export default function ChatChannelsAdminPage() {
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ChatChannel | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'hash',
    is_read_only: false,
  })

  // Fetch channels
  const fetchChannels = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/chat/admin/channels')
      if (response.ok) {
        const data = await response.json()
        setChannels(data.channels || [])
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'hash',
      is_read_only: false,
    })
    setEditingChannel(null)
    setShowCreateForm(false)
  }

  // Handle create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = editingChannel 
        ? `/api/chat/admin/channels/${editingChannel.id}`
        : '/api/chat/admin/channels'
      
      const method = editingChannel ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchChannels()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save channel')
      }
    } catch (error) {
      console.error('Failed to save channel:', error)
      alert('Failed to save channel')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle edit
  const handleEdit = (channel: ChatChannel) => {
    setFormData({
      name: channel.name,
      description: channel.description || '',
      icon: channel.icon || 'hash',
      is_read_only: channel.is_read_only,
    })
    setEditingChannel(channel)
    setShowCreateForm(true)
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const response = await fetch(`/api/chat/admin/channels/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchChannels()
        setDeleteTarget(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete channel')
      }
    } catch (error) {
      console.error('Failed to delete channel:', error)
      alert('Failed to delete channel')
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
              <h1 className="text-3xl font-bold text-primary">Chat Channels</h1>
              <p className="text-muted-foreground">Manage chat channels for your team</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Channel
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" />
                {editingChannel ? 'Edit Channel' : 'Create Channel'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Channel Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Managers, Central Kitchen"
                      required
                      disabled={editingChannel?.slug === 'general'}
                    />
                    {editingChannel?.slug === 'general' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        The General channel name cannot be changed
                      </p>
                    )}
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Icon</label>
                    <div className="flex gap-2 flex-wrap">
                      {ICON_OPTIONS.map((option) => {
                        const IconComp = option.icon
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, icon: option.value })}
                            className={`
                              p-2 rounded-lg border transition-all
                              ${formData.icon === option.value 
                                ? 'border-primary bg-primary/10 text-primary' 
                                : 'border-border hover:border-primary/50'}
                            `}
                            title={option.label}
                          >
                            <IconComp className="h-5 w-5" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What is this channel for?"
                  />
                </div>

                {/* Read-only toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_read_only: !formData.is_read_only })}
                    className={`
                      relative w-12 h-6 rounded-full transition-colors
                      ${formData.is_read_only ? 'bg-primary' : 'bg-muted'}
                    `}
                  >
                    <span 
                      className={`
                        absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all
                        ${formData.is_read_only ? 'left-7' : 'left-1'}
                      `}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-medium">Read-only channel</p>
                    <p className="text-xs text-muted-foreground">
                      Only admins can post messages (good for announcements)
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : editingChannel ? 'Update Channel' : 'Create Channel'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Channels List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              All Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-muted-foreground">Loading channels...</p>
              </div>
            ) : channels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No channels yet. Create your first one!
              </div>
            ) : (
              <div className="space-y-3">
                {channels.map((channel) => {
                  const IconComp = getIconComponent(channel.icon)
                  const isProtected = channel.slug === 'general'

                  return (
                    <div
                      key={channel.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors"
                    >
                      {/* Icon */}
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <IconComp className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold">#{channel.name}</span>
                          {channel.is_read_only && (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Read-only
                            </Badge>
                          )}
                          {isProtected && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              Default
                            </Badge>
                          )}
                        </div>
                        {channel.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                            {channel.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {channel.message_count} messages
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {channel.member_count} members
                          </span>
                          {channel.last_message_at && (
                            <span>
                              Last message {formatRelativeTime(channel.last_message_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(channel)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!isProtected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(channel)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="mt-6 bg-gradient-to-r from-primary/5 to-primary/10 border-dashed">
          <CardContent className="py-4">
            <h3 className="font-semibold text-sm mb-2">💡 Channel Tips</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• The <strong>#General</strong> channel is for everyone and cannot be deleted</li>
              <li>• Use <strong>read-only</strong> channels for announcements that only admins can post to</li>
              <li>• Create role-specific channels like <strong>#Managers</strong> or <strong>#Central-Kitchen</strong></li>
              <li>• All users can see and join all channels currently</li>
            </ul>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <DeleteConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Channel"
          description={`Are you sure you want to delete #${deleteTarget?.name}? All messages in this channel will be permanently deleted.`}
        />
      </div>
  )
}

