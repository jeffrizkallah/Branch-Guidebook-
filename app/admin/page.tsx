'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QualityCheckDetailModal } from '@/components/QualityCheckDetailModal'
import { 
  ChefHat, 
  Building2, 
  Truck, 
  ArrowRight,
  Bell,
  Flame,
  Factory,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock,
  Package,
  FileText,
  Activity,
  Sparkles,
  BarChart3,
  DollarSign,
  ShoppingCart,
  Users,
  MessageCircle,
  ClipboardCheck,
  Coffee,
  Sun,
  Settings2,
} from 'lucide-react'
import { Sparkline } from '@/components/Sparkline'
import { DispatchTimelineWidget } from '@/components/DispatchTimelineWidget'
import { cn } from '@/lib/utils'

interface Branch {
  id: string
  slug: string
  name: string
  location: string
  manager: string
  kpis: {
    hygieneScore: string
    wastePct: string
    salesTarget: string
  }
  branchType?: string
}

interface Recipe {
  recipeId: string
  name: string
  category: string
}

interface RecipeInstruction {
  instructionId: string
  dishName: string
  category: string
}

interface Dispatch {
  id: string
  deliveryDate: string
  branchDispatches: {
    branchSlug: string
    branchName: string
    status: 'pending' | 'packing' | 'dispatched' | 'receiving' | 'completed'
    items: Array<{
      packedChecked: boolean
      receivedChecked: boolean
    }>
    packingStartedAt: string | null
  }[]
}

interface Notification {
  id: string
  title: string
  type: string
  is_active: boolean
  expires_at: string
}

interface DashboardStats {
  branches: {
    total: number
    byLocation: Record<string, number>
    avgHygiene: number
    lowHygieneCount: number
    highWasteCount: number
  }
  recipes: {
    total: number
    byCategory: Record<string, number>
  }
  instructions: {
    total: number
  }
  dispatches: {
    total: number
    pending: number
    inProgress: number
    completed: number
  }
  notifications: {
    active: number
    expiringSoon: number
  }
  alerts: Alert[]
}

interface Alert {
  id: string
  type: 'warning' | 'info' | 'success'
  title: string
  description: string
  link?: string
}

interface SalesData {
  today: {
    revenue: number
    units: number
    orders: number
    changes: {
      revenue: number
      units: number
      orders: number
    }
  }
  thisMonth: {
    revenue: number
    units: number
    orders: number
    changes: {
      revenue: number
    }
  }
  error?: string
}

interface QualitySummary {
  totalSubmissions: number
  complianceRate: number
  todayCompliance: {
    branchSlug: string
    branchName: string
    breakfastSubmitted: boolean
    lunchSubmitted: boolean
    breakfastCount: number
    lunchCount: number
    totalSubmissions: number
  }[]
  lowScores: {
    id: number
    productName: string
    branchName: string
    tasteScore: number
    appearanceScore: number
  }[]
}

