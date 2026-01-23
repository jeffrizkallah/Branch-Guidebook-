'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Coffee,
  Sun,
  ChevronRight,
  Flame,
  ChevronDown,
  Eye,
  Clock
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

interface QualityCompliance {
  branchSlug: string
  branchName: string
  breakfastSubmitted: boolean
  lunchSubmitted: boolean
}


export default function BranchManagerDashboard() {
  const { user, loading: authLoading } = useAuth({ 
    required: true, 
    allowedRoles: ['admin', 'operations_lead', 'branch_manager'] 
  })
  
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchAnalytics, setBranchAnalytics] = useState<BranchAnalytics[]>([])
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [todayOrders, setTodayOrders] = useState(0)
  const [revenueChange, setRevenueChange] = useState(0)
  const [alertsExpanded, setAlertsExpanded] = useState(false)
  const [qualityCompliance, setQualityCompliance] = useState<QualityCompliance[]>([])
  const [sortBy, setSortBy] = useState<'revenue' | 'name' | 'hygiene'>('revenue')
  const [dispatchesExpanded, setDispatchesExpanded] = useState(false)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  // Poll for quality compliance updates every 30 seconds
  useEffect(() => {
    if (!user) return
    
    const interval = setInterval(() => {
      // Only refresh quality compliance data
      const refreshQuality = async () => {
        try {
          const qualityRes = await fetch('/api/quality-checks/summary?period=today')
          const qualityData = await qualityRes.json()
          setQualityCompliance(qualityData.todayCompliance || [])
        } catch (e) {
          console.error('Error refreshing quality compliance:', e)
        }
      }
      refreshQuality()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [user])

  const fetchData = async () => {
    try {
      // Fetch all branches
      const branchesRes = await fetch('/api/branches')
      const allBranches: Branch[] = await branchesRes.json()
      
      // Filter to user's assigned branches (or all if admin/operations_lead)
      let userBranches: Branch[]
      if (user?.role === 'admin' || user?.role === 'operations_lead') {
        userBranches = allBranches.filter(b => b.slug !== 'central-kitchen')
      } else {
        userBranches = allBranches.filter(b => 
          user?.branches?.includes(b.slug)
        )
      }
      setBranches(userBranches)

      // Helper function to filter analytics to user's branches
      const filterAnalyticsToUserBranches = (branches: BranchAnalytics[]) => {
        return (branches || []).filter((a: BranchAnalytics) => {
          const analyticsBranch = (a.branch || '').toLowerCase().trim()
          return userBranches.some(b => {
            const branchName = b.name.toLowerCase().trim()
            const branchSlug = b.slug.toLowerCase()
            // Match exact name, slug conversion, or partial containment
            return branchName === analyticsBranch ||
                   branchSlug === analyticsBranch.replace(/\s+/g, '-') ||
                   branchName.includes(analyticsBranch) ||
                   analyticsBranch.includes(branchName.replace('isc ', ''))
          })
        })
      }

      // Fetch analytics for yesterday
      const analyticsRes = await fetch('/api/analytics/branches?period=yesterday')
      const analyticsData = await analyticsRes.json()
      
      // Fetch analytics for 2 days ago to calculate percentage change
      const twoDaysAgoRes = await fetch('/api/analytics/branches?period=2daysago')
      const twoDaysAgoData = await twoDaysAgoRes.json()
      
      // Filter both to user's branches
      const userAnalytics = filterAnalyticsToUserBranches(analyticsData.branches)
      const userAnalyticsTwoDaysAgo = filterAnalyticsToUserBranches(twoDaysAgoData.branches)
      
      setBranchAnalytics(userAnalytics)

      // Calculate totals for user's branches
      let totalRevenue = userAnalytics.reduce((sum: number, a: BranchAnalytics) => sum + a.revenue, 0)
      let totalOrders = userAnalytics.reduce((sum: number, a: BranchAnalytics) => sum + a.orders, 0)
      
      // Calculate revenue from 2 days ago for the same branches
      let revenueTwoDaysAgo = userAnalyticsTwoDaysAgo.reduce((sum: number, a: BranchAnalytics) => sum + a.revenue, 0)
      
      // If no matching analytics but user has branches, use total from API response
      if (totalRevenue === 0 && userBranches.length > 0 && analyticsData.totalRevenue) {
        totalRevenue = analyticsData.totalRevenue
        totalOrders = (analyticsData.branches || []).reduce((sum: number, a: BranchAnalytics) => sum + a.orders, 0)
      }
      
      if (revenueTwoDaysAgo === 0 && userBranches.length > 0 && twoDaysAgoData.totalRevenue) {
        revenueTwoDaysAgo = twoDaysAgoData.totalRevenue
      }
      
      setTodayRevenue(totalRevenue)
      setTodayOrders(totalOrders)

      // Calculate accurate percentage change for user's branches
      const accurateChange = revenueTwoDaysAgo > 0 
        ? Math.round(((totalRevenue - revenueTwoDaysAgo) / revenueTwoDaysAgo) * 100 * 10) / 10
        : (totalRevenue > 0 ? 100 : 0)
      
      setRevenueChange(accurateChange)

      // Fetch dispatches
      const dispatchRes = await fetch('/api/dispatch')
      const dispatchData: Dispatch[] = await dispatchRes.json()
      
      // Filter to dispatches containing user's branches
      const userDispatches = dispatchData.filter(d =>
        d.branchDispatches.some(bd =>
          userBranches.some(b => b.slug === bd.branchSlug)
        )
      ).slice(0, 5) // Last 5 dispatches
      setDispatches(userDispatches)

      // Fetch quality compliance
      try {
        const qualityRes = await fetch('/api/quality-checks/summary?period=today')
        const qualityData = await qualityRes.json()
        setQualityCompliance(qualityData.todayCompliance || [])
      } catch (e) {
        console.error('Error fetching quality compliance:', e)
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

  const getAnalyticsForBranch = (branchName: string) => {
    return branchAnalytics.find(a => 
      a.branch === branchName || 
      a.branch.toLowerCase().replace(/\s+/g, '-') === branchName.toLowerCase().replace(/\s+/g, '-')
    )
  }

  const getDispatchStatusForBranch = (branchSlug: string) => {
    for (const dispatch of dispatches) {
      const bd = dispatch.branchDispatches.find(d => d.branchSlug === branchSlug)
      if (bd && bd.status !== 'completed') {
        return { status: bd.status, date: dispatch.deliveryDate, items: bd.items?.length || 0 }
      }
    }
    return null
  }

  const getQualityStatusForBranch = (branchSlug: string) => {
    return qualityCompliance.find(q => q.branchSlug === branchSlug)
  }

  const getHygieneColor = (score: number) => {
    if (score >= 95) return 'text-green-600 bg-green-100'
    if (score >= 92) return 'text-amber-600 bg-amber-100'
    return 'text-red-600 bg-red-100'
  }

  // Calculate alerts
  const alerts = {
    qualityPending: qualityCompliance.filter(q => !q.breakfastSubmitted && !q.lunchSubmitted),
    dispatchPending: dispatches.filter(d => 
      d.branchDispatches.some(bd => 
        branches.some(b => b.slug === bd.branchSlug) && bd.status === 'pending'
      )
    )
  }
  const totalAlerts = alerts.qualityPending.length + alerts.dispatchPending.length

  // Quality completion stats
  const qualityComplete = qualityCompliance.filter(q => q.breakfastSubmitted || q.lunchSubmitted).length
  const qualityTotal = qualityCompliance.length
  const qualityPercentage = qualityTotal > 0 ? Math.round((qualityComplete / qualityTotal) * 100) : 0

  // Sort branches
  const sortedBranches = [...branches].sort((a, b) => {
    if (sortBy === 'revenue') {
      const aRev = getAnalyticsForBranch(a.name)?.revenue || 0
      const bRev = getAnalyticsForBranch(b.name)?.revenue || 0
      return bRev - aRev
    } else if (sortBy === 'hygiene') {
      return parseInt(b.kpis.hygieneScore) - parseInt(a.kpis.hygieneScore)
    }
    return a.name.localeCompare(b.name)
  })

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <RoleSidebar />

        <main className="flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0">
        <div className="flex-1 container mx-auto px-3 xs:px-4 py-4 xs:py-6 max-w-7xl">
          {/* Header */}
          <div className="mb-4 xs:mb-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                <div className="p-1.5 xs:p-2 rounded-lg xs:rounded-xl bg-primary/10 shrink-0">
                  <Building2 className="h-4 w-4 xs:h-5 xs:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg xs:text-xl sm:text-2xl font-bold text-foreground truncate">Dashboard</h1>
                  <p className="text-xs xs:text-sm text-muted-foreground truncate">
                    Welcome back, {user?.firstName}!
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchData()}
                disabled={loading}
                className="shrink-0 text-xs xs:text-sm h-8 xs:h-9 px-2 xs:px-3"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1 xs:mr-2"></div>
                    <span className="hidden xs:inline">Refreshing...</span>
                    <span className="xs:hidden">...</span>
                  </>
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>
          </div>

          {/* Alerts Section */}
          {totalAlerts > 0 && (
            <Card className="mb-6 border-l-4 transition-all border-l-amber-500">
              <CardHeader 
                className="py-4 cursor-pointer"
                onClick={() => setAlertsExpanded(!alertsExpanded)}
              >
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Needs Attention</span>
                    <Badge variant="secondary" className="ml-2">{totalAlerts}</Badge>
                  </div>
                  {alertsExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              {alertsExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {alerts.qualityPending.map(q => (
                      <div key={q.branchSlug} className="flex items-center gap-3 text-sm p-2 bg-amber-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="flex-1">
                          <strong>Quality:</strong> {q.branchName} - No checks submitted today
                        </span>
                        <Link href={`/branch/${q.branchSlug}/quality-check`}>
                          <Button variant="ghost" size="sm">Fill Now</Button>
                        </Link>
                      </div>
                    ))}
                    {alerts.dispatchPending.map(d => (
                      <div key={d.id} className="flex items-center gap-3 text-sm p-2 bg-blue-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="flex-1">
                          <strong>Dispatch:</strong> Pending confirmation for {new Date(d.deliveryDate).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-2 xs:gap-3 mb-4 xs:mb-6">
            {/* Revenue Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-3 xs:pt-4 pb-2.5 xs:pb-3 px-3 xs:px-4">
                <div className="flex items-center gap-1.5 xs:gap-2 mb-1.5 xs:mb-2">
                  <div className="p-1 xs:p-1.5 rounded-md xs:rounded-lg bg-emerald-100">
                    <DollarSign className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-emerald-600" />
                  </div>
                  <span className="text-[10px] xs:text-xs text-muted-foreground">Yesterday Revenue</span>
                </div>
                <p className="text-base xs:text-lg sm:text-xl font-bold">{formatCurrency(todayRevenue)}</p>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] xs:text-xs mt-1",
                  revenueChange >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {revenueChange >= 0 ? (
                    <TrendingUp className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
                  )}
                  <span className="hidden xs:inline">{revenueChange >= 0 ? '+' : ''}{revenueChange}% vs day before</span>
                  <span className="xs:hidden">{revenueChange >= 0 ? '+' : ''}{revenueChange}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Orders Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-3 xs:pt-4 pb-2.5 xs:pb-3 px-3 xs:px-4">
                <div className="flex items-center gap-1.5 xs:gap-2 mb-1.5 xs:mb-2">
                  <div className="p-1 xs:p-1.5 rounded-md xs:rounded-lg bg-blue-100">
                    <ShoppingCart className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-blue-600" />
                  </div>
                  <span className="text-[10px] xs:text-xs text-muted-foreground">Orders</span>
                </div>
                <p className="text-base xs:text-lg sm:text-xl font-bold">{todayOrders}</p>
                <span className="text-[10px] xs:text-xs text-muted-foreground">Today</span>
              </CardContent>
            </Card>

            {/* Quality Compliance Card */}
            <Link href={branches[0] ? `/branch/${branches[0].slug}/quality-check` : '#'}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                <CardContent className="pt-3 xs:pt-4 pb-2.5 xs:pb-3 px-3 xs:px-4">
                  <div className="flex items-center gap-1.5 xs:gap-2 mb-1.5 xs:mb-2">
                    <div className="p-1 xs:p-1.5 rounded-md xs:rounded-lg bg-green-100">
                      <ClipboardCheck className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-green-600" />
                    </div>
                    <span className="text-[10px] xs:text-xs text-muted-foreground">Quality</span>
                  </div>
                  <p className="text-base xs:text-lg sm:text-xl font-bold">{qualityPercentage}%</p>
                  <span className="text-[10px] xs:text-xs text-muted-foreground">{qualityComplete}/{qualityTotal} today</span>
                </CardContent>
              </Card>
            </Link>

          </div>

          {/* Main Content Grid */}
          <div className="grid fold:grid-cols-1 lg:grid-cols-3 gap-4 xs:gap-6">
            {/* Branches Column - Takes 2/3 */}
            <div className="lg:col-span-2 space-y-3 xs:space-y-4">
              {/* Branch Header with Sort */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Your Branches
                </h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-sm border rounded-lg px-2 py-1 bg-background"
                >
                  <option value="revenue">Sort: Revenue</option>
                  <option value="hygiene">Sort: Hygiene</option>
                  <option value="name">Sort: Name</option>
                </select>
              </div>

              {branches.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Branches Assigned</h3>
                    <p className="text-muted-foreground">
                      Contact your administrator to get branches assigned to your account.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {sortedBranches.map(branch => {
                    const analytics = getAnalyticsForBranch(branch.name)
                    const dispatchStatus = getDispatchStatusForBranch(branch.slug)
                    const qualityStatus = getQualityStatusForBranch(branch.slug)
                    const hygieneScore = parseInt(branch.kpis.hygieneScore) || 0
                    const hasQualityIssue = qualityStatus && !qualityStatus.breakfastSubmitted && !qualityStatus.lunchSubmitted
                    
                    return (
                      <Card 
                        key={branch.id} 
                        className={cn(
                          "hover:shadow-lg transition-all duration-300",
                          hasQualityIssue && "border-l-4 border-l-amber-400"
                        )}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{branch.name}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {branch.location}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                {analytics ? formatCurrency(analytics.revenue) : '-'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {analytics?.orders || 0} orders yesterday
                              </p>
                            </div>
                          </div>

                          {/* Status indicators */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {/* Dispatch Status */}
                            {dispatchStatus && (
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
                                dispatchStatus.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                dispatchStatus.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              )}>
                                <Truck className="h-3 w-3" />
                                {dispatchStatus.status === 'pending' ? 'Dispatch pending' :
                                 dispatchStatus.status === 'dispatched' ? 'Incoming' :
                                 'Receiving'} ({dispatchStatus.items})
                              </div>
                            )}

                            {/* Quality Status */}
                            {qualityStatus && (
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
                                qualityStatus.breakfastSubmitted && qualityStatus.lunchSubmitted
                                  ? "bg-green-100 text-green-700"
                                  : qualityStatus.breakfastSubmitted || qualityStatus.lunchSubmitted
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                              )}>
                                <ClipboardCheck className="h-3 w-3" />
                                {qualityStatus.breakfastSubmitted && qualityStatus.lunchSubmitted
                                  ? "Quality ✓"
                                  : qualityStatus.breakfastSubmitted
                                  ? "Breakfast ✓"
                                  : qualityStatus.lunchSubmitted
                                  ? "Lunch ✓"
                                  : "Quality pending"
                                }
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Link href={`/branch/${branch.slug}`} className="flex-1">
                              <Button variant="outline" className="w-full" size="sm">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Link href={`/branch/${branch.slug}/quality-check`}>
                              <Button 
                                variant={hasQualityIssue ? "default" : "outline"} 
                                size="sm"
                                className={hasQualityIssue ? "bg-green-600 hover:bg-green-700" : ""}
                              >
                                <ClipboardCheck className="h-3 w-3 mr-1" />
                                Quality
                              </Button>
                            </Link>
                            <Link href={`/branch/${branch.slug}/recipe-instructions`}>
                              <Button variant="outline" size="sm">
                                <Flame className="h-3 w-3 mr-1" />
                                Reheating
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right Sidebar - Takes 1/3 */}
            <div className="space-y-3 xs:space-y-4">
              {/* Spacer to align with branch cards */}
              <div className="h-8"></div>
              {/* Quality Overview Widget */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-green-600" />
                    Quality Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qualityCompliance.length > 0 ? (
                    <div className="space-y-2">
                      {qualityCompliance.slice(0, 5).map(q => (
                        <div key={q.branchSlug} className="flex items-center justify-between text-sm">
                          <span className="truncate flex-1">{q.branchName}</span>
                          <div className="flex gap-1">
                            <div className={cn(
                              "w-6 h-6 rounded flex items-center justify-center",
                              q.breakfastSubmitted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                            )}>
                              <Coffee className="h-3 w-3" />
                            </div>
                            <div className={cn(
                              "w-6 h-6 rounded flex items-center justify-center",
                              q.lunchSubmitted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                            )}>
                              <Sun className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>


              {/* Recent Dispatches */}
              {dispatches.length > 0 && (
                <Card>
                  <CardHeader 
                    className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setDispatchesExpanded(!dispatchesExpanded)}
                  >
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        Recent Dispatches
                        <Badge variant="secondary" className="ml-1">{dispatches.length}</Badge>
                      </div>
                      {dispatchesExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Status Summary - Always visible */}
                    <div className="flex gap-2 mb-3 text-xs">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending: {dispatches.filter(d => d.branchDispatches.some(bd => branches.some(b => b.slug === bd.branchSlug) && (bd.status === 'pending' || bd.status === 'packing'))).length}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Truck className="h-3 w-3 mr-1" />
                        Active: {dispatches.filter(d => d.branchDispatches.some(bd => branches.some(b => b.slug === bd.branchSlug) && (bd.status === 'dispatched' || bd.status === 'receiving'))).length}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Done: {dispatches.filter(d => d.branchDispatches.every(bd => !branches.some(b => b.slug === bd.branchSlug) || bd.status === 'completed')).length}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {/* Show only first dispatch when minimized, all when expanded */}
                      {(dispatchesExpanded ? dispatches.slice(0, 3) : dispatches.slice(0, 1)).map(dispatch => {
                        const relevantBranches = dispatch.branchDispatches.filter(bd =>
                          branches.some(b => b.slug === bd.branchSlug)
                        )
                        
                        return (
                          <div key={dispatch.id} className="border rounded-lg overflow-hidden">
                            {/* Date Header */}
                            <div className="bg-muted/50 px-3 py-1.5 border-b">
                              <p className="text-xs font-medium text-muted-foreground">
                                {new Date(dispatch.deliveryDate).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            {/* Branch Status List */}
                            <div className="divide-y">
                              {relevantBranches.map(bd => (
                                <div 
                                  key={bd.branchSlug}
                                  className="flex items-center justify-between px-3 py-2 text-sm"
                                >
                                  <span className="truncate flex-1 mr-2">{bd.branchName}</span>
                                  <Badge 
                                    className={cn(
                                      "text-xs shrink-0",
                                      bd.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      bd.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                                      bd.status === 'receiving' ? 'bg-purple-100 text-purple-700' :
                                      'bg-amber-100 text-amber-700',
                                      "border-0"
                                    )}
                                  >
                                    {bd.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                    {bd.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* Show "more" link when minimized */}
                      {!dispatchesExpanded && dispatches.length > 1 && (
                        <button 
                          onClick={() => setDispatchesExpanded(true)}
                          className="w-full text-center text-sm text-primary hover:underline py-2"
                        >
                          Show {dispatches.length - 1} more dispatch{dispatches.length > 2 ? 'es' : ''}...
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  )
}
