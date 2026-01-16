'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  CheckCheck,
  Clock,
  ChevronRight,
  Eye,
  User,
  MapPin,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackItem {
  id: number
  qualityCheckId: number
  feedbackText: string
  isRead: boolean
  readAt: string | null
  createdAt: string
  productName: string
  section: string
  branchSlug: string
  branchName: string
  mealService: string
  submissionDate: string
  submitterName: string
  submitterId: number
}

interface FeedbackStats {
  total: number
  acknowledged: number
  pending: number
}

interface FeedbackTrackingWidgetProps {
  onViewQualityCheck?: (qualityCheckId: number) => void
  className?: string
}

export function FeedbackTrackingWidget({ onViewQualityCheck, className }: FeedbackTrackingWidgetProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<FeedbackStats>({ total: 0, acknowledged: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchFeedback = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const response = await fetch('/api/quality-checks/my-feedback?limit=20')
      if (response.ok) {
        const data = await response.json()
        setFeedbacks(data.feedback || [])
        setStats(data.stats || { total: 0, acknowledged: 0, pending: 0 })
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchFeedback()
  }, [])

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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const displayedFeedbacks = showAll ? feedbacks : feedbacks.slice(0, 5)
  const acknowledgeRate = stats.total > 0 ? Math.round((stats.acknowledged / stats.total) * 100) : 0

  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            My Feedback Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            My Feedback Tracking
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchFeedback(true)}
            disabled={refreshing}
            className="h-8 px-2"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Sent</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.acknowledged}</p>
            <p className="text-xs text-green-600">Acknowledged</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-xs text-orange-600">Pending</p>
          </div>
        </div>

        {/* Acknowledge Rate */}
        {stats.total > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Acknowledgement Rate</span>
              <span className="font-medium">{acknowledgeRate}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${acknowledgeRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Feedback List */}
        {feedbacks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No feedback given yet</p>
            <p className="text-xs mt-1">Your feedback on quality checks will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Recent Feedback
            </p>
            {displayedFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm",
                  fb.isRead 
                    ? "bg-white border-slate-200 hover:border-slate-300" 
                    : "bg-orange-50/50 border-orange-200 hover:border-orange-300"
                )}
                onClick={() => onViewQualityCheck?.(fb.qualityCheckId)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {fb.productName}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {fb.section}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                      {fb.feedbackText}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {fb.submitterName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {fb.branchName}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {fb.isRead ? (
                      <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 border border-green-200">
                        <CheckCheck className="h-3 w-3 mr-0.5" />
                        Acknowledged
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0 border border-orange-200">
                        <Clock className="h-3 w-3 mr-0.5" />
                        Pending
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(fb.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {feedbacks.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-2 text-muted-foreground hover:text-foreground"
              >
                {showAll ? 'Show Less' : `Show All (${feedbacks.length})`}
                <ChevronRight className={cn(
                  "h-4 w-4 ml-1 transition-transform",
                  showAll && "rotate-90"
                )} />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
