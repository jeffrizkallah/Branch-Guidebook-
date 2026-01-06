'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Send, Camera, AlertTriangle, Smile, X, Loader2 } from 'lucide-react'
import { QuickReply } from '@/lib/chat'

interface ChatInputProps {
  onSend: (content: string, imageUrl?: string, isUrgent?: boolean) => void
  quickReplies: QuickReply[]
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, quickReplies, disabled, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const COMMON_EMOJIS = ['😊', '👍', '🔥', '❤️', '😂', '🙏', '✅', '👀', '🎉', '💪', '👨‍🍳', '🍕']

  const handleSend = () => {
    if ((!message.trim() && !imageUrl) || disabled) return
    
    onSend(message.trim() || '📷 Image', imageUrl || undefined, isUrgent)
    setMessage('')
    setImageUrl(null)
    setIsUrgent(false)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickReply = (text: string) => {
    onSend(text, undefined, false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('files', file)

      const response = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      setImageUrl(data.urls[0])
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji)
    setShowEmoji(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="border-t bg-card">
      {/* Image preview */}
      {imageUrl && (
        <div className="px-4 pt-3">
          <div className="relative inline-block">
            <img 
              src={imageUrl} 
              alt="Upload preview" 
              className="h-20 rounded-lg border shadow-sm"
            />
            <button
              onClick={() => setImageUrl(null)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Quick replies */}
      {quickReplies.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {quickReplies.map((qr) => (
            <button
              key={qr.id}
              onClick={() => handleQuickReply(qr.text)}
              disabled={disabled}
              className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors disabled:opacity-50"
            >
              {qr.emoji && <span className="mr-1">{qr.emoji}</span>}
              {qr.text}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-4">
        <div className={cn(
          "flex items-end gap-2 p-2 rounded-xl border transition-colors",
          isUrgent ? "border-red-400 bg-red-50 dark:bg-red-950/20" : "bg-muted/30"
        )}>
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Type a message..."}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent border-none resize-none focus:outline-none text-sm max-h-32 py-2 px-1 disabled:opacity-50"
            style={{ minHeight: '36px' }}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* Camera/Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              title="Attach image"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>

            {/* Urgent toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                isUrgent 
                  ? "text-red-500 bg-red-100 dark:bg-red-900/30" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setIsUrgent(!isUrgent)}
              disabled={disabled}
              title={isUrgent ? "Remove urgent flag" : "Mark as urgent"}
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>

            {/* Emoji picker */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowEmoji(!showEmoji)}
                disabled={disabled}
                title="Add emoji"
              >
                <Smile className="h-4 w-4" />
              </Button>

              {showEmoji && (
                <div className="absolute bottom-10 right-0 bg-card border rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1 animate-in fade-in slide-in-from-bottom-2 duration-100 z-20">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="p-1.5 hover:bg-muted rounded transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Send button */}
            <Button
              size="icon"
              className={cn(
                "h-8 w-8 transition-all",
                (message.trim() || imageUrl) 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}
              onClick={handleSend}
              disabled={disabled || (!message.trim() && !imageUrl)}
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Urgent hint */}
        {isUrgent && (
          <p className="text-xs text-red-500 mt-1 ml-2">
            🚨 This message will be highlighted as urgent
          </p>
        )}
      </div>
    </div>
  )
}

