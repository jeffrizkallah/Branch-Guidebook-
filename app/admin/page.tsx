'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

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
    status: string
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
}

interface QualitySummary {
  totalSubmissions: number
  complianceRate: number
  todayCompliance: {
    branchSlug: string
    branchName: string
    breakfastSubmitted: boolean
    lunchSubmitted: boolean
  }[]
  lowScores: {
    id: number
    productName: string
    branchName: string
    tasteScore: number
    appearanceScore: number
  }[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [qualitySummary, setQualitySummary] = useState<QualitySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    fetchSalesData()
    fetchQualitySummary()
  }, [])

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
        setSalesData(data)
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error)
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor and manage your Mikana operations
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Overview - Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-tour-id="admin-stats">
        {/* Branches Stat */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-slide-up opacity-0 stagger-1" style={{ animationFillMode: 'forwards' }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Branches</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats?.branches.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.keys(stats?.branches.byLocation || {}).length} locations
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 group-hover:scale-110 transition-transform duration-300">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipes Stat */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-slide-up opacity-0 stagger-2" style={{ animationFillMode: 'forwards' }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CK Recipes</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats?.recipes.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Object.keys(stats?.recipes.byCategory || {}).length} categories
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 group-hover:scale-110 transition-transform duration-300">
                <ChefHat className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dispatches Stat */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-slide-up opacity-0 stagger-3" style={{ animationFillMode: 'forwards' }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dispatches</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats?.dispatches.total || 0}</p>
                <div className="flex items-center gap-1 mt-1">
                  {(stats?.dispatches.pending || 0) > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {stats?.dispatches.pending} pending
                    </Badge>
                  )}
                  {(stats?.dispatches.inProgress || 0) > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {stats?.dispatches.inProgress} active
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform duration-300">
                <Truck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hygiene Avg Stat */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 animate-slide-up opacity-0 stagger-4" style={{ animationFillMode: 'forwards' }}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Hygiene</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats?.branches.avgHygiene || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.branches.lowHygieneCount || 0} below threshold
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-green-500/10 text-green-600 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Snapshot */}
      {salesData && (
        <Card className="border-l-4 border-l-emerald-500 animate-slide-up opacity-0 stagger-5" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Sales Snapshot
              </CardTitle>
              <Link href="/admin/analytics">
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                  View Analytics
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Today's Revenue */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Today&apos;s Revenue</p>
                <p className="text-xl font-bold text-foreground">
                  {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(salesData.today.revenue)}
                </p>
                <div className={`flex items-center gap-1 text-xs font-medium ${salesData.today.changes.revenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {salesData.today.changes.revenue >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {salesData.today.changes.revenue >= 0 ? '+' : ''}{salesData.today.changes.revenue}% vs yesterday
                </div>
              </div>

              {/* This Month Revenue */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-xl font-bold text-foreground">
                  {salesData.thisMonth.revenue >= 1000000 
                    ? `AED ${(salesData.thisMonth.revenue / 1000000).toFixed(1)}M`
                    : salesData.thisMonth.revenue >= 1000
                    ? `AED ${(salesData.thisMonth.revenue / 1000).toFixed(0)}K`
                    : new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(salesData.thisMonth.revenue)
                  }
                </p>
                <div className={`flex items-center gap-1 text-xs font-medium ${salesData.thisMonth.changes.revenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {salesData.thisMonth.changes.revenue >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {salesData.thisMonth.changes.revenue >= 0 ? '+' : ''}{salesData.thisMonth.changes.revenue}% vs last month
                </div>
              </div>

              {/* Today's Units */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Units Sold Today</p>
                <p className="text-xl font-bold text-foreground">
                  {new Intl.NumberFormat('en-AE').format(salesData.today.units)}
                </p>
                <div className={`flex items-center gap-1 text-xs font-medium ${salesData.today.changes.units >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {salesData.today.changes.units >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {salesData.today.changes.units >= 0 ? '+' : ''}{salesData.today.changes.units}% vs yesterday
                </div>
              </div>

              {/* Today's Orders */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Orders Today</p>
                <p className="text-xl font-bold text-foreground">
                  {new Intl.NumberFormat('en-AE').format(salesData.today.orders)}
                </p>
                <div className={`flex items-center gap-1 text-xs font-medium ${salesData.today.changes.orders >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {salesData.today.changes.orders >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {salesData.today.changes.orders >= 0 ? '+' : ''}{salesData.today.changes.orders}% vs yesterday
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Quality Control Widget */}
      {qualitySummary && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-green-600" />
                Quality Control Today
              </CardTitle>
              <Link href="/admin/quality-control">
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
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
              {qualitySummary.todayCompliance.slice(0, 8).map((branch) => (
                <div 
                  key={branch.branchSlug}
                  className={`
                    flex items-center justify-between p-2 rounded-lg text-xs
                    ${branch.breakfastSubmitted && branch.lunchSubmitted
                      ? 'bg-green-50 border border-green-200'
                      : branch.breakfastSubmitted || branch.lunchSubmitted
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-amber-50 border border-amber-200'
                    }
                  `}
                >
                  <span className="font-medium truncate flex-1">{branch.branchName}</span>
                  <div className="flex gap-1 shrink-0">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${branch.breakfastSubmitted ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                      <Coffee className="h-3 w-3" />
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${branch.lunchSubmitted ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                      <Sun className="h-3 w-3" />
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
                    <div key={item.id} className="text-xs text-red-600">
                      {item.productName} at {item.branchName} - Taste: {item.tasteScore}/5, Look: {item.appearanceScore}/5
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Management Cards */}
      <div className="space-y-3" data-tour-id="admin-quick-actions">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Quick Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Recipes Management */}
          <Link href="/admin/recipes">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-teal-500/10 text-teal-600 group-hover:scale-110 transition-transform duration-300">
                    <ChefHat className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Recipe Manager (CK)</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      Full recipes for Central Kitchen with cooking instructions
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        {stats?.recipes.total || 0} recipes
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Object.keys(stats?.recipes.byCategory || {}).length} categories
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Recipe Instructions */}
          <Link href="/admin/recipe-instructions">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                    <Flame className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Recipe Instructions</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      Reheating & assembly instructions for branches
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        {stats?.instructions.total || 0} instructions
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Production Schedules */}
          <Link href="/admin/production-schedules">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                    <Factory className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Production Schedules</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      Weekly production plans for Central Kitchen
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Weekly plans
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Branch Management */}
          <Link href="/admin/branches">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-600 group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Branch Management</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      Edit branch information, contacts, and operating hours
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        {stats?.branches.total || 0} branches
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Object.keys(stats?.branches.byLocation || {}).length} locations
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Notifications */}
          <Link href="/admin/notifications">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform duration-300">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Notifications</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      Create announcements, patch notes, and alerts for employees
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        {stats?.notifications.active || 0} active
                      </Badge>
                      {(stats?.notifications.expiringSoon || 0) > 0 && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          {stats?.notifications.expiringSoon} expiring soon
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Sales Analytics */}
          <Link href="/admin/analytics">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-green-500/10 text-green-600 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Sales Analytics</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      Revenue trends, branch performance, and product insights
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 border-0">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Live Data
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* User Management */}
          <Link href="/admin/users">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gray-500/10 text-gray-600 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">User Management</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      Manage user accounts, roles, and permissions
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 border-0">
                        Role-Based Access
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Quality Control */}
          <Link href="/admin/quality-control">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-green-500/10 text-green-600 group-hover:scale-110 transition-transform duration-300">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Quality Control</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      Monitor food quality checks from all branches
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-0">
                        {qualitySummary?.totalSubmissions || 0} today
                      </Badge>
                      {(qualitySummary?.lowScores.length || 0) > 0 && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                          {qualitySummary?.lowScores.length} alerts
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
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

      {/* Footer Info */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Need Help?</h3>
              <p className="text-xs text-muted-foreground">
                Contact your system administrator for additional features or support. More management tools are under development.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
