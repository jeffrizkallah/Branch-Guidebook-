'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { X, AlertTriangle, Thermometer, Scale, CheckCircle, Clock, User, MapPin, Calendar, Image as ImageIcon, Eye, MessageSquare, Send, Loader2, CheckCheck, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { LikeModal } from '@/components/LikeModal'
import { QualityLike, LikesSummary, canGiveLikes } from '@/lib/quality-likes'

interface QualityCheckDetail {
  id: number
  branchSlug: string
  branchName: string
  submittedBy: number
  submitterName: string
  submitterEmail?: string
  submissionDate: string
  mealService: string
  productName: string
  section: string
  tasteScore: number
  appearanceScore: number
  portionQtyGm?: number
  tempCelsius?: number
  tasteNotes?: string
  portionNotes?: string
  appearanceNotes?: string
  remarks?: string
  correctiveActionTaken?: boolean
  correctiveActionNotes?: string
  photos?: string[]
  status: string
  adminNotes?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
}

interface Feedback {
  id: number
  qualityCheckId: number
  feedbackText: string
  feedbackBy: number
  feedbackByName: string
  feedbackByRole: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}

interface QualityCheckDetailModalProps {
  submissionId: number | null
  onClose: () => void
}

export function QualityCheckDetailModal({ submissionId, onClose }: QualityCheckDetailModalProps) {
  const { data: session } = useSession()
  const [submission, setSubmission] = useState<QualityCheckDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  
  // Feedback state
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  // Likes state
  const [likes, setLikes] = useState<QualityLike[]>([])
  const [likesLoading, setLikesLoading] = useState(false)
  const [showLikeModal, setShowLikeModal] = useState(false)
  const [userHasLiked, setUserHasLiked] = useState(false)
  const [currentUserLikeId, setCurrentUserLikeId] = useState<number | undefined>()
  const [likingInProgress, setLikingInProgress] = useState(false)

  const userRole = session?.user?.role
  const userId = session?.user?.id
  const canGiveFeedback = ['admin', 'regional_manager', 'operations_lead'].includes(userRole || '')
  const canLike = canGiveLikes(userRole)
  const isSubmitter = submission?.submittedBy === userId

  const fetchFeedback = useCallback(async () => {
    if (!submissionId) return
    
    setFeedbackLoading(true)
    try {
      const response = await fetch(`/api/quality-checks/${submissionId}/feedback`)
      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback || [])
      }
    } catch (err) {
      console.error('Error fetching feedback:', err)
    } finally {
      setFeedbackLoading(false)
    }
  }, [submissionId])

  const fetchLikes = useCallback(async () => {
    if (!submissionId) return
    
    setLikesLoading(true)
    try {
      const response = await fetch(`/api/quality-checks/${submissionId}/likes`)
      if (response.ok) {
        const data: LikesSummary = await response.json()
        setLikes(data.likes || [])
        setUserHasLiked(data.userHasLiked)
        setCurrentUserLikeId(data.currentUserLikeId)
      }
    } catch (err) {
      console.error('Error fetching likes:', err)
    } finally {
      setLikesLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    if (!submissionId) {
      setSubmission(null)
      setFeedback([])
      setLikes([])
      return
    }

    const fetchSubmission = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/quality-checks/${submissionId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch submission details')
        }
        const data = await response.json()
        setSubmission(data)
      } catch (err) {
        console.error('Error fetching submission:', err)
        setError('Failed to load submission details')
      } finally {
        setLoading(false)
      }
    }

    fetchSubmission()
    fetchFeedback()
    fetchLikes()
  }, [submissionId, fetchFeedback, fetchLikes])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPhoto) {
          setSelectedPhoto(null)
          setShowFeedbackPanel(false)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose, selectedPhoto])

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || !submissionId) return

    setSendingFeedback(true)
    try {
      const response = await fetch(`/api/quality-checks/${submissionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackText: feedbackText.trim() })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send feedback')
      }

      setFeedbackText('')
      setFeedbackSuccess(true)
      setTimeout(() => setFeedbackSuccess(false), 3000)
      
      // Refresh feedback list
      await fetchFeedback()
    } catch (err) {
      console.error('Error sending feedback:', err)
      alert(err instanceof Error ? err.message : 'Failed to send feedback')
    } finally {
      setSendingFeedback(false)
    }
  }

  const handleMarkAsRead = async (feedbackId: number) => {
    if (!submissionId) return

    try {
      const response = await fetch(`/api/quality-checks/${submissionId}/feedback/${feedbackId}/read`, {
        method: 'PATCH'
      })

      if (response.ok) {
        setFeedback(prev => prev.map(f => 
          f.id === feedbackId ? { ...f, isRead: true, readAt: new Date().toISOString() } : f
        ))
      }
    } catch (err) {
      console.error('Error marking feedback as read:', err)
    }
  }

  const handleToggleLike = async () => {
    if (!submissionId) return

    if (userHasLiked) {
      // Unlike
      setLikingInProgress(true)
      try {
        const response = await fetch(`/api/quality-checks/${submissionId}/like`, {
          method: 'DELETE'
        })

        if (response.ok) {
          await fetchLikes()
        } else {
          const data = await response.json()
          alert(data.error || 'Failed to remove like')
        }
      } catch (err) {
        console.error('Error removing like:', err)
        alert('Failed to remove like')
      } finally {
        setLikingInProgress(false)
      }
    } else {
      // Show modal to add like
      setShowLikeModal(true)
    }
  }

  const handleLikeAdded = async () => {
    await fetchLikes()
  }

  if (!submissionId) return null

  const getScoreColor = (score: number) => {
    if (score <= 2) return 'text-red-600 bg-red-100 border-red-300'
    if (score <= 3) return 'text-amber-600 bg-amber-100 border-amber-300'
    if (score <= 4) return 'text-yellow-600 bg-yellow-100 border-yellow-300'
    return 'text-green-600 bg-green-100 border-green-300'
  }

  const getScoreLabel = (score: number) => {
    if (score === 1) return 'Very Poor'
    if (score === 2) return 'Poor'
    if (score === 3) return 'Fair'
    if (score === 4) return 'Good'
    if (score === 5) return 'Excellent'
    return 'N/A'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  const formatMealService = (service: string) => {
    return service.charAt(0).toUpperCase() + service.slice(1)
  }

  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const unreadFeedbackCount = feedback.filter(f => !f.isRead).length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  #{submissionId}
                </Badge>
                {submission && (
                  <Badge className="text-xs bg-blue-600">
                    {formatMealService(submission.mealService)}
                  </Badge>
                )}
                {unreadFeedbackCount > 0 && isSubmitter && (
                  <Badge className="text-xs bg-orange-500 animate-pulse">
                    {unreadFeedbackCount} new feedback
                  </Badge>
                )}
              </div>
              {submission && (
                <>
                  <h2 className="font-bold text-xl text-foreground mb-1">
                    {submission.productName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {submission.branchName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {submission.section}
                      </Badge>
                    </span>
                  </div>
                </>
              )}
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading details...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {submission && !loading && !error && (
            <div className="space-y-6">
              {/* Feedback Received Section (for submitters) */}
              {isSubmitter && feedback.length > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-4">
                  <h3 className="font-semibold text-sm mb-3 text-orange-900 uppercase tracking-wide flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Feedback Received ({feedback.length})
                  </h3>
                  <div className="space-y-3">
                    {feedback.map((fb) => (
                      <div 
                        key={fb.id} 
                        className={`p-3 rounded-lg border ${
                          fb.isRead 
                            ? 'bg-white/50 border-orange-100' 
                            : 'bg-white border-orange-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                              {fb.feedbackByName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-orange-900">{fb.feedbackByName}</p>
                              <p className="text-xs text-orange-600">{formatRole(fb.feedbackByRole)} • {formatRelativeTime(fb.createdAt)}</p>
                            </div>
                          </div>
                          {!fb.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(fb.id)}
                              className="text-xs h-7 px-2 text-orange-700 hover:bg-orange-100"
                            >
                              <CheckCheck className="h-3.5 w-3.5 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          {fb.isRead && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCheck className="h-3.5 w-3.5" />
                              Acknowledged
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{fb.feedbackText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scores Section */}
              <div>
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                  Quality Scores
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border-2 ${getScoreColor(submission.tasteScore)}`}>
                    <p className="text-xs font-medium mb-1 opacity-75">Taste</p>
                    <p className="text-3xl font-bold">{submission.tasteScore}/5</p>
                    <p className="text-xs mt-1">{getScoreLabel(submission.tasteScore)}</p>
                  </div>
                  <div className={`p-4 rounded-lg border-2 ${getScoreColor(submission.appearanceScore)}`}>
                    <p className="text-xs font-medium mb-1 opacity-75">Appearance</p>
                    <p className="text-3xl font-bold">{submission.appearanceScore}/5</p>
                    <p className="text-xs mt-1">{getScoreLabel(submission.appearanceScore)}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-4">
                  {/* Debug info */}
                  <div className="text-xs bg-gray-100 p-2 rounded">
                    <p>Debug: canLike={String(canLike)}, isSubmitter={String(isSubmitter)}, role={userRole}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canLike && !isSubmitter && (
                      <Button
                        onClick={handleToggleLike}
                        disabled={likingInProgress}
                        className={userHasLiked 
                          ? "bg-blue-600 hover:bg-blue-700 text-white" 
                          : "bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600"
                        }
                      >
                        {likingInProgress ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ThumbsUp className={`h-4 w-4 mr-2 ${userHasLiked ? 'fill-current' : ''}`} />
                        )}
                        {userHasLiked ? `Liked (${likes.length})` : 'Like'}
                      </Button>
                    )}
                    {canGiveFeedback && !isSubmitter && (
                      <Button
                        onClick={() => setShowFeedbackPanel(true)}
                        variant="outline"
                        className="border-2 border-orange-600 text-orange-600 hover:bg-orange-50"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Give Feedback
                      </Button>
                    )}
                    {isSubmitter && likes.length > 0 && (
                      <div className="flex items-center gap-2 text-blue-600 font-medium">
                        <ThumbsUp className="h-4 w-4 fill-current" />
                        <span>{likes.length} {likes.length === 1 ? 'Like' : 'Likes'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Likes Section */}
              {likes.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-200 p-4">
                  <h3 className="font-semibold text-sm mb-3 text-blue-900 uppercase tracking-wide flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4" />
                    Liked by {likes.length} {likes.length === 1 ? 'Manager' : 'Managers'}
                  </h3>
                  <div className="space-y-3">
                    {likes.map((like) => (
                      <div 
                        key={like.id} 
                        className="p-3 bg-white rounded-lg border border-blue-100 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-sky-500 flex items-center justify-center text-white text-xs font-bold">
                              {like.givenByName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-blue-900">{like.givenByName}</p>
                              <p className="text-xs text-blue-600">{formatRole(like.givenByRole)} • {formatRelativeTime(like.createdAt)}</p>
                            </div>
                          </div>
                          <ThumbsUp className="h-4 w-4 text-blue-500 fill-current flex-shrink-0" />
                        </div>
                        {like.tags && like.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {like.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                ✨ {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {like.note && (
                          <p className="text-sm text-gray-700 leading-relaxed italic">"{like.note}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Measurements Section */}
              {(submission.tempCelsius !== null || submission.portionQtyGm !== null) && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                    Measurements
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {submission.tempCelsius !== null && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Thermometer className="h-4 w-4 text-blue-600" />
                          <p className="text-xs font-medium text-blue-900">Temperature</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{submission.tempCelsius}°C</p>
                      </div>
                    )}
                    {submission.portionQtyGm !== null && (
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Scale className="h-4 w-4 text-purple-600" />
                          <p className="text-xs font-medium text-purple-900">Portion Weight</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-700">{submission.portionQtyGm}g</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {(submission.tasteNotes || submission.appearanceNotes || submission.portionNotes) && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                    Detailed Notes
                  </h3>
                  <div className="space-y-3">
                    {submission.tasteNotes && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs font-medium text-amber-900 mb-1">Taste Notes</p>
                        <p className="text-sm text-amber-800">{submission.tasteNotes}</p>
                      </div>
                    )}
                    {submission.appearanceNotes && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-900 mb-1">Appearance Notes</p>
                        <p className="text-sm text-blue-800">{submission.appearanceNotes}</p>
                      </div>
                    )}
                    {submission.portionNotes && (
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-xs font-medium text-purple-900 mb-1">Portion Notes</p>
                        <p className="text-sm text-purple-800">{submission.portionNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Remarks */}
              {submission.remarks && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                    Additional Remarks
                  </h3>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-700">{submission.remarks}</p>
                  </div>
                </div>
              )}

              {/* Corrective Action */}
              {submission.correctiveActionTaken && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Corrective Action Taken
                  </h3>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      {submission.correctiveActionNotes || 'Corrective action was taken for this submission.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Photos */}
              {submission.photos && submission.photos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Photos ({submission.photos.length})
                    {canGiveFeedback && (
                      <span className="text-xs font-normal text-blue-600 ml-2">
                        Click to view & give feedback
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {submission.photos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedPhoto(photo)}
                        className="relative aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all group"
                      >
                        <Image
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submission Info */}
              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                  Submission Information
                </h3>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Submitted by:</span>
                    <span className="font-medium">{submission.submitterName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">{formatDate(submission.submissionDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={submission.status === 'completed' ? 'default' : 'secondary'}>
                      {submission.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border bg-muted/30">
          <div className="flex items-center justify-end gap-2">
            <Button onClick={onClose} variant="default">
              Close
            </Button>
          </div>
        </div>
      </Card>

      {/* Photo Lightbox with Feedback Panel */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[110] bg-black/90 flex"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedPhoto(null)
              setShowFeedbackPanel(false)
            }
          }}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => {
              setSelectedPhoto(null)
              setShowFeedbackPanel(false)
            }}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Feedback toggle button (for managers) */}
          {canGiveFeedback && (
            <Button
              variant={showFeedbackPanel ? "default" : "ghost"}
              size="sm"
              className={`absolute top-4 left-4 z-10 ${
                showFeedbackPanel 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'text-white hover:bg-white/20'
              }`}
              onClick={() => setShowFeedbackPanel(!showFeedbackPanel)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {showFeedbackPanel ? 'Hide Feedback' : 'Give Feedback'}
            </Button>
          )}

          {/* Image container */}
          <div className={`flex-1 flex items-center justify-center p-4 transition-all duration-300 ${
            showFeedbackPanel ? 'pr-[380px]' : ''
          }`}>
            <div className="relative max-w-5xl w-full aspect-video">
              <Image
                src={selectedPhoto}
                alt="Full size photo"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Feedback Panel (slide-in from right) */}
          <div 
            className={`absolute top-0 right-0 h-full w-[360px] bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
              showFeedbackPanel ? 'translate-x-0' : 'translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              {/* Panel Header */}
              <div className="p-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-orange-900">
                    <MessageSquare className="h-5 w-5" />
                    Feedback
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowFeedbackPanel(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {submission && (
                  <p className="text-sm text-orange-700 mt-1">
                    For: {submission.productName}
                  </p>
                )}
              </div>

              {/* Previous Feedback */}
              <div className="flex-1 overflow-y-auto p-4">
                {feedbackLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : feedback.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Previous Feedback ({feedback.length})
                    </p>
                    {feedback.map((fb) => (
                      <div 
                        key={fb.id} 
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                            {fb.feedbackByName.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium">{fb.feedbackByName}</p>
                            <p className="text-[10px] text-gray-500">{formatRelativeTime(fb.createdAt)}</p>
                          </div>
                          {fb.isRead && (
                            <CheckCheck className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{fb.feedbackText}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No feedback yet</p>
                    <p className="text-xs mt-1">Be the first to provide feedback</p>
                  </div>
                )}
              </div>

              {/* New Feedback Input */}
              <div className="p-4 border-t bg-gray-50">
                {feedbackSuccess && (
                  <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Feedback sent to {submission?.submitterName}!
                  </div>
                )}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-600">
                    Send feedback to {submission?.submitterName}
                  </p>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Share improvement suggestions..."
                    className="w-full p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    rows={3}
                    maxLength={2000}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {feedbackText.length}/2000
                    </span>
                    <Button
                      onClick={handleSendFeedback}
                      disabled={!feedbackText.trim() || sendingFeedback}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {sendingFeedback ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Feedback
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Like Modal */}
      {showLikeModal && submission && (
        <LikeModal
          submissionId={submissionId}
          submitterName={submission.submitterName}
          productName={submission.productName}
          onClose={() => setShowLikeModal(false)}
          onLikeAdded={handleLikeAdded}
        />
      )}
    </div>
  )
}
