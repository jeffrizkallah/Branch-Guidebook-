'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  Flame,
  Snowflake,
  CakeSlice,
  Beef,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  TrendingDown,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import type { ProductionSchedule, ProductionItem } from '@/lib/data'

interface ProductionActivity {
  id: string
  timestamp: string
  activityType: 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'QUANTITY_ADJUSTED' | 'RESCHEDULED' | 'INGREDIENT_ALERT'
  recipeName: string
  station?: string
  performedByName?: string
  details: {
    oldQuantity?: number
    newQuantity?: number
    reason?: string
    oldDate?: string
    newDate?: string
    quantity?: number
    unit?: string
  }
}

interface StationProgress {
  total: number
  completed: number
  inProgress: number
  notStarted: number
  status: 'on-track' | 'pending' | 'delayed'
}

const stationConfig = {
  'Hot Section': {
    icon: Flame,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    progressColor: 'bg-red-500',
  },
  'Cold Section': {
    icon: Snowflake,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    progressColor: 'bg-blue-500',
  },
  'Butchery': {
    icon: Beef,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    progressColor: 'bg-rose-500',
  },
  'Desserts': {
    icon: CakeSlice,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    progressColor: 'bg-amber-500',
  },
}

export function ProductionMonitorWidget() {
  const [schedule, setSchedule] = useState<ProductionSchedule | null>(null)
  const [activities, setActivities] = useState<ProductionActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [issuesExpanded, setIssuesExpanded] = useState(false)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/production-schedules')
      const schedules: ProductionSchedule[] = await response.json()

      // Get today's schedule
      const today = new Date()
      const currentSchedule = schedules.find(s => {
        const start = new Date(s.weekStart)
        const end = new Date(s.weekEnd)
        return today >= start && today <= end
      }) || schedules[0]

      if (currentSchedule) {
        setSchedule(currentSchedule)
        generateActivities(currentSchedule)
      }
    } catch (error) {
      console.error('Error fetching production data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const generateActivities = (schedule: ProductionSchedule) => {
    const activities: ProductionActivity[] = []
    const today = new Date().toISOString().split('T')[0]

    // Get all items from all days and extract activities
    schedule.days.forEach(day => {
      day.items.forEach(item => {
        // Completed items
        if (item.completedAt) {
          activities.push({
            id: `complete-${item.itemId}`,
            timestamp: item.completedAt,
            activityType: 'COMPLETED',
            recipeName: item.recipeName,
            station: item.assignedTo ?? undefined,
            performedByName: 'Station Team',
            details: {
              quantity: item.actualQuantity || item.quantity,
              unit: item.actualUnit || item.unit,
            },
          })
        }

        // Started items
        if (item.startedAt && !item.completedAt) {
          activities.push({
            id: `start-${item.itemId}`,
            timestamp: item.startedAt,
            activityType: 'STARTED',
            recipeName: item.recipeName,
            station: item.assignedTo ?? undefined,
            performedByName: item.assignedBy || 'Head Chef',
            details: {
              quantity: item.quantity,
              unit: item.unit,
            },
          })
        }

        // Assigned items (not started)
        if (item.assignedAt && !item.startedAt) {
          activities.push({
            id: `assign-${item.itemId}`,
            timestamp: item.assignedAt,
            activityType: 'ASSIGNED',
            recipeName: item.recipeName,
            station: item.assignedTo ?? undefined,
            performedByName: item.assignedBy || 'Head Chef',
            details: {
              quantity: item.quantity,
              unit: item.unit,
            },
          })
        }

        // Quantity adjustments
        if (item.adjustedAt) {
          activities.push({
            id: `adjust-${item.itemId}`,
            timestamp: item.adjustedAt,
            activityType: 'QUANTITY_ADJUSTED',
            recipeName: item.recipeName,
            station: item.station,
            performedByName: 'Head Chef',
            details: {
              oldQuantity: item.originalQuantity,
              newQuantity: item.adjustedQuantity,
              reason: item.adjustmentReason,
            },
          })
        }

        // Rescheduled items
        if (item.rescheduledAt) {
          activities.push({
            id: `reschedule-${item.itemId}`,
            timestamp: item.rescheduledAt,
            activityType: 'RESCHEDULED',
            recipeName: item.recipeName,
            station: item.station,
            performedByName: 'Head Chef',
            details: {
              oldDate: item.originalScheduledDate,
              newDate: item.rescheduledDate,
              reason: item.rescheduleReason,
            },
          })
        }
      })
    })

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setActivities(activities)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
  }

  const getTodayStats = () => {
    if (!schedule) return { total: 0, completed: 0, inProgress: 0, notStarted: 0, issues: 0 }

    const today = new Date().toISOString().split('T')[0]
    const todayDay = schedule.days.find(d => d.date === today)
    
    if (!todayDay) return { total: 0, completed: 0, inProgress: 0, notStarted: 0, issues: 0 }

    const items = todayDay.items
    const completed = items.filter(i => i.completed || i.completedAt).length
    const inProgress = items.filter(i => i.startedAt && !i.completed && !i.completedAt).length
    const notStarted = items.filter(i => !i.startedAt && !i.completed).length
    const issues = items.filter(i => i.adjustedAt || i.rescheduledAt).length

    return {
      total: items.length,
      completed,
      inProgress,
      notStarted,
      issues,
    }
  }

  const getStationProgress = (): Record<string, StationProgress> => {
    if (!schedule) return {}

    const today = new Date().toISOString().split('T')[0]
    const todayDay = schedule.days.find(d => d.date === today)
    
    if (!todayDay) return {}

    const stationProgress: Record<string, StationProgress> = {}

    Object.keys(stationConfig).forEach(station => {
      const items = todayDay.items.filter(i => i.assignedTo === station)
      const completed = items.filter(i => i.completed || i.completedAt).length
      const inProgress = items.filter(i => i.startedAt && !i.completed && !i.completedAt).length
      const notStarted = items.length - completed - inProgress

      let status: 'on-track' | 'pending' | 'delayed' = 'pending'
      if (items.length > 0) {
        const completionRate = completed / items.length
        if (completionRate >= 0.5) status = 'on-track'
        else if (inProgress > 0) status = 'on-track'
      }

      stationProgress[station] = {
        total: items.length,
        completed,
        inProgress,
        notStarted,
        status,
      }
    })

    return stationProgress
  }

  const getIssues = () => {
    if (!schedule) return []

    const issues: any[] = []
    const today = new Date().toISOString().split('T')[0]

    schedule.days.forEach(day => {
      day.items.forEach(item => {
        if (item.adjustedAt) {
          issues.push({
            type: 'QUANTITY_ADJUSTED',
            recipeName: item.recipeName,
            timestamp: item.adjustedAt,
            details: `Reduced from ${item.originalQuantity} to ${item.adjustedQuantity} ${item.unit} - ${item.adjustmentReason}`,
          })
        }
        if (item.rescheduledAt) {
          issues.push({
            type: 'RESCHEDULED',
            recipeName: item.recipeName,
            timestamp: item.rescheduledAt,
            details: `Moved to ${new Date(item.rescheduledDate || '').toLocaleDateString()} - ${item.rescheduleReason}`,
          })
        }
      })
    })

    return issues.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date().getTime()
    const then = new Date(timestamp).getTime()
    const diff = now - then
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'STARTED':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'ASSIGNED':
        return <User className="h-4 w-4 text-indigo-600" />
      case 'QUANTITY_ADJUSTED':
        return <TrendingDown className="h-4 w-4 text-amber-600" />
      case 'RESCHEDULED':
        return <Calendar className="h-4 w-4 text-orange-600" />
      case 'INGREDIENT_ALERT':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'COMPLETED':
        return 'bg-green-50 border-green-200'
      case 'STARTED':
        return 'bg-blue-50 border-blue-200'
      case 'ASSIGNED':
        return 'bg-indigo-50 border-indigo-200'
      case 'QUANTITY_ADJUSTED':
        return 'bg-amber-50 border-amber-200'
      case 'RESCHEDULED':
        return 'bg-orange-50 border-orange-200'
      case 'INGREDIENT_ALERT':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getActivityDescription = (activity: ProductionActivity) => {
    switch (activity.activityType) {
      case 'COMPLETED':
        return `${activity.recipeName} ${activity.details.quantity} ${activity.details.unit} completed at ${activity.station}`
      case 'STARTED':
        return `${activity.recipeName} production started at ${activity.station}`
      case 'ASSIGNED':
        return `${activity.recipeName} assigned to ${activity.station}`
      case 'QUANTITY_ADJUSTED':
        return `${activity.recipeName} quantity adjusted from ${activity.details.oldQuantity} to ${activity.details.newQuantity} (${activity.details.reason})`
      case 'RESCHEDULED':
        return `${activity.recipeName} rescheduled to ${new Date(activity.details.newDate || '').toLocaleDateString()} (${activity.details.reason})`
      default:
        return activity.recipeName
    }
  }

  const stats = getTodayStats()
  const stationProgress = getStationProgress()
  const issues = getIssues()
  const displayedActivities = showAllActivities ? activities : activities.slice(0, 5)
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  if (loading) {
    return (
      <Card className="border-2 border-blue-200">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <span>Central Kitchen Live Monitor</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-7"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Monitor production progress and activities in real-time
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Today's Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">📅 Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            {schedule && (
              <span className="text-xs text-muted-foreground">
                Week: {new Date(schedule.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(schedule.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Total Items</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
              <p className="text-[10px] text-green-600 mt-0.5">Completed</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
              <p className="text-[10px] text-blue-600 mt-0.5">In Progress</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-2xl font-bold text-gray-700">{stats.notStarted}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Not Started</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-2xl font-bold text-amber-700">{stats.issues}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">Issues</p>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Overall Progress</span>
              <span className="font-bold text-blue-700">{completionRate}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Station Overview */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Station Overview</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(stationProgress).map(([station, progress]) => {
              const config = stationConfig[station as keyof typeof stationConfig]
              const Icon = config?.icon || Activity
              const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

              return (
                <div
                  key={station}
                  className={`p-3 rounded-lg border ${config?.bgColor} ${config?.borderColor}`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className={`h-4 w-4 ${config?.color}`} />
                    <span className="text-xs font-medium truncate">{station}</span>
                  </div>
                  <p className="text-sm font-bold mb-1">
                    {progress.completed}/{progress.total} items
                  </p>
                  <div className="w-full bg-white/50 rounded-full h-1.5 mb-1">
                    <div
                      className={`${config?.progressColor} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {progress.status === 'on-track' && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-500 text-white border-green-600">
                        On track
                      </Badge>
                    )}
                    {progress.status === 'pending' && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 bg-gray-400 text-white border-gray-500">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Real-Time Activity Feed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">📊 Real-Time Activity Feed</h4>
            {activities.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllActivities(!showAllActivities)}
                className="h-7 text-xs"
              >
                {showAllActivities ? 'Show Less' : 'View All'}
                {showAllActivities ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            )}
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-dashed">
              <Clock className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-muted-foreground">No production activity yet today</p>
            </div>
          ) : (
            <ScrollArea className={showAllActivities ? 'h-[400px]' : 'h-auto'}>
              <div className="space-y-2">
                {displayedActivities.map(activity => (
                  <div
                    key={activity.id}
                    className={`p-3 rounded-lg border ${getActivityColor(activity.activityType)}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.activityType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">⏰ {getTimeAgo(activity.timestamp)}</span>
                        </div>
                        <p className="text-sm font-medium">{getActivityDescription(activity)}</p>
                        {activity.performedByName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            👤 {activity.performedByName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Issues & Alerts */}
        {issues.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setIssuesExpanded(!issuesExpanded)}
              className="w-full flex items-center justify-between p-3 bg-amber-50 border-2 border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold">Issues & Alerts</span>
                <Badge variant="destructive" className="text-xs">
                  {issues.length} active
                </Badge>
              </div>
              {issuesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {issuesExpanded && (
              <div className="space-y-2 pl-4">
                {issues.map((issue, idx) => (
                  <div key={idx} className="p-2 bg-white rounded border text-sm">
                    <div className="flex items-start gap-2">
                      {issue.type === 'QUANTITY_ADJUSTED' ? (
                        <TrendingDown className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Calendar className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-xs">{issue.recipeName}</p>
                        <p className="text-xs text-muted-foreground">{issue.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
