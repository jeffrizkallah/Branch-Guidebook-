'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  ArrowLeft,
  Calendar,
  RefreshCw,
  Building2,
  Layers,
  Download,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Target,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Area,
} from 'recharts'

// ============= INTERFACES =============

interface SalesTypeData {
  total: {
    revenue: number
    units: number
    orders: number
    aov: number
    changes: {
      revenue: number
      units: number
      orders: number
      aov: number
    }
  }
  subscription: {
    revenue: number
    units: number
    orders: number
    aov: number
    percentage: number
    changes: {
      revenue: number
      units: number
      orders: number
      aov: number
    }
  }
  counter: {
    revenue: number
    units: number
    orders: number
    aov: number
    percentage: number
    changes: {
      revenue: number
      units: number
      orders: number
      aov: number
    }
  }
  period: string
}

interface MultiPeriodBranch {
  branch: string
  yesterday: { revenue: number; units: number; orders: number; percentage: number }
  thisWeek: { revenue: number; units: number; orders: number; percentage: number }
  thisMonth: { revenue: number; units: number; orders: number; percentage: number }
  previousMonth: { revenue: number; units: number; orders: number; percentage: number }
  periodToDate: { revenue: number; units: number; orders: number; percentage: number }
}

interface DailyData {
  date: string
  dayOfWeek: string
  revenue: number
  units: number
  orders: number
  aov: number
}

interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'alert'
  title: string
  description: string
  metric?: string
  value?: string
}

interface SubscriptionMetrics {
  thisMonth: {
    revenue: number
    units: number
    orders: number
    uniqueClients: number
    aov: number
    changes: {
      revenue: number
      orders: number
      clients: number
    }
  }
  comparison: {
    subscriptionRevenue: number
    counterRevenue: number
    subscriptionPercentage: number
    counterPercentage: number
    subscriptionAOV: number
    counterAOV: number
  }
  topClients: Array<{
    client: string
    revenue: number
    orders: number
    aov: number
  }>
}

interface BranchDetail {
  branch: string
  thisMonth: {
    subscription: {
      revenue: number
      units: number
      orders: number
      percentage: number
    }
    counter: {
      revenue: number
      units: number
      orders: number
      percentage: number
    }
    total: {
      revenue: number
      units: number
      orders: number
    }
  }
  topProducts: Array<{
    product: string
    category: string
    revenue: number
    units: number
  }>
  dailyTrend: Array<{
    date: string
    totalRevenue: number
    subscriptionRevenue: number
    counterRevenue: number
    totalOrders: number
    subscriptionOrders: number
    counterOrders: number
  }>
}

interface ProductData {
  product: string
  category: string
  revenue: number
  units: number
  revenuePercentage: number
}

interface CategoryData {
  category: string
  revenue: number
  units: number
  percentage: number
  color: string
}

type Period = 'today' | 'week' | 'month' | 'year'
type SalesTab = 'total' | 'subscription' | 'counter'

// ============= MAIN COMPONENT =============

