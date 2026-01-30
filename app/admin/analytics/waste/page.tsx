'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Trash2,
  Factory,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Truck,
  ShoppingCart,
  ArrowRight,
  Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface WasteSummary {
  thisWeek: { totalWaste: number; totalRevenue: number; wastePct: number }
  lastWeek: { totalWaste: number; totalRevenue: number; wastePct: number }
  change: number
  highWasteBranches: Array<{ branch: string; wastePct: number }>
  dateRange: {
    thisWeek: { start: string; end: string }
    lastWeek: { start: string; end: string }
  }
}

interface WasteByBranch {
  branch: string
  wasteAmount: number
  orderRevenue: number
  wastePct: number
  dataQuality: 'complete' | 'partial'
  cogs?: number
  revenue?: number
}

interface DailyWaste {
  date: string
  branch: string
  wasteAmount: number
  orderRevenue: number
  wastePct: number
}

interface WasteReason {
  reason: string
  cost: number
  occurrences: number
}

interface ProductionVariance {
  branches: Array<{
    branch: string
    received: number
    receivedCost: number
    sold: number
    revenue: number
    variance: number
    variancePct: number
    varianceCost: number
  }>
  centralKitchen: {
    produced: number
    transferred: number
    transferredCost: number
    variance: number
    variancePct: number
  }
  totals: {
    totalReceived: number
    totalSold: number
    totalVariance: number
    totalVarianceCost: number
  }
  dateRange: { start: string; end: string }
}

// Thresholds
const WASTE_THRESHOLDS = { good: 3.0, warning: 5.0 }
const VARIANCE_THRESHOLDS = { good: 5.0, warning: 10.0 }

function getWasteColor(pct: number) {
  if (pct < WASTE_THRESHOLDS.good) return 'text-green-600 bg-green-100'
  if (pct < WASTE_THRESHOLDS.warning) return 'text-yellow-600 bg-yellow-100'
  return 'text-red-600 bg-red-100'
}

function getVarianceColor(pct: number) {
  if (pct < VARIANCE_THRESHOLDS.good) return 'text-green-600 bg-green-100'
  if (pct < VARIANCE_THRESHOLDS.warning) return 'text-yellow-600 bg-yellow-100'
  return 'text-red-600 bg-red-100'
}

