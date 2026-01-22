'use client'

import { useState } from 'react'
import { X, ThumbsUp, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { QUALITY_LIKE_TAGS } from '@/lib/quality-likes'

interface LikeModalProps {
  submissionId: number
  submitterName: string
  productName: string
  onClose: () => void
  onLikeAdded: () => void
}

export function LikeModal({ 
  submissionId, 
  submitterName, 
  productName,
  onClose, 
  onLikeAdded 
}: LikeModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/quality-checks/${submissionId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: note.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add like')
      }

      setSuccess(true)
      setTimeout(() => {
        onLikeAdded()
        onClose()
      }, 1000)

    } catch (err) {
      console.error('Error adding like:', err)
      alert(err instanceof Error ? err.message : 'Failed to add like')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-r from-blue-50 to-sky-50 rounded-t-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-lg text-blue-900">
                  Like This Submission
                </h2>
              </div>
              <p className="text-sm text-blue-700">
                Send appreciation to <span className="font-medium">{submitterName}</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                For: {productName}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {success ? (
            <div className="py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-green-700">Like added!</p>
              <p className="text-sm text-muted-foreground mt-2">
                {submitterName} has been notified
              </p>
            </div>
          ) : (
            <>
              {/* Tags Selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  What stood out? <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="space-y-2">
                  {QUALITY_LIKE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border-2 transition-all ${
                        selectedTags.includes(tag)
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-blue-300 bg-white text-gray-700 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedTags.includes(tag)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedTags.includes(tag) && (
                            <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{tag}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note Input */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Add a note <span className="text-muted-foreground font-normal">(optional, max 200)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Perfect presentation! Keep up the great work..."
                  className="w-full p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={3}
                  maxLength={200}
                />
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${note.length >= 190 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {note.length}/200
                  </span>
                  {(selectedTags.length === 0 && note.trim().length === 0) && (
                    <span className="text-xs text-amber-600">
                      Select at least one tag or add a note
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-4 sm:p-6 border-t border-border bg-muted/30">
            <div className="flex items-center justify-end gap-3">
              <Button 
                onClick={onClose} 
                variant="outline"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || (selectedTags.length === 0 && note.trim().length === 0)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Like This
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
