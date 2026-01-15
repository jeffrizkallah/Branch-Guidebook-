'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Globe,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  ClipboardCheck,
  Coffee,
  Sun,
  Users,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Building2,
  Eye,
  MapPin,
  Wallet,
  Calendar,
  Package,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface Branch {
  id: string
  slug: string
  name: string
  school: string
  location: string
  manager: string
  kpis: {
    salesTarget: string
    wastePct: string
    hygieneScore: string
  }
}

interface BranchAnalytics {
  branch: string
  revenue: number
  units: number
  orders: number
  percentage: number
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

interface Dispatch {
  id: string
  deliveryDate: string
  branchDispatches: {
    branchSlug: string
    branchName: string
    status: string
    items: any[]
  }[]
}

interface YesterdayBranchData {
  branch: string
  revenue: number
  units: number
  orders: number
}

export default function RegionalDashboardPage() {
  const { user, loading: authLoading } = useAuth({
    required: true,
    allowedRoles: ['admin', 'regional_manager']
  })

  const [branches, setBranches] = useState<Branch[]>([])
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [qualitySummary, setQualitySummary] = useState<QualitySummary | null>(null)
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [yesterdayBranches, setYesterdayBranches] = useState<YesterdayBranchData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      const [branchesRes, salesRes, qualityRes, dispatchRes, yesterdayRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/analytics/summary'),
        fetch('/api/quality-checks/summary?period=today'),
        fetch('/api/dispatch'),
        fetch('/api/analytics/branches/yesterday'),
      ])

      const branchesData: Branch[] = await branchesRes.json()
      const serviceBranches = branchesData.filter(b => b.slug !== 'central-kitchen')
      setBranches(serviceBranches)

      if (salesRes.ok) {
        const data = await salesRes.json()
        setSalesData(data.error ? { ...data, error: 'database_error' } : data)
      }

      if (qualityRes.ok) {
        const qualityData = await qualityRes.json()
        setQualitySummary(qualityData)
      }

      if (dispatchRes.ok) {
        const dispatchData: Dispatch[] = await dispatchRes.json()
        setDispatches(dispatchData.slice(0, 5))
      }

