'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThumbsUp, TrendingUp, Award, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface LikeAnalytics {
  totalLikes: number
  likedSubmissions: number
  totalSubmissions: number
  likeRate: number
  topPerformers: Array<{
    name: string
    likesCount: number
    submissionsCount: number
  }>
  topTags: Array<{
    tag: string
    count: number
  }>
  recentTrend: 'up' | 'down' | 'stable'
}

interface LikeAnalyticsWidgetProps {
  period?: string
}

export function LikeAnalyticsWidget({ period = 'month' }: LikeAnalyticsWidgetProps) {
  const [analytics, setAnalytics] = useState<LikeAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/quality-checks/likes-analytics?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching like analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-blue-600" />
            Recognition Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <ThumbsUp className="h-5 w-5 text-blue-600" />
          Recognition Analytics
          <Badge variant="outline" className="ml-auto text-xs">
            This {period === 'week' ? 'Week' : 'Month'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <ThumbsUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-900">Total Likes</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{analytics.totalLikes}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.likedSubmissions} submissions
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-900">Like Rate</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {analytics.likeRate.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              of all submissions
            </p>
          </div>
        </div>

        {/* Top Performers */}
        {analytics.topPerformers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-900">Top Performers</h4>
            </div>
            <div className="space-y-2">
              {analytics.topPerformers.slice(0, 5).map((performer, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {performer.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {performer.submissionsCount} submissions
                    </span>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      {performer.likesCount}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Recognition Tags */}
        {analytics.topTags.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-900">Popular Recognition Tags</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {analytics.topTags.map((tagData, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 border-blue-200"
                >
                  ✨ {tagData.tag} ({tagData.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Encouragement Message */}
        {analytics.likeRate < 20 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              💡 <strong>Tip:</strong> Recognizing great work boosts team morale! Try to like more excellent submissions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