interface BranchHistoryData {
  branch: string
  history: { date: string; revenue: number; units: number; orders: number }[]
  totalRevenue: number
  totalOrders: number
  avgRevenue: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [qualitySummary, setQualitySummary] = useState<QualitySummary | null>(null)
  const [branchHistory, setBranchHistory] = useState<BranchHistoryData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null)

  useEffect(() => {
    fetchDashboardData()
    fetchSalesData()
    fetchQualitySummary()
    fetchBranchHistory()
  }, [])

  const fetchBranchHistory = async () => {
    try {
      const response = await fetch('/api/analytics/branches/history?days=8')
      if (response.ok) {
        const data = await response.json()
        setBranchHistory(data.branches || [])
      }
    } catch (error) {
      console.error('Failed to fetch branch history:', error)
    }
  }

  const fetchQualitySummary = async () => {
    try {
      const response = await fetch('/api/quality-checks/summary?period=today')
      if (response.ok) {
        const data = await response.json()
        setQualitySummary(data)
      }
    } catch (error) {
      console.error('Failed to fetch quality summary:', error)
    }
  }

  const fetchSalesData = async () => {
    try {
      const response = await fetch('/api/analytics/summary')
      if (response.ok) {
        const data = await response.json()
        console.log('Sales data received:', data)
        // Check if error field exists in response
        if (data.error) {
          setSalesData({
            ...data,
            error: 'database_error'
          })
        } else {
          setSalesData(data)
        }
      } else {
        console.error('Failed to fetch sales data - HTTP', response.status)
        const errorText = await response.text()
        console.error('Error details:', errorText)
        // Set error state
        setSalesData({
          today: {
            revenue: 0,
            units: 0,
            orders: 0,
            changes: { revenue: 0, units: 0, orders: 0 }
          },
          thisMonth: {
            revenue: 0,
            units: 0,
            orders: 0,
            changes: { revenue: 0 }
          },
          error: 'api_error'
        })
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error)
      // Network or other error
      setSalesData({
        today: {
          revenue: 0,
          units: 0,
          orders: 0,
          changes: { revenue: 0, units: 0, orders: 0 }
        },
        thisMonth: {
          revenue: 0,
          units: 0,
          orders: 0,
          changes: { revenue: 0 }
        },
        error: 'network_error'
      })
    }
  }

  const fetchDashboardData = async () => {
    try {
      const [branchesRes, recipesRes, instructionsRes, dispatchesRes, notificationsRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/recipes'),
        fetch('/api/recipe-instructions'),
        fetch('/api/dispatch'),
        fetch('/api/notifications/admin').catch(() => ({ ok: false, json: () => Promise.resolve({ notifications: [] }) }))
      ])

      const branchesData: Branch[] = await branchesRes.json()
      const recipesData: Recipe[] = await recipesRes.json()
      const instructionsData: RecipeInstruction[] = await instructionsRes.json()
      const dispatchesData: Dispatch[] = dispatchesRes.ok ? await dispatchesRes.json() : []
      const notificationsData = notificationsRes.ok ? await (notificationsRes as Response).json() : { notifications: [] }

      setBranches(branchesData)
      setDispatches(dispatchesData)

      // Calculate stats
      const serviceBranches = branchesData.filter(b => b.branchType !== 'production')
      const hygieneScores = serviceBranches
        .map(b => parseInt(b.kpis.hygieneScore))
        .filter(score => !isNaN(score))
      
      const avgHygiene = hygieneScores.length > 0 
        ? Math.round(hygieneScores.reduce((a, b) => a + b, 0) / hygieneScores.length * 10) / 10
        : 0

      const lowHygieneCount = serviceBranches.filter(b => {
        const score = parseInt(b.kpis.hygieneScore)
        return !isNaN(score) && score < 92
      }).length

      const highWasteCount = serviceBranches.filter(b => {
        const waste = parseFloat(b.kpis.wastePct?.replace('%', ''))
        return !isNaN(waste) && waste > 3
      }).length

      // Location breakdown
      const byLocation: Record<string, number> = {}
      serviceBranches.forEach(b => {
        byLocation[b.location] = (byLocation[b.location] || 0) + 1
      })

      // Recipe categories
      const byCategory: Record<string, number> = {}
      recipesData.forEach(r => {
        byCategory[r.category] = (byCategory[r.category] || 0) + 1
      })

      // Dispatch stats
      const allBranchDispatches = dispatchesData.flatMap(d => d.branchDispatches)
      const dispatchStats = {
        total: allBranchDispatches.length,
        pending: allBranchDispatches.filter(bd => bd.status === 'pending').length,
        inProgress: allBranchDispatches.filter(bd => ['packing', 'dispatched', 'receiving'].includes(bd.status)).length,
        completed: allBranchDispatches.filter(bd => bd.status === 'completed').length,
      }

      // Notifications
      const notifications: Notification[] = notificationsData.notifications || []
      const activeNotifications = notifications.filter(n => n.is_active)
      const now = new Date()
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      const expiringSoon = activeNotifications.filter(n => {
        const expiresAt = new Date(n.expires_at)
        return expiresAt <= threeDaysFromNow && expiresAt > now
      }).length

      // Build alerts
      const alerts: Alert[] = []
      
      // Low hygiene alerts
      serviceBranches.forEach(b => {
        const score = parseInt(b.kpis.hygieneScore)
        if (!isNaN(score) && score < 92) {
          alerts.push({
            id: `hygiene-${b.slug}`,
            type: 'warning',
            title: `${b.name} - Low Hygiene Score`,
            description: `Hygiene score is ${score}, below the 92 threshold`,
            link: `/admin/branches/${b.slug}`
          })
        }
      })

      // High waste alerts
      serviceBranches.forEach(b => {
        const waste = parseFloat(b.kpis.wastePct?.replace('%', ''))
        if (!isNaN(waste) && waste > 3.5) {
          alerts.push({
            id: `waste-${b.slug}`,
            type: 'warning',
            title: `${b.name} - High Waste`,
            description: `Waste at ${b.kpis.wastePct}, above target threshold`,
            link: `/admin/branches/${b.slug}`
          })
        }
      })

      // Pending dispatches
      if (dispatchStats.pending > 0) {
        alerts.push({
          id: 'pending-dispatch',
          type: 'info',
          title: `${dispatchStats.pending} Pending Dispatches`,
          description: 'Dispatches waiting to be packed',
          link: '/dispatch'
        })
      }

      setStats({
        branches: {
          total: serviceBranches.length,
          byLocation,
          avgHygiene,
          lowHygieneCount,
          highWasteCount
        },
        recipes: {
          total: recipesData.length,
          byCategory
        },
        instructions: {
          total: instructionsData.length
        },
        dispatches: dispatchStats,
        notifications: {
          active: activeNotifications.length,
          expiringSoon
        },
        alerts
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get branches sorted by hygiene score for the health panel
  const sortedBranches = useMemo(() => {
    return [...branches]
      .filter(b => b.branchType !== 'production')
      .sort((a, b) => {
        const scoreA = parseInt(a.kpis.hygieneScore) || 0
        const scoreB = parseInt(b.kpis.hygieneScore) || 0
        return scoreA - scoreB
      })
  }, [branches])

  const getHygieneColor = (score: number) => {
    if (score >= 95) return 'bg-emerald-500'
    if (score >= 92) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getHygieneBgColor = (score: number) => {
    if (score >= 95) return 'bg-emerald-50 border-emerald-200'
    if (score >= 92) return 'bg-amber-50 border-amber-200'
    return 'bg-red-50 border-red-200'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 xs:space-y-6 max-w-7xl mx-auto px-0.5 xs:px-0">
      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 xs:gap-3">
        <div className="space-y-0.5 xs:space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 xs:p-2 rounded-lg xs:rounded-xl bg-primary/10">
              <Activity className="h-4 w-4 xs:h-5 xs:w-5 text-primary" />
            </div>
            <h1 className="text-lg xs:text-xl sm:text-2xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <p className="text-xs xs:text-sm text-muted-foreground">
            Monitor and manage your Mikana operations
          </p>
        </div>
        <div className="flex items-center gap-1.5 xs:gap-2 text-[10px] xs:text-xs sm:text-sm text-muted-foreground">
          <Clock className="h-3 w-3 xs:h-4 xs:w-4" />
          <span>Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Overview - Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 xs:gap-3" data-tour-id="admin-stats">
        {/* Branches Stat */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: 'forwards' }}>
          <CardContent className="pt-3 xs:pt-4 px-3 xs:px-4">
            <div className="flex items-start justify-between gap-1.5 xs:gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] xs:text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">Total Branches</p>
                <p className="text-lg xs:text-xl md:text-2xl font-bold text-foreground mt-0.5">{stats?.branches.total || 0}</p>
                <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">
                  {Object.keys(stats?.branches.byLocation || {}).length} locations
                </p>
              </div>
              <div className="p-1.5 xs:p-2 rounded-lg bg-cyan-500/10 text-cyan-600 shrink-0">
                <Building2 className="h-3.5 w-3.5 xs:h-4 xs:w-4 md:h-5 md:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipes Stat */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: 'forwards' }}>
          <CardContent className="pt-3 xs:pt-4 px-3 xs:px-4">
            <div className="flex items-start justify-between gap-1.5 xs:gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] xs:text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">CK Recipes</p>
                <p className="text-lg xs:text-xl md:text-2xl font-bold text-foreground mt-0.5">{stats?.recipes.total || 0}</p>
                <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">
                  {Object.keys(stats?.recipes.byCategory || {}).length} categories
                </p>
              </div>
              <div className="p-1.5 xs:p-2 rounded-lg bg-teal-500/10 text-teal-600 shrink-0">
                <ChefHat className="h-3.5 w-3.5 xs:h-4 xs:w-4 md:h-5 md:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dispatches Stat */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-slide-up opacity-0 stagger-3" style={{ animationFillMode: 'forwards' }}>
          <CardContent className="pt-3 xs:pt-4 px-3 xs:px-4">
            <div className="flex items-start justify-between gap-1.5 xs:gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] xs:text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">Dispatches</p>
                <p className="text-lg xs:text-xl md:text-2xl font-bold text-foreground mt-0.5">{stats?.dispatches.total || 0}</p>
                <div className="flex flex-wrap items-center gap-0.5 mt-0.5">
                  {(stats?.dispatches.pending || 0) > 0 && (
                    <Badge variant="secondary" className="text-[7px] xs:text-[8px] px-0.5 xs:px-1 py-0 leading-tight">
                      {stats?.dispatches.pending} pend
                    </Badge>
                  )}
                  {(stats?.dispatches.inProgress || 0) > 0 && (
                    <Badge variant="outline" className="text-[7px] xs:text-[8px] px-0.5 xs:px-1 py-0 leading-tight">
                      {stats?.dispatches.inProgress} active
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-1.5 xs:p-2 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                <Truck className="h-3.5 w-3.5 xs:h-4 xs:w-4 md:h-5 md:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hygiene Avg Stat */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-slide-up opacity-0 stagger-4" style={{ animationFillMode: 'forwards' }}>
          <CardContent className="pt-3 xs:pt-4 px-3 xs:px-4">
            <div className="flex items-start justify-between gap-1.5 xs:gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] xs:text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">Avg. Hygiene</p>
                <p className="text-lg xs:text-xl md:text-2xl font-bold text-foreground mt-0.5">{stats?.branches.avgHygiene || 0}</p>
                <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">
                  {stats?.branches.lowHygieneCount || 0} below threshold
                </p>
              </div>
              <div className="p-1.5 xs:p-2 rounded-lg bg-green-500/10 text-green-600 shrink-0">
                <TrendingUp className="h-3.5 w-3.5 xs:h-4 xs:w-4 md:h-5 md:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Snapshot */}
      <Card className="border-l-4 border-l-emerald-500 animate-slide-up opacity-0 stagger-5" style={{ animationFillMode: 'forwards' }}>
        <CardHeader className="pb-2 xs:pb-3 px-3 xs:px-6 pt-3 xs:pt-6">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 xs:space-y-1 min-w-0 flex-1">
              <CardTitle className="text-sm xs:text-base flex items-center gap-1.5 xs:gap-2">
                <BarChart3 className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-emerald-600 shrink-0" />
                <span className="truncate">Sales Snapshot</span>
              </CardTitle>
              <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-muted-foreground leading-tight">
                Yesterday&apos;s data • Synced daily 12:00 AM
              </p>
            </div>
            <Link href="/admin/analytics" className="shrink-0">
              <Button variant="ghost" size="sm" className="text-[10px] xs:text-xs gap-1 h-6 xs:h-7 px-2 xs:px-3">
                <span className="hidden xs:inline">View Analytics</span>
                <span className="xs:hidden">View</span>
                <ArrowRight className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-3 xs:px-6 pb-3 xs:pb-6">
          {salesData && !salesData.error ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xs:gap-4">
              {/* Yesterday's Revenue */}
              <div className="space-y-0.5 xs:space-y-1">
                <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground leading-tight">Yesterday&apos;s Revenue</p>
                <p className="text-base xs:text-lg sm:text-xl font-bold text-foreground leading-tight">
                  {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(salesData.today.revenue)}
                </p>
                <div className={`flex items-center gap-0.5 xs:gap-1 text-[8px] xs:text-[9px] sm:text-xs font-medium ${salesData.today.changes.revenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {salesData.today.changes.revenue >= 0 ? <TrendingUp className="h-2.5 w-2.5 xs:h-3 xs:w-3" /> : <TrendingDown className="h-2.5 w-2.5 xs:h-3 xs:w-3" />}
                  <span className="leading-tight">{salesData.today.changes.revenue >= 0 ? '+' : ''}{salesData.today.changes.revenue}% vs prev</span>
                </div>
              </div>

              {/* This Month Revenue */}
              <div className="space-y-0.5 xs:space-y-1">
                <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground leading-tight">This Month</p>
                <p className="text-base xs:text-lg sm:text-xl font-bold text-foreground leading-tight">
                  {salesData.thisMonth.revenue >= 1000000
                    ? `AED ${(salesData.thisMonth.revenue / 1000000).toFixed(1)}M`
                    : salesData.thisMonth.revenue >= 1000
                    ? `AED ${(salesData.thisMonth.revenue / 1000).toFixed(0)}K`
                    : new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(salesData.thisMonth.revenue)
                  }
                </p>
                <div className={`flex items-center gap-0.5 xs:gap-1 text-[8px] xs:text-[9px] sm:text-xs font-medium ${salesData.thisMonth.changes.revenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {salesData.thisMonth.changes.revenue >= 0 ? <TrendingUp className="h-2.5 w-2.5 xs:h-3 xs:w-3" /> : <TrendingDown className="h-2.5 w-2.5 xs:h-3 xs:w-3" />}
                  <span className="leading-tight">{salesData.thisMonth.changes.revenue >= 0 ? '+' : ''}{salesData.thisMonth.changes.revenue}% vs prev</span>
                </div>
              </div>

              {/* Yesterday's Units */}
              <div className="space-y-0.5 xs:space-y-1">
                <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground leading-tight">Units Yesterday</p>
                <p className="text-base xs:text-lg sm:text-xl font-bold text-foreground leading-tight">
                  {new Intl.NumberFormat('en-AE').format(salesData.today.units)}
                </p>
                <div className={`flex items-center gap-0.5 xs:gap-1 text-[8px] xs:text-[9px] sm:text-xs font-medium ${salesData.today.changes.units >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {salesData.today.changes.units >= 0 ? <TrendingUp className="h-2.5 w-2.5 xs:h-3 xs:w-3" /> : <TrendingDown className="h-2.5 w-2.5 xs:h-3 xs:w-3" />}
                  <span className="leading-tight">{salesData.today.changes.units >= 0 ? '+' : ''}{salesData.today.changes.units}% vs prev</span>
                </div>
              </div>

              {/* Yesterday's Orders */}
              <div className="space-y-0.5 xs:space-y-1">
                <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground leading-tight">Orders Yesterday</p>
                <p className="text-base xs:text-lg sm:text-xl font-bold text-foreground leading-tight">
                  {new Intl.NumberFormat('en-AE').format(salesData.today.orders)}
                </p>
                <div className={`flex items-center gap-0.5 xs:gap-1 text-[8px] xs:text-[9px] sm:text-xs font-medium ${salesData.today.changes.orders >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {salesData.today.changes.orders >= 0 ? <TrendingUp className="h-2.5 w-2.5 xs:h-3 xs:w-3" /> : <TrendingDown className="h-2.5 w-2.5 xs:h-3 xs:w-3" />}
                  <span className="leading-tight">{salesData.today.changes.orders >= 0 ? '+' : ''}{salesData.today.changes.orders}% vs prev</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {salesData?.error === 'database_error' ? 'Database Connection Error' :
                 salesData?.error === 'api_error' ? 'API Error' :
                 salesData?.error === 'network_error' ? 'Network Error' :
                 'Sales Analytics Not Configured'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                {salesData?.error === 'database_error' ? 
                  'Cannot connect to the sales database. Please check your database credentials in .env.local file.' :
                 salesData?.error === 'api_error' ? 
                  'The analytics API returned an error. Please check the server logs for details.' :
                 salesData?.error === 'network_error' ? 
                  'Could not reach the analytics API. Please check your network connection.' :
                 'To display sales data, you need to configure your database connection and sync sales data from Odoo.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs gap-2"
                  onClick={() => {
                    // Open setup guide in new tab
                    window.open('/SALES_ANALYTICS_SETUP.md', '_blank')
                  }}
                >
                  <FileText className="h-3 w-3" />
                  View Setup Guide
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="text-xs gap-2"
                  onClick={() => fetchSalesData()}
                >
                  <Activity className="h-3 w-3" />
                  Retry Connection
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yesterday's Branch Performance & Dispatch Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 xs:gap-4 lg:items-stretch">
        {/* Yesterday's Branch Performance Widget - Takes 2 columns */}
        {branchHistory.length > 0 && (
          <Card className="lg:col-span-2 border-l-4 border-l-emerald-500 animate-slide-up opacity-0 stagger-6 flex flex-col" style={{ animationFillMode: 'forwards' }}>
            <CardHeader className="pb-2 xs:pb-3 px-3 xs:px-6 pt-3 xs:pt-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm xs:text-base flex items-center gap-1.5 xs:gap-2 min-w-0 flex-1">
                  <BarChart3 className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Yesterday&apos;s Branch Performance</span>
                </CardTitle>
                <Link href="/admin/analytics" className="shrink-0">
                  <Button variant="ghost" size="sm" className="text-[10px] xs:text-xs gap-1 h-6 xs:h-7 px-2 xs:px-3">
                    <span className="hidden sm:inline">View Full Analytics</span>
                    <span className="sm:hidden">View</span>
                    <ArrowRight className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-3 xs:px-6 pb-3 xs:pb-6 flex-1 flex flex-col">
              <div className="space-y-2 xs:space-y-3 flex-1">
                {branchHistory.slice(0, 6).map((branch, idx) => {
                // Get yesterday's data (last item in history)
                const yesterdayData = branch.history[branch.history.length - 1]
                const yesterdayRevenue = yesterdayData?.revenue || 0
                const yesterdayOrders = yesterdayData?.orders || 1
                const aov = yesterdayOrders > 0 ? Math.round(yesterdayRevenue / yesterdayOrders) : 0

                // Calculate week-over-week comparison
                // Find the exact date from 7 days ago to compare with yesterday
                const yesterdayDate = yesterdayData?.date ? new Date(yesterdayData.date) : null
                let lastWeekData = null
                let lastWeekRevenue = 0
                
                if (yesterdayDate) {
                  // Calculate the date exactly 7 days before yesterday
                  const lastWeekDate = new Date(yesterdayDate)
                  lastWeekDate.setDate(lastWeekDate.getDate() - 7)
                  const lastWeekDateStr = lastWeekDate.toISOString().split('T')[0]
                  
                  // Find that specific date in history
                  lastWeekData = branch.history.find(h => {
                    const historyDateStr = typeof h.date === 'string' 
                      ? h.date.split('T')[0] 
                      : new Date(h.date).toISOString().split('T')[0]
                    return historyDateStr === lastWeekDateStr
                  })
                  lastWeekRevenue = lastWeekData?.revenue || 0
                }

                let weekOverWeekChange = 0
                let weekOverWeekAmount = 0
                let hasValidComparison = false

                if (lastWeekRevenue > 0 && yesterdayRevenue > 0) {
                  weekOverWeekChange = Math.round(((yesterdayRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
                  weekOverWeekAmount = yesterdayRevenue - lastWeekRevenue
                  hasValidComparison = true
                }

                // Calculate trend from history
                const revenues = branch.history.map(h => h.revenue)
                const firstHalf = revenues.slice(0, Math.floor(revenues.length / 2))
                const secondHalf = revenues.slice(Math.floor(revenues.length / 2))
                const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0
                const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0
                const trendPct = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0
                
                // Determine status
                let status: 'top' | 'rising' | 'steady' | 'declining' | 'attention'
                let statusLabel: string
                let statusColor: string
                
                if (idx === 0) {
                  status = 'top'
                  statusLabel = 'Top Performer'
                  statusColor = 'text-amber-600 bg-amber-50'
                } else if (trendPct >= 10) {
                  status = 'rising'
                  statusLabel = 'Rising'
                  statusColor = 'text-green-600 bg-green-50'
                } else if (trendPct <= -10) {
                  if (trendPct <= -20) {
                    status = 'attention'
                    statusLabel = 'Needs Attention'
                    statusColor = 'text-red-600 bg-red-50'
                  } else {
                    status = 'declining'
                    statusLabel = 'Declining'
                    statusColor = 'text-orange-600 bg-orange-50'
                  }
                } else {
                  status = 'steady'
                  statusLabel = 'Steady'
                  statusColor = 'text-slate-600 bg-slate-50'
                }

                const formatCurrency = (value: number) => {
                  return new Intl.NumberFormat('en-AE', {
                    style: 'currency',
                    currency: 'AED',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(value)
                }
                
                return (
                  <div key={branch.branch} className="flex items-center gap-2 xs:gap-3 py-1">
                    {/* Rank */}
                    <span className={cn(
                      "w-5 h-5 xs:w-6 xs:h-6 rounded-full flex items-center justify-center text-[10px] xs:text-xs font-bold shrink-0",
                      idx === 0 ? "bg-yellow-100 text-yellow-700" :
                      idx === 1 ? "bg-gray-100 text-gray-600" :
                      idx === 2 ? "bg-amber-100 text-amber-700" :
                      "bg-slate-50 text-slate-500"
                    )}>
                      {idx + 1}
                    </span>

                    {/* Branch name and status */}
                    <div className="flex-1 min-w-0">
                      {/* Mobile: show only last part of branch name */}
                      <span className="text-xs xs:text-sm font-medium block truncate sm:hidden">
                        {branch.branch.replace(/_/g, ' ').split(' ').pop()}
                      </span>
                      {/* Desktop: show full branch name */}
                      <span className="text-xs xs:text-sm font-medium hidden sm:block truncate">
                        {branch.branch.replace(/_/g, ' ')}
                      </span>
                      <span className={cn(
                        "text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 xs:gap-1 mt-0.5",
                        statusColor
                      )}>
                        {status === 'top' && '⭐'}
                        {status === 'rising' && '▲'}
                        {status === 'declining' && '▼'}
                        {status === 'attention' && '⚠'}
                        {status === 'steady' && '━'}
                        <span className="leading-tight">{statusLabel}</span>
                      </span>
                    </div>

                    {/* Week-over-Week Comparison - Hidden on mobile/tablet */}
                    <div className="hidden lg:flex flex-col items-center justify-center shrink-0 px-4 border-l border-r border-slate-100 min-w-[100px]">
                      {hasValidComparison ? (
                        <>
                          <div className={cn(
                            "text-sm font-bold flex items-center gap-1",
                            weekOverWeekChange > 0 ? "text-emerald-600" :
                            weekOverWeekChange < 0 ? "text-red-600" :
                            "text-slate-600"
                          )}>
                            {weekOverWeekChange > 0 && <TrendingUp className="h-3.5 w-3.5" />}
                            {weekOverWeekChange < 0 && <TrendingDown className="h-3.5 w-3.5" />}
                            {weekOverWeekChange > 0 ? '+' : ''}{weekOverWeekChange}%
                          </div>
                          <div className="text-[10px] text-muted-foreground text-center whitespace-nowrap">vs last week</div>
                          <div className={cn(
                            "text-[10px] font-medium mt-0.5",
                            weekOverWeekChange > 0 ? "text-emerald-600" :
                            weekOverWeekChange < 0 ? "text-red-600" :
                            "text-slate-600"
                          )}>
                            {weekOverWeekChange > 0 ? '+' : ''}{formatCurrency(weekOverWeekAmount)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-medium text-slate-400">—</div>
                          <div className="text-[10px] text-muted-foreground text-center">No data</div>
                        </>
                      )}
                    </div>

                    {/* Sparkline - weekday bar chart */}
                    <div className="shrink-0 hidden xs:block">
                      <Sparkline
                        data={revenues}
                        dates={branch.history.map(h => h.date)}
                        width={110}
                        height={44}
                        showDayLabels={true}
                        excludeWeekends={true}
                        trend={
                          status === 'top' || status === 'rising' ? 'up' :
                          status === 'declining' || status === 'attention' ? 'down' :
                          'neutral'
                        }
                      />
                    </div>

                    {/* Revenue and AOV */}
                    <div className="text-right shrink-0 min-w-[70px] xs:min-w-[85px]">
                      <p className="text-xs xs:text-sm font-bold leading-tight">{formatCurrency(yesterdayRevenue)}</p>
                      <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-muted-foreground leading-tight mt-0.5">
                        AOV {formatCurrency(aov)}
                      </p>
                    </div>
                  </div>
                )
              })}
              {branchHistory.length > 6 && (
                <Link href="/admin/analytics" className="block text-center text-sm text-primary hover:underline pt-2">
                  View all {branchHistory.length} branches
                </Link>
              )}
              
              {/* Color Legend */}
              <div className="flex items-center justify-center gap-4 pt-4 mt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></div>
                  <span className="text-[10px] text-muted-foreground">Rising</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-blue-400"></div>
                  <span className="text-[10px] text-muted-foreground">Steady</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-400"></div>
                  <span className="text-[10px] text-muted-foreground">Declining</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-slate-200"></div>
                  <span className="text-[10px] text-muted-foreground">No data</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Dispatch Widget - Takes 1 column */}
        <DispatchTimelineWidget 
          dispatches={dispatches}
          className="animate-slide-up opacity-0 stagger-6"
          maxBranches={12}
        />
      </div>

      {/* Quality Control Widget */}
      {qualitySummary && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-green-600" />
                Quality Control Today
              </CardTitle>
              <div className="flex items-center gap-2">
                <Link href="/admin/quality-control/fields">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                    <Settings2 className="h-3 w-3" />
                    Fields
                  </Button>
                </Link>
                <Link href="/admin/quality-control">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                    View All
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{qualitySummary.totalSubmissions}</p>
                <p className="text-xs text-green-600">Submissions</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{qualitySummary.complianceRate}%</p>
                <p className="text-xs text-blue-600">Compliance</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700">
                  {qualitySummary.todayCompliance.filter(b => b.breakfastSubmitted || b.lunchSubmitted).length}
                </p>
                <p className="text-xs text-emerald-600">Branches Done</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-700">
                  {qualitySummary.todayCompliance.filter(b => !b.breakfastSubmitted && !b.lunchSubmitted).length}
                </p>
                <p className="text-xs text-amber-600">Pending</p>
              </div>
            </div>

            {/* Branch compliance grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {qualitySummary.todayCompliance.slice(0, 12).map((branch) => (
                <div 
                  key={branch.branchSlug}
                  className={`
                    flex flex-col p-2 rounded-lg text-xs
                    ${branch.breakfastSubmitted && branch.lunchSubmitted
                      ? 'bg-green-50 border border-green-200'
                      : branch.breakfastSubmitted || branch.lunchSubmitted
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-amber-50 border border-amber-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate flex-1">{branch.branchName}</span>
                    {branch.totalSubmissions > 0 && (
                      <span className="text-xs font-bold text-primary ml-1">
                        {branch.totalSubmissions}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded ${branch.breakfastSubmitted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      <Coffee className="h-3 w-3" />
                      {branch.breakfastSubmitted && <span className="text-[10px]">{branch.breakfastCount}</span>}
                    </div>
                    <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded ${branch.lunchSubmitted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      <Sun className="h-3 w-3" />
                      {branch.lunchSubmitted && <span className="text-[10px]">{branch.lunchCount}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Low scores alert */}
            {qualitySummary.lowScores.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-700 flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Low Score Alerts ({qualitySummary.lowScores.length})
                </p>
                <div className="space-y-1">
                  {qualitySummary.lowScores.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedSubmissionId(item.id)}
                      className="w-full text-left text-xs text-red-600 hover:text-red-800 hover:bg-red-100 p-1 rounded transition-colors"
                    >
                      {item.productName} at {item.branchName} - Taste: {item.tasteScore}/5, Look: {item.appearanceScore}/5
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Management Cards */}
      <div className="space-y-2 xs:space-y-3" data-tour-id="admin-quick-actions">
        <h2 className="text-sm xs:text-base font-semibold flex items-center gap-1.5 xs:gap-2 px-1">
          <Sparkles className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-primary" />
          Quick Management
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-3">
          {/* Recipe Instructions (CK Cooking) */}
          <Link href="/admin/recipe-instructions">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-3 xs:pt-4 px-2.5 xs:px-4 pb-3 xs:pb-4">
                <div className="flex flex-col xs:flex-row items-start gap-2 xs:gap-3">
                  <div className="p-2 xs:p-2.5 rounded-lg bg-teal-500/10 text-teal-600 group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <ChefHat className="h-4 w-4 xs:h-5 xs:w-5" />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-semibold text-xs xs:text-sm text-foreground leading-tight">Recipe Instructions</h3>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 xs:mt-1 line-clamp-2 hidden sm:block">
                      Full cooking instructions for Central Kitchen
                    </p>
                    <div className="flex flex-wrap items-center gap-1 xs:gap-1.5 mt-1.5 xs:mt-2">
                      <Badge variant="secondary" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0">
                        {stats?.recipes.total || 0} recipes
                      </Badge>
                      <Badge variant="outline" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0 hidden lg:inline-flex">
                        {Object.keys(stats?.recipes.byCategory || {}).length} categories
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 xs:h-4 xs:w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0 hidden xs:block" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Reheating Instructions (Branch) */}
          <Link href="/admin/reheating-instructions">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-3 xs:pt-4 px-2.5 xs:px-4 pb-3 xs:pb-4">
                <div className="flex flex-col xs:flex-row items-start gap-2 xs:gap-3">
                  <div className="p-2 xs:p-2.5 rounded-lg bg-orange-500/10 text-orange-600 group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <Flame className="h-4 w-4 xs:h-5 xs:w-5" />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-semibold text-xs xs:text-sm text-foreground leading-tight">Reheating Instructions</h3>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 xs:mt-1 line-clamp-2 hidden sm:block">
                      Reheating & assembly instructions for branches
                    </p>
                    <div className="flex flex-wrap items-center gap-1 xs:gap-1.5 mt-1.5 xs:mt-2">
                      <Badge variant="secondary" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0">
                        {stats?.instructions.total || 0} instructions
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 xs:h-4 xs:w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0 hidden xs:block" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Production Schedules */}
          <Link href="/admin/production-schedules">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-3 xs:pt-4 px-2.5 xs:px-4 pb-3 xs:pb-4">
                <div className="flex flex-col xs:flex-row items-start gap-2 xs:gap-3">
                  <div className="p-2 xs:p-2.5 rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                    <Factory className="h-4 w-4 xs:h-5 xs:w-5" />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-semibold text-xs xs:text-sm text-foreground leading-tight">Production Schedules</h3>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 xs:mt-1 line-clamp-2 hidden sm:block">
                      Weekly production plans for Central Kitchen
                    </p>
                    <div className="flex flex-wrap items-center gap-1 xs:gap-1.5 mt-1.5 xs:mt-2">
                      <Badge variant="secondary" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0 flex items-center">
                        <Clock className="h-2 w-2 xs:h-2.5 xs:w-2.5 mr-0.5" />
                        Weekly plans
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Branch Management */}
          <Link href="/admin/branches">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-3 xs:pt-4 px-2.5 xs:px-4 pb-3 xs:pb-4">
                <div className="flex flex-col xs:flex-row items-start gap-2 xs:gap-3">
                  <div className="p-2 xs:p-2.5 rounded-lg bg-cyan-500/10 text-cyan-600 shrink-0">
                    <Building2 className="h-4 w-4 xs:h-5 xs:w-5" />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-semibold text-xs xs:text-sm text-foreground leading-tight">Branch Management</h3>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 xs:mt-1 line-clamp-2 hidden sm:block">
                      Edit branch information, contacts, and operating hours
                    </p>
                    <div className="flex flex-wrap items-center gap-1 xs:gap-1.5 mt-1.5 xs:mt-2">
                      <Badge variant="secondary" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0">
                        {stats?.branches.total || 0} branches
                      </Badge>
                      <Badge variant="outline" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0 hidden lg:inline-flex">
                        {Object.keys(stats?.branches.byLocation || {}).length} locations
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Notifications */}
          <Link href="/admin/notifications">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-3 xs:pt-4 px-2.5 xs:px-4 pb-3 xs:pb-4">
                <div className="flex flex-col xs:flex-row items-start gap-2 xs:gap-3">
                  <div className="p-2 xs:p-2.5 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                    <Bell className="h-4 w-4 xs:h-5 xs:w-5" />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-semibold text-xs xs:text-sm text-foreground leading-tight">Notifications</h3>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 xs:mt-1 line-clamp-2 hidden sm:block">
                      Create announcements, patch notes, and alerts for employees
                    </p>
                    <div className="flex flex-wrap items-center gap-1 xs:gap-1.5 mt-1.5 xs:mt-2">
                      <Badge variant="secondary" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0">
                        {stats?.notifications.active || 0} active
                      </Badge>
                      {(stats?.notifications.expiringSoon || 0) > 0 && (
                        <Badge variant="outline" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0 text-amber-600 border-amber-300 hidden lg:inline-flex">
                          {stats?.notifications.expiringSoon} expiring
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Sales Analytics */}
          <Link href="/admin/analytics">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-3 xs:pt-4 px-2.5 xs:px-4 pb-3 xs:pb-4">
                <div className="flex flex-col xs:flex-row items-start gap-2 xs:gap-3">
                  <div className="p-2 xs:p-2.5 rounded-lg bg-green-500/10 text-green-600 shrink-0">
                    <BarChart3 className="h-4 w-4 xs:h-5 xs:w-5" />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-semibold text-xs xs:text-sm text-foreground leading-tight">Sales Analytics</h3>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 xs:mt-1 line-clamp-2 hidden sm:block">
                      Revenue trends, branch performance, and product insights
                    </p>
                    <div className="flex flex-wrap items-center gap-1 xs:gap-1.5 mt-1.5 xs:mt-2">
                      <Badge variant="secondary" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0 flex items-center">
                        <DollarSign className="h-2 w-2 xs:h-2.5 xs:w-2.5 mr-0.5" />
                        Live Data
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* User Management */}
          <Link href="/admin/users">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-3 xs:pt-4 px-2.5 xs:px-4 pb-3 xs:pb-4">
                <div className="flex flex-col xs:flex-row items-start gap-2 xs:gap-3">
                  <div className="p-2 xs:p-2.5 rounded-lg bg-gray-500/10 text-gray-600 shrink-0">
                    <Users className="h-4 w-4 xs:h-5 xs:w-5" />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-semibold text-xs xs:text-sm text-foreground leading-tight">User Management</h3>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 xs:mt-1 line-clamp-2 hidden sm:block">
                      Manage user accounts, roles, and permissions
                    </p>
                    <div className="flex flex-wrap items-center gap-1 xs:gap-1.5 mt-1.5 xs:mt-2">
                      <Badge variant="secondary" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0 bg-indigo-100 text-indigo-700 border-0">
                        Role-Based
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Quality Control */}
          <Link href="/admin/quality-control">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-3 xs:pt-4 px-2.5 xs:px-4 pb-3 xs:pb-4">
                <div className="flex flex-col xs:flex-row items-start gap-2 xs:gap-3">
                  <div className="p-2 xs:p-2.5 rounded-lg bg-green-500/10 text-green-600 shrink-0">
                    <ClipboardCheck className="h-4 w-4 xs:h-5 xs:w-5" />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-semibold text-xs xs:text-sm text-foreground leading-tight">Quality Control</h3>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 xs:mt-1 line-clamp-2 hidden sm:block">
                      Monitor food quality checks from all branches
                    </p>
                    <div className="flex flex-wrap items-center gap-1 xs:gap-1.5 mt-1.5 xs:mt-2">
                      <Badge variant="secondary" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0 bg-green-100 text-green-700 border-0">
                        {qualitySummary?.totalSubmissions || 0} today
                      </Badge>
                      {(qualitySummary?.lowScores.length || 0) > 0 && (
                        <Badge variant="outline" className="text-[8px] xs:text-[9px] sm:text-[10px] px-1 xs:px-1.5 py-0 text-red-600 border-red-300 hidden lg:inline-flex">
                          {qualitySummary?.lowScores.length} alerts
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Chat Channels - Disabled for now, uncomment to re-enable
          <Link href="/admin/chat-channels">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-violet-500/10 text-violet-600 group-hover:scale-110 transition-transform duration-300">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Chat Channels</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      Create and manage team chat channels
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 border-0">
                        Team Communication
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </CardContent>
            </Card>
          </Link>
          */}
        </div>
      </div>
      {/* Quality Check Detail Modal */}
      <QualityCheckDetailModal
        submissionId={selectedSubmissionId}
        onClose={() => setSelectedSubmissionId(null)}
      />
    </div>
  )
}