export default function EnhancedAnalyticsPage() {
  const [salesTypeData, setSalesTypeData] = useState<SalesTypeData | null>(null)
  const [multiPeriodBranches, setMultiPeriodBranches] = useState<MultiPeriodBranch[]>([])
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyData[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [subscriptionMetrics, setSubscriptionMetrics] = useState<SubscriptionMetrics | null>(null)
  const [products, setProducts] = useState<ProductData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  
  const [period, setPeriod] = useState<Period>('month')
  const [salesTab, setSalesTab] = useState<SalesTab>('total')
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [branchDetails, setBranchDetails] = useState<Map<string, BranchDetail>>(new Map())
  const [loadingBranches, setLoadingBranches] = useState<Set<string>>(new Set())
  const [showDailyBreakdown, setShowDailyBreakdown] = useState(false)
  const [monthlyTarget, setMonthlyTarget] = useState<number>(1000000) // Default target
  
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchAllData()
  }, [period])

  useEffect(() => {
    fetchMultiPeriodBranches()
  }, [salesTab])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      const [
        salesTypeRes,
        multiPeriodRes,
        dailyRes,
        insightsRes,
        subscriptionRes,
        productsRes,
        categoriesRes,
      ] = await Promise.all([
        fetch(`/api/analytics/summary-by-type?period=${period}`),
        fetch(`/api/analytics/branches/multi-period?orderType=${salesTab === 'total' ? 'all' : salesTab}`),
        fetch('/api/analytics/daily-breakdown?days=30'),
        fetch('/api/analytics/insights'),
        fetch('/api/analytics/subscription-metrics'),
        fetch(`/api/analytics/products?period=${period}&limit=10`),
        fetch(`/api/analytics/categories?period=${period}`),
      ])

      const [
        salesTypeData,
        multiPeriodData,
        dailyData,
        insightsData,
        subscriptionData,
        productsData,
        categoriesData,
      ] = await Promise.all([
        salesTypeRes.json(),
        multiPeriodRes.json(),
        dailyRes.json(),
        insightsRes.json(),
        subscriptionRes.json(),
        productsRes.json(),
        categoriesRes.json(),
      ])

      setSalesTypeData(salesTypeData)
      setMultiPeriodBranches(multiPeriodData.branches || [])
      setDailyBreakdown(dailyData.daily || [])
      setInsights(insightsData.insights || [])
      setSubscriptionMetrics(subscriptionData)
      setProducts(productsData.topByRevenue || [])
      setCategories(categoriesData.categories || [])
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMultiPeriodBranches = async () => {
    try {
      const res = await fetch(`/api/analytics/branches/multi-period?orderType=${salesTab === 'total' ? 'all' : salesTab}`)
      const data = await res.json()
      setMultiPeriodBranches(data.branches || [])
    } catch (error) {
      console.error('Failed to fetch multi-period branches:', error)
    }
  }

  // ============= HELPER FUNCTIONS =============

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-AE').format(Math.round(value))
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

  const ChangeIndicator = ({ value, suffix = '%' }: { value: number; suffix?: string }) => {
    if (value === 0) return <span className="text-muted-foreground text-xs">No change</span>
    const isPositive = value > 0
    return (
      <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{value}{suffix}
      </span>
    )
  }

  const periodLabels: Record<Period, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  }

  const toggleBranchExpand = async (branch: string) => {
    const newExpanded = new Set(expandedBranches)
    if (newExpanded.has(branch)) {
      // Collapse
      newExpanded.delete(branch)
      setExpandedBranches(newExpanded)
    } else {
      // Expand - fetch details if not already loaded
      newExpanded.add(branch)
      setExpandedBranches(newExpanded)
      
      if (!branchDetails.has(branch)) {
        // Fetch branch details
        setLoadingBranches(new Set(loadingBranches).add(branch))
        try {
          const res = await fetch(`/api/analytics/branches/detail?branch=${encodeURIComponent(branch)}`)
          const data = await res.json()
          console.log(`Branch detail for ${branch}:`, data)
          setBranchDetails(new Map(branchDetails).set(branch, data))
        } catch (error) {
          console.error(`Failed to fetch details for ${branch}:`, error)
        } finally {
          const newLoading = new Set(loadingBranches)
          newLoading.delete(branch)
          setLoadingBranches(newLoading)
        }
      }
    }
  }

  const exportToCSV = () => {
    if (multiPeriodBranches.length === 0) return

    // Create CSV content
    const headers = ['Branch', 'Yesterday Revenue', 'Yesterday %', 'This Week Revenue', 'This Week %', 
                     'This Month Revenue', 'This Month %', 'Previous Month Revenue', 'Previous Month %', 
                     'Period to Date Revenue', 'Period to Date %']
    
    const rows = multiPeriodBranches.map(branch => [
      branch.branch,
      branch.yesterday.revenue.toFixed(2),
      branch.yesterday.percentage.toFixed(1),
      branch.thisWeek.revenue.toFixed(2),
      branch.thisWeek.percentage.toFixed(1),
      branch.thisMonth.revenue.toFixed(2),
      branch.thisMonth.percentage.toFixed(1),
      branch.previousMonth.revenue.toFixed(2),
      branch.previousMonth.percentage.toFixed(1),
      branch.periodToDate.revenue.toFixed(2),
      branch.periodToDate.percentage.toFixed(1),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getCurrentData = () => {
    if (!salesTypeData) return null
    switch (salesTab) {
      case 'subscription':
        return salesTypeData.subscription
      case 'counter':
        return salesTypeData.counter
      default:
        return salesTypeData.total
    }
  }

  const currentData = getCurrentData()

  // Calculate progress toward monthly target
  const monthlyProgress = salesTypeData ? (salesTypeData.total.revenue / monthlyTarget) * 100 : 0

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="h-5 w-5 text-emerald-600" />
      case 'negative':
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-emerald-50 border-emerald-200'
      case 'negative':
      case 'alert':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  if (isLoading && !salesTypeData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground">Loading enhanced analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="p-2 rounded-xl bg-emerald-100">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sales Analytics</h1>
              <p className="text-sm text-muted-foreground">
                {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-lg p-1">
            {(['today', 'week', 'month', 'year'] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                className="text-xs"
                onClick={() => setPeriod(p)}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="icon" onClick={fetchAllData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Insights & Alerts */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <Card key={index} className={`border ${getInsightBgColor(insight.type)}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold mb-1">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                    {insight.value && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {insight.value}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sales Type Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sales Breakdown</CardTitle>
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={salesTab === 'total' ? 'default' : 'ghost'}
                size="sm"
                className="text-xs"
                onClick={() => setSalesTab('total')}
              >
                Total
              </Button>
              <Button
                variant={salesTab === 'subscription' ? 'default' : 'ghost'}
                size="sm"
                className="text-xs"
                onClick={() => setSalesTab('subscription')}
              >
                Subscription
              </Button>
              <Button
                variant={salesTab === 'counter' ? 'default' : 'ghost'}
                size="sm"
                className="text-xs"
                onClick={() => setSalesTab('counter')}
              >
                Counter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* KPI Cards for Selected Tab */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">{formatCompactCurrency(currentData?.revenue || 0)}</p>
              <ChangeIndicator value={currentData?.changes.revenue || 0} />
            </div>

            {/* Units */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Units Sold</p>
              <p className="text-2xl font-bold">{formatNumber(currentData?.units || 0)}</p>
              <ChangeIndicator value={currentData?.changes.units || 0} />
            </div>

            {/* Orders */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Orders</p>
              <p className="text-2xl font-bold">{formatNumber(currentData?.orders || 0)}</p>
              <ChangeIndicator value={currentData?.changes.orders || 0} />
            </div>

            {/* AOV */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold">{formatCurrency(currentData?.aov || 0)}</p>
              <ChangeIndicator value={currentData?.changes.aov || 0} />
            </div>
          </div>

          {/* Subscription vs Counter Comparison (only show on total tab) */}
          {salesTab === 'total' && salesTypeData && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-emerald-700">Subscription Sales</h4>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {salesTypeData.subscription.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-semibold">{formatCompactCurrency(salesTypeData.subscription.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Orders</span>
                      <span className="font-semibold">{formatNumber(salesTypeData.subscription.orders)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">AOV</span>
                      <span className="font-semibold">{formatCurrency(salesTypeData.subscription.aov)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-blue-700">Counter Sales</h4>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {salesTypeData.counter.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-semibold">{formatCompactCurrency(salesTypeData.counter.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Orders</span>
                      <span className="font-semibold">{formatNumber(salesTypeData.counter.orders)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">AOV</span>
                      <span className="font-semibold">{formatCurrency(salesTypeData.counter.aov)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Target Progress (only show for month period) */}
      {period === 'month' && salesTypeData && (
        <Card className="border-2 border-dashed border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-semibold">Monthly Target Progress</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Target: {formatCurrency(monthlyTarget)}</p>
                <p className="text-lg font-bold">{monthlyProgress.toFixed(1)}%</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(monthlyProgress, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Current: {formatCurrency(salesTypeData.total.revenue)}</span>
              <span>Remaining: {formatCurrency(Math.max(0, monthlyTarget - salesTypeData.total.revenue))}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Period Branch Comparison Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            Branch Performance - Multi-Period Comparison
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Viewing {salesTab === 'total' ? 'all sales' : salesTab === 'subscription' ? 'subscription sales only' : 'counter sales only'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold">Branch</th>
                  <th className="text-right p-2 font-semibold">Yesterday</th>
                  <th className="text-right p-2 font-semibold">%</th>
                  <th className="text-right p-2 font-semibold">This Week</th>
                  <th className="text-right p-2 font-semibold">%</th>
                  <th className="text-right p-2 font-semibold">This Month</th>
                  <th className="text-right p-2 font-semibold">%</th>
                  <th className="text-right p-2 font-semibold">Prev Month</th>
                  <th className="text-right p-2 font-semibold">%</th>
                  <th className="text-right p-2 font-semibold">Period to Date</th>
                  <th className="text-right p-2 font-semibold">%</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {multiPeriodBranches.map((branch, index) => (
                  <>
                    <tr 
                      key={branch.branch} 
                      className={`border-b hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}
                    >
                      <td className="p-2 font-medium">{branch.branch}</td>
                      
                      <td className="text-right p-2">{formatCompactCurrency(branch.yesterday.revenue)}</td>
                      <td className="text-right p-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                          {branch.yesterday.percentage.toFixed(1)}%
                        </span>
                      </td>
                      
                      <td className="text-right p-2">{formatCompactCurrency(branch.thisWeek.revenue)}</td>
                      <td className="text-right p-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">
                          {branch.thisWeek.percentage.toFixed(1)}%
                        </span>
                      </td>
                      
                      <td className="text-right p-2 font-semibold">{formatCompactCurrency(branch.thisMonth.revenue)}</td>
                      <td className="text-right p-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                          {branch.thisMonth.percentage.toFixed(1)}%
                        </span>
                      </td>
                      
                      <td className="text-right p-2">{formatCompactCurrency(branch.previousMonth.revenue)}</td>
                      <td className="text-right p-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                          {branch.previousMonth.percentage.toFixed(1)}%
                        </span>
                      </td>
                      
                      <td className="text-right p-2">{formatCompactCurrency(branch.periodToDate.revenue)}</td>
                      <td className="text-right p-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">
                          {branch.periodToDate.percentage.toFixed(1)}%
                        </span>
                      </td>
                      
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleBranchExpand(branch.branch)}
                        >
                          {expandedBranches.has(branch.branch) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                    
                    {/* Expanded Row - Branch Details */}
                    {expandedBranches.has(branch.branch) && (
                      <tr key={`${branch.branch}-detail`} className="bg-muted/20">
                        <td colSpan={12} className="p-0">
                          <div className="p-4 border-t border-muted">
                            {loadingBranches.has(branch.branch) ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  <span className="text-sm">Loading branch details...</span>
                                </div>
                              </div>
                            ) : branchDetails.has(branch.branch) ? (
                              <div className="space-y-4">
                                {/* Subscription vs Counter This Month */}
                                <div>
                                  <h4 className="text-sm font-semibold mb-3">This Month Breakdown</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Subscription */}
                                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-emerald-700">Subscription Sales</span>
                                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">
                                          {branchDetails.get(branch.branch)!.thisMonth.subscription.percentage.toFixed(1)}%
                                        </Badge>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Revenue</span>
                                          <span className="font-semibold">{formatCompactCurrency(branchDetails.get(branch.branch)!.thisMonth.subscription.revenue)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Orders</span>
                                          <span className="font-semibold">{branchDetails.get(branch.branch)!.thisMonth.subscription.orders}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Units</span>
                                          <span className="font-semibold">{formatNumber(branchDetails.get(branch.branch)!.thisMonth.subscription.units)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Counter */}
                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-blue-700">Counter Sales</span>
                                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                                          {branchDetails.get(branch.branch)!.thisMonth.counter.percentage.toFixed(1)}%
                                        </Badge>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Revenue</span>
                                          <span className="font-semibold">{formatCompactCurrency(branchDetails.get(branch.branch)!.thisMonth.counter.revenue)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Orders</span>
                                          <span className="font-semibold">{branchDetails.get(branch.branch)!.thisMonth.counter.orders}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Units</span>
                                          <span className="font-semibold">{formatNumber(branchDetails.get(branch.branch)!.thisMonth.counter.units)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Total */}
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-gray-700">Total</span>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Revenue</span>
                                          <span className="font-semibold">{formatCompactCurrency(branchDetails.get(branch.branch)!.thisMonth.total.revenue)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Orders</span>
                                          <span className="font-semibold">{branchDetails.get(branch.branch)!.thisMonth.total.orders}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Units</span>
                                          <span className="font-semibold">{formatNumber(branchDetails.get(branch.branch)!.thisMonth.total.units)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Top Products */}
                                {branchDetails.get(branch.branch)!.topProducts.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">Top 5 Products This Month</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                      {branchDetails.get(branch.branch)!.topProducts.map((product, idx) => (
                                        <div key={idx} className="p-2 rounded bg-white border border-muted text-xs">
                                          <p className="font-medium truncate" title={product.product}>{product.product}</p>
                                          <p className="text-muted-foreground text-[10px]">{product.category}</p>
                                          <p className="font-semibold mt-1">{formatCompactCurrency(product.revenue)}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Daily Trend */}
                                {branchDetails.get(branch.branch)!.dailyTrend && branchDetails.get(branch.branch)!.dailyTrend.length > 0 ? (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">Last 7 Days Trend</h4>
                                    <div className="h-[140px]">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={branchDetails.get(branch.branch)!.dailyTrend}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                          <XAxis 
                                            dataKey="date" 
                                            tickFormatter={(value) => {
                                              const date = new Date(value)
                                              return `${date.getDate()}/${date.getMonth() + 1}`
                                            }}
                                            tick={{ fontSize: 9 }}
                                          />
                                          <YAxis 
                                            tickFormatter={(value) => formatCompactCurrency(value).replace('AED ', '')}
                                            tick={{ fontSize: 9 }}
                                          />
                                          <Tooltip 
                                            content={({ active, payload, label }) => {
                                              if (active && payload && payload.length > 0) {
                                                const data = payload[0].payload
                                                return (
                                                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                                    <p className="text-xs font-semibold mb-2 text-gray-700">
                                                      {new Date(label).toLocaleDateString('en-AE', { 
                                                        weekday: 'short', 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                      })}
                                                    </p>
                                                    <div className="space-y-1">
                                                      <div className="flex items-center justify-between gap-4">
                                                        <span className="text-xs font-semibold text-gray-900">Total Revenue:</span>
                                                        <span className="text-xs font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</span>
                                                      </div>
                                                      <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-1">
                                                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                          <span className="text-xs text-emerald-700">Subscription:</span>
                                                        </div>
                                                        <span className="text-xs font-semibold text-emerald-700">{formatCurrency(data.subscriptionRevenue)}</span>
                                                      </div>
                                                      <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-1">
                                                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                          <span className="text-xs text-blue-700">Counter:</span>
                                                        </div>
                                                        <span className="text-xs font-semibold text-blue-700">{formatCurrency(data.counterRevenue)}</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )
                                              }
                                              return null
                                            }}
                                          />
                                          <Line 
                                            type="monotone" 
                                            dataKey="totalRevenue" 
                                            stroke="#6366F1" 
                                            strokeWidth={2}
                                            dot={{ r: 3, fill: '#6366F1' }}
                                            activeDot={{ r: 5 }}
                                          />
                                          <Line 
                                            type="monotone" 
                                            dataKey="subscriptionRevenue" 
                                            stroke="#10B981" 
                                            strokeWidth={1.5}
                                            strokeDasharray="5 5"
                                            dot={{ r: 2, fill: '#10B981' }}
                                          />
                                          <Line 
                                            type="monotone" 
                                            dataKey="counterRevenue" 
                                            stroke="#3B82F6" 
                                            strokeWidth={1.5}
                                            strokeDasharray="5 5"
                                            dot={{ r: 2, fill: '#3B82F6' }}
                                          />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                    <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                                      <div className="flex items-center gap-1">
                                        <div className="w-3 h-0.5 bg-indigo-500"></div>
                                        <span className="text-muted-foreground">Total</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-3 h-0.5 bg-emerald-500" style={{ borderTop: '1.5px dashed' }}></div>
                                        <span className="text-muted-foreground">Subscription</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-3 h-0.5 bg-blue-500" style={{ borderTop: '1.5px dashed' }}></div>
                                        <span className="text-muted-foreground">Counter</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">Last 7 Days Trend</h4>
                                    <div className="h-[100px] flex items-center justify-center bg-muted/30 rounded-lg">
                                      <p className="text-sm text-muted-foreground">No sales data available for the last 7 days</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground text-sm">
                                Failed to load branch details
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown Toggle */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowDailyBreakdown(!showDailyBreakdown)}
          className="gap-2"
        >
          <Calendar className="h-4 w-4" />
          {showDailyBreakdown ? 'Hide' : 'Show'} Daily Breakdown
          {showDailyBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Daily Breakdown Section */}
      {showDailyBreakdown && dailyBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Daily Sales Breakdown (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyBreakdown.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getDate()}/${date.getMonth() + 1}`
                    }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCompactCurrency(value).replace('AED ', '')}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : formatNumber(value),
                      name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : 'Units'
                    ]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-AE', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    fill="#10B98150" 
                    stroke="#10B981" 
                    strokeWidth={2}
                  />
                  <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Day</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Units</th>
                    <th className="text-right p-2">Orders</th>
                    <th className="text-right p-2">AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyBreakdown.slice(0, 14).map((day, index) => (
                    <tr key={day.date} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                      <td className="p-2">{new Date(day.date).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })}</td>
                      <td className="p-2">
                        <Badge variant={day.dayOfWeek === 'Sat' || day.dayOfWeek === 'Sun' ? 'secondary' : 'outline'}>
                          {day.dayOfWeek}
                        </Badge>
                      </td>
                      <td className="text-right p-2 font-semibold">{formatCurrency(day.revenue)}</td>
                      <td className="text-right p-2">{formatNumber(day.units)}</td>
                      <td className="text-right p-2">{day.orders}</td>
                      <td className="text-right p-2">{formatCurrency(day.aov)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Metrics */}
      {subscriptionMetrics && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Subscription Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Unique Clients</p>
                <p className="text-xl font-bold">{subscriptionMetrics.thisMonth.uniqueClients}</p>
                <ChangeIndicator value={subscriptionMetrics.thisMonth.changes.clients} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subscription Revenue</p>
                <p className="text-xl font-bold">{formatCompactCurrency(subscriptionMetrics.thisMonth.revenue)}</p>
                <ChangeIndicator value={subscriptionMetrics.thisMonth.changes.revenue} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subscription Orders</p>
                <p className="text-xl font-bold">{subscriptionMetrics.thisMonth.orders}</p>
                <ChangeIndicator value={subscriptionMetrics.thisMonth.changes.orders} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Subscription Value</p>
                <p className="text-xl font-bold">{formatCurrency(subscriptionMetrics.thisMonth.aov)}</p>
              </div>
            </div>

            {/* Top Subscription Clients */}
            {subscriptionMetrics.topClients.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3">Top Subscription Clients</h4>
                <div className="space-y-2">
                  {subscriptionMetrics.topClients.map((client, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-6">{index + 1}</span>
                        <span className="text-sm font-medium">{client.client}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCompactCurrency(client.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{client.orders} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product & Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              Top Products by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {products.length > 0 ? (
                products.map((product, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-6">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.product}</p>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCompactCurrency(product.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{product.revenuePercentage}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">No product data</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Category Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {categories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="revenue"
                      nameKey="category"
                    >
                      {categories.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No category data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