export default function WasteAnalyticsPage() {
  const { user, loading: authLoading } = useAuth({
    required: true,
    allowedRoles: ['admin', 'regional_manager', 'operations_lead'],
  })

  const [summary, setSummary] = useState<WasteSummary | null>(null)
  const [weeklyBranches, setWeeklyBranches] = useState<WasteByBranch[]>([])
  const [dailyData, setDailyData] = useState<DailyWaste[]>([])
  const [wasteReasons, setWasteReasons] = useState<WasteReason[]>([])
  const [productionData, setProductionData] = useState<ProductionVariance | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  
  // Date range state - default to current week
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, -1 = last week, etc.
  
  // Calculate week start/end based on offset
  const getWeekDates = (offset: number) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    
    // Calculate this week's start (Sunday)
    const thisWeekStart = new Date(today)
    if (dayOfWeek === 6) {
      thisWeekStart.setDate(today.getDate() - 6)
    } else if (dayOfWeek === 0) {
      thisWeekStart.setDate(today.getDate())
    } else {
      thisWeekStart.setDate(today.getDate() - dayOfWeek)
    }
    
    // Apply offset
    const weekStart = new Date(thisWeekStart)
    weekStart.setDate(thisWeekStart.getDate() + (offset * 7))
    
    // Week ends on Saturday (6 days after start)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    return {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
    }
  }
  
  const currentWeekDates = getWeekDates(weekOffset)

  const fetchData = async () => {
    try {
      setRefreshing(true)

      const dateParams = `?weekStart=${currentWeekDates.start}&weekEnd=${currentWeekDates.end}`

      const [summaryRes, weeklyRes, dailyRes, productionRes] = await Promise.all([
        fetch('/api/analytics/waste/summary'),
        fetch('/api/analytics/waste/weekly'),
        fetch(`/api/analytics/waste/daily?branch=${selectedBranch}&days=7`),
        fetch(`/api/analytics/waste/production${dateParams}`),
      ])

      if (summaryRes.ok) {
        const data = await summaryRes.json()
        setSummary(data)
      }

      if (weeklyRes.ok) {
        const data = await weeklyRes.json()
        setWeeklyBranches(data.branches || [])
      }

      if (dailyRes.ok) {
        const data = await dailyRes.json()
        setDailyData(data.dailyData || [])
        setWasteReasons(data.topWasteReasons || [])
      }

      if (productionRes.ok) {
        const data = await productionRes.json()
        setProductionData(data)
      }
    } catch (error) {
      console.error('Failed to fetch waste analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, selectedBranch, weekOffset])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading waste analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-primary" />
              Waste Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor waste percentages (calculated against expected COGS from recipes) and production variance across branches
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Week Navigation */}
          <div className="flex items-center gap-2 border rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(weekOffset - 1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 text-sm">
              {weekOffset === 0 ? (
                <span className="font-medium">This Week</span>
              ) : weekOffset === -1 ? (
                <span className="font-medium">Last Week</span>
              ) : weekOffset < 0 ? (
                <span className="font-medium">{Math.abs(weekOffset)} Weeks Ago</span>
              ) : (
                <span className="font-medium">{weekOffset} Week(s) Ahead</span>
              )}
              <div className="text-xs text-muted-foreground">
                {formatDate(currentWeekDates.start)} - {formatDate(currentWeekDates.end)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(weekOffset + 1)}
              disabled={weekOffset >= 0}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* This Week Waste */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week Waste</p>
                  <p className={cn(
                    'text-3xl font-bold',
                    summary.thisWeek.wastePct >= WASTE_THRESHOLDS.warning ? 'text-red-600' :
                    summary.thisWeek.wastePct >= WASTE_THRESHOLDS.good ? 'text-yellow-600' : 'text-green-600'
                  )}>
                    {summary.thisWeek.wastePct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(summary.thisWeek.totalWaste)} waste / {formatCurrency(summary.thisWeek.totalRevenue)} COGS
                  </p>
                </div>
                <Trash2 className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>

          {/* Week-over-Week Change */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">vs Last Week</p>
                  <div className="flex items-center gap-2">
                    {summary.change > 0 ? (
                      <TrendingUp className="h-5 w-5 text-red-500" />
                    ) : summary.change < 0 ? (
                      <TrendingDown className="h-5 w-5 text-green-500" />
                    ) : null}
                    <p className={cn(
                      'text-3xl font-bold',
                      summary.change > 0 ? 'text-red-600' : summary.change < 0 ? 'text-green-600' : 'text-gray-600'
                    )}>
                      {summary.change > 0 ? '+' : ''}{summary.change.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last week: {summary.lastWeek.wastePct.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* High Waste Branches */}
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground">High Waste Alerts</p>
                <p className="text-3xl font-bold text-red-600">
                  {summary.highWasteBranches.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Branches above 5% threshold
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} Weeks Ago`}
                  </p>
                  <p className="text-lg font-semibold">
                    {formatDate(currentWeekDates.start)} - {formatDate(currentWeekDates.end)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {weekOffset === 0 ? 'Current analysis period' : 'Historical data'}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for Direct Waste vs Production Variance */}
      <Tabs defaultValue="direct" className="space-y-4">
        <TabsList>
          <TabsTrigger value="direct" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Direct Waste
          </TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Production Variance
          </TabsTrigger>
        </TabsList>

        {/* Direct Waste Tab */}
        <TabsContent value="direct" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Branch Waste Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Weekly Waste by Branch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weeklyBranches.length > 0 ? (
                    weeklyBranches.map((branch, idx) => (
                      <div
                        key={branch.branch}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-gray-100 text-gray-600' :
                            idx === 2 ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-50 text-slate-500'
                          )}>
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">{branch.branch}</p>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>
                                Waste: {formatCurrency(branch.wasteAmount)} • COGS: {formatCurrency(branch.cogs || branch.orderRevenue)}
                              </p>
                              <p className="flex items-center gap-2">
                                <span>Calculation: {formatCurrency(branch.wasteAmount)} ÷ {formatCurrency(branch.cogs || branch.orderRevenue)} = {branch.wastePct.toFixed(1)}%</span>
                              </p>
                              {branch.revenue && branch.cogs && (
                                <p className="text-[11px] text-muted-foreground/80">
                                  Food Cost: {((branch.cogs / branch.revenue) * 100).toFixed(1)}% of {formatCurrency(branch.revenue)} revenue
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={cn(
                          'px-3 py-1 rounded-full text-sm font-bold',
                          getWasteColor(branch.wastePct)
                        )}>
                          {branch.wastePct.toFixed(1)}%
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No waste data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Waste Reasons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Waste Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                {wasteReasons.length > 0 ? (
                  <div className="space-y-3">
                    {wasteReasons.map((reason, idx) => (
                      <div key={reason.reason} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{idx + 1}.</span>
                          <span className="text-sm">{reason.reason}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCurrency(reason.cost)}</p>
                          <p className="text-xs text-muted-foreground">{reason.occurrences} times</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No waste reason data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* High Waste Alerts */}
          {summary && summary.highWasteBranches.length > 0 && (
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  High Waste Alerts ({'>'}5%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {summary.highWasteBranches.map(b => (
                    <Badge key={b.branch} variant="destructive">
                      {b.branch}: {b.wastePct.toFixed(1)}%
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Production Variance Tab */}
        <TabsContent value="production" className="space-y-6">
          {productionData && (
            <>
              {/* Central Kitchen Stats */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Factory className="h-4 w-4 text-blue-600" />
                    Central Kitchen Production
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-700">
                        {productionData.centralKitchen.produced.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600">Produced</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">
                        {productionData.centralKitchen.transferred.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600">Transferred</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-700">
                        {productionData.centralKitchen.variance.toLocaleString()}
                      </p>
                      <p className="text-xs text-amber-600">Variance</p>
                    </div>
                    <div className={cn(
                      'text-center p-4 rounded-lg',
                      getVarianceColor(productionData.centralKitchen.variancePct)
                    )}>
                      <p className="text-2xl font-bold">
                        {productionData.centralKitchen.variancePct.toFixed(1)}%
                      </p>
                      <p className="text-xs">Variance %</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Branch Variance Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Branch Variance (Received vs Sold)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Branch</th>
                          <th className="text-right py-3 px-2">Received</th>
                          <th className="text-right py-3 px-2">Sold</th>
                          <th className="text-right py-3 px-2">Variance</th>
                          <th className="text-right py-3 px-2">Variance %</th>
                          <th className="text-right py-3 px-2">Est. Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productionData.branches.map(branch => (
                          <tr key={branch.branch} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2 font-medium">{branch.branch}</td>
                            <td className="text-right py-3 px-2">{branch.received.toLocaleString()}</td>
                            <td className="text-right py-3 px-2">{branch.sold.toLocaleString()}</td>
                            <td className="text-right py-3 px-2">{branch.variance.toLocaleString()}</td>
                            <td className="text-right py-3 px-2">
                              <span className={cn(
                                'px-2 py-0.5 rounded text-xs font-bold',
                                getVarianceColor(branch.variancePct)
                              )}>
                                {branch.variancePct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-right py-3 px-2 text-muted-foreground">
                              {formatCurrency(branch.varianceCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-muted/50">
                          <td className="py-3 px-2">Total</td>
                          <td className="text-right py-3 px-2">{productionData.totals.totalReceived.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{productionData.totals.totalSold.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">{productionData.totals.totalVariance.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">
                            {productionData.totals.totalReceived > 0
                              ? ((productionData.totals.totalVariance / productionData.totals.totalReceived) * 100).toFixed(1)
                              : 0}%
                          </td>
                          <td className="text-right py-3 px-2">{formatCurrency(productionData.totals.totalVarianceCost)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