      if (yesterdayRes.ok) {
        const yesterdayData = await yesterdayRes.json()
        setYesterdayBranches(yesterdayData.branches || [])
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `AED ${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `AED ${(value / 1000).toFixed(1)}K`
    }
    return `AED ${value.toFixed(0)}`
  }

  // Dispatch stats
  const dispatchStats = {
    pending: dispatches.filter(d => 
      d.branchDispatches.some(bd => bd.status === 'pending' || bd.status === 'packing')
    ).length,
    active: dispatches.filter(d => 
      d.branchDispatches.some(bd => bd.status === 'dispatched' || bd.status === 'receiving')
    ).length,
    completed: dispatches.filter(d => 
      d.branchDispatches.every(bd => bd.status === 'completed')
    ).length,
  }

  // Quality stats
  const qualityComplete = qualitySummary?.todayCompliance.filter(q => q.breakfastSubmitted || q.lunchSubmitted).length || 0
  const qualityTotal = qualitySummary?.todayCompliance.length || 0

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100">
              <Globe className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Regional Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.firstName}! Overseeing {branches.length} branches
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-100">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-xs text-muted-foreground">Yesterday Revenue</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(salesData?.today?.revenue || 0)}</p>
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              (salesData?.today?.changes?.revenue || 0) >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {(salesData?.today?.changes?.revenue || 0) >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {(salesData?.today?.changes?.revenue || 0) >= 0 ? '+' : ''}{salesData?.today?.changes?.revenue || 0}% vs day before
            </div>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-xs text-muted-foreground">Orders Yesterday</span>
            </div>
            <p className="text-xl font-bold">{salesData?.today?.orders || 0}</p>
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              (salesData?.today?.changes?.orders || 0) >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {(salesData?.today?.changes?.orders || 0) >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {(salesData?.today?.changes?.orders || 0) >= 0 ? '+' : ''}{salesData?.today?.changes?.orders || 0}%
            </div>
          </CardContent>
        </Card>

        {/* Quality Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-green-100">
                <ClipboardCheck className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-xs text-muted-foreground">Quality Compliance</span>
            </div>
            <p className="text-xl font-bold">{qualitySummary?.complianceRate || 0}%</p>
            <span className="text-xs text-muted-foreground">{qualityComplete}/{qualityTotal} branches done</span>
          </CardContent>
        </Card>

        {/* Month Revenue Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-purple-100">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-xs text-muted-foreground">This Month</span>
            </div>
            <p className="text-xl font-bold">{formatCompactCurrency(salesData?.thisMonth?.revenue || 0)}</p>
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              (salesData?.thisMonth?.changes?.revenue || 0) >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {(salesData?.thisMonth?.changes?.revenue || 0) >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {(salesData?.thisMonth?.changes?.revenue || 0) >= 0 ? '+' : ''}{salesData?.thisMonth?.changes?.revenue || 0}% vs last month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Widget */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  Yesterday's Branch Performance
                </CardTitle>
                <Link href="/regional/analytics">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                    View Full Analytics
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {yesterdayBranches.length > 0 ? (
                <div className="space-y-3">
                  {yesterdayBranches.slice(0, 6).map((branch, idx) => (
                    <div key={branch.branch} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          idx === 0 ? "bg-yellow-100 text-yellow-700" :
                          idx === 1 ? "bg-gray-100 text-gray-600" :
                          idx === 2 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-50 text-slate-500"
                        )}>
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium">{branch.branch.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(branch.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{branch.orders} orders</p>
                      </div>
                    </div>
                  ))}
                  {yesterdayBranches.length > 6 && (
                    <Link href="/regional/analytics" className="block text-center text-sm text-primary hover:underline pt-2">
                      View all {yesterdayBranches.length} branches
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No sales data available for yesterday</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quality Control Widget */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-green-600" />
                  Quality Control Today
                </CardTitle>
                <Link href="/regional/quality-control">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                    View All
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {qualitySummary ? (
                <>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-xl font-bold text-green-700">{qualitySummary.totalSubmissions}</p>
                      <p className="text-xs text-green-600">Submissions</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xl font-bold text-blue-700">{qualitySummary.complianceRate}%</p>
                      <p className="text-xs text-blue-600">Compliance</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <p className="text-xl font-bold text-emerald-700">{qualityComplete}</p>
                      <p className="text-xs text-emerald-600">Branches Done</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <p className="text-xl font-bold text-amber-700">
                        {qualitySummary.todayCompliance.filter(b => !b.breakfastSubmitted && !b.lunchSubmitted).length}
                      </p>
                      <p className="text-xs text-amber-600">Pending</p>
                    </div>
                  </div>

                  {/* Branch compliance grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {qualitySummary.todayCompliance.slice(0, 8).map((branch) => (
                      <div
                        key={branch.branchSlug}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg text-xs",
                          branch.breakfastSubmitted && branch.lunchSubmitted
                            ? 'bg-green-50 border border-green-200'
                            : branch.breakfastSubmitted || branch.lunchSubmitted
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-amber-50 border border-amber-200'
                        )}
                      >
                        <span className="font-medium truncate flex-1">{branch.branchName}</span>
                        <div className="flex gap-1 shrink-0">
                          <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center",
                            branch.breakfastSubmitted ? 'bg-green-500 text-white' : 'bg-gray-200'
                          )}>
                            <Coffee className="h-3 w-3" />
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center",
                            branch.lunchSubmitted ? 'bg-green-500 text-white' : 'bg-gray-200'
                          )}>
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
                          <Link
                            key={item.id}
                            href="/regional/quality-control"
                            className="block text-xs text-red-600 hover:text-red-800 hover:bg-red-100 p-1 rounded transition-colors"
                          >
                            {item.productName} at {item.branchName} - Taste: {item.tasteScore}/5, Look: {item.appearanceScore}/5
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No quality data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          {/* Attendance Widget (Placeholder) */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                Staff Attendance
                <Badge variant="secondary" className="text-[10px] ml-2">Coming Soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-700">--</p>
                  <p className="text-xs text-green-600">Present</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-xl font-bold text-red-700">--</p>
                  <p className="text-xs text-red-600">Absent</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-xl font-bold text-amber-700">--</p>
                  <p className="text-xs text-amber-600">Late</p>
                </div>
              </div>
              <div className="text-center py-4 text-muted-foreground text-sm">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Attendance tracking will be available after branch system integration.</p>
              </div>
            </CardContent>
          </Card>

          {/* Dispatch Widget */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                Dispatch Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-xl font-bold text-amber-700">{dispatchStats.pending}</p>
                  <p className="text-xs text-amber-600">Pending</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xl font-bold text-blue-700">{dispatchStats.active}</p>
                  <p className="text-xs text-blue-600">Active</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-700">{dispatchStats.completed}</p>
                  <p className="text-xs text-green-600">Done</p>
                </div>
              </div>

              {dispatches.length > 0 ? (
                <div className="space-y-2">
                  {dispatches.slice(0, 3).map(dispatch => {
                    const pendingCount = dispatch.branchDispatches.filter(bd => bd.status !== 'completed').length
                    return (
                      <div key={dispatch.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium">
                            {new Date(dispatch.deliveryDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">{dispatch.branchDispatches.length} branches</p>
                        </div>
                        {pendingCount > 0 ? (
                          <Badge variant="secondary" className="text-amber-600 bg-amber-100">
                            {pendingCount} pending
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-green-600 bg-green-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent dispatches</p>
              )}
            </CardContent>
          </Card>

          {/* Budget Quick Access */}
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-purple-600" />
                Budget Planner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Plan and optimize your regional budget with AI assistance.
              </p>
              <Link href="/regional/budget">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Open Budget Planner
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Branches Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-600" />
              All Branches ({branches.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {branches.map(branch => {
              const branchRevenue = yesterdayBranches.find(
                b => b.branch.toLowerCase().replace(/_/g, '-') === branch.slug.toLowerCase() ||
                     b.branch.toLowerCase().replace(/ /g, '-') === branch.slug.toLowerCase()
              )
              const qualityStatus = qualitySummary?.todayCompliance.find(q => q.branchSlug === branch.slug)
              
              return (
                <Link key={branch.id} href={`/branch/${branch.slug}`}>
                  <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-sm mb-1 truncate">{branch.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                        <MapPin className="h-3 w-3" />
                        {branch.location}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold">
                            {branchRevenue ? formatCurrency(branchRevenue.revenue) : '--'}
                          </p>
                          <p className="text-xs text-muted-foreground">yesterday</p>
                        </div>
                        
                        {qualityStatus && (
                          <div className="flex gap-1">
                            <div className={cn(
                              "w-5 h-5 rounded flex items-center justify-center",
                              qualityStatus.breakfastSubmitted ? 'bg-green-500 text-white' : 'bg-gray-200'
                            )}>
                              <Coffee className="h-3 w-3" />
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded flex items-center justify-center",
                              qualityStatus.lunchSubmitted ? 'bg-green-500 text-white' : 'bg-gray-200'
                            )}>
                              <Sun className="h-3 w-3" />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
