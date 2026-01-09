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
} from 'recharts'

interface SummaryData {
  today: {
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
  thisWeek: {
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
    aov: number
    changes: {
      revenue: number
      units: number
      orders: number
      aov: number
    }
  }
  lastMonth: {
    revenue: number
    units: number
    orders: number
  }
}

interface TrendData {
  date: string
  revenue: number
  units: number
  orders: number
  revenueMA7: number
}

interface BranchData {
  branch: string
  revenue: number
  units: number
  orders: number
  percentage: number
}

interface CategoryData {
  category: string
  revenue: number
  units: number
  percentage: number
  color: string
}

interface ProductData {
  product: string
  category: string
  revenue: number
  units: number
  revenuePercentage: number
}

interface ClientData {
  client: string
  revenue: number
  orders: number
  avgOrderValue: number
  percentage: number
}

type Period = 'today' | 'week' | 'month' | 'year'

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [trends, setTrends] = useState<TrendData[]>([])
  const [branches, setBranches] = useState<BranchData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [products, setProducts] = useState<ProductData[]>([])
  const [clients, setClients] = useState<ClientData[]>([])
  const [period, setPeriod] = useState<Period>('month')
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchAllData()
  }, [period])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      const [summaryRes, trendsRes, branchesRes, categoriesRes, productsRes, clientsRes] = await Promise.all([
        fetch('/api/analytics/summary'),
        fetch(`/api/analytics/trends?days=${period === 'year' ? 365 : period === 'month' ? 30 : period === 'week' ? 7 : 1}`),
        fetch(`/api/analytics/branches?period=${period}`),
        fetch(`/api/analytics/categories?period=${period}`),
        fetch(`/api/analytics/products?period=${period}&limit=5`),
        fetch(`/api/analytics/clients?period=${period}&limit=5`),
      ])

      const [summaryData, trendsData, branchesData, categoriesData, productsData, clientsData] = await Promise.all([
        summaryRes.json(),
        trendsRes.json(),
        branchesRes.json(),
        categoriesRes.json(),
        productsRes.json(),
        clientsRes.json(),
      ])

      setSummary(summaryData)
      setTrends(trendsData.trends || [])
      setBranches(branchesData.branches || [])
      setCategories(categoriesData.categories || [])
      setProducts(productsData.topByRevenue || [])
      setClients(clientsData.clients || [])
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoading(false)
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

  const getDisplayData = () => {
    if (!summary) return null
    switch (period) {
      case 'today':
        return summary.today
      case 'week':
        return { ...summary.thisWeek, aov: 0, changes: { ...summary.thisWeek.changes, aov: 0 } }
      default:
        return summary.thisMonth
    }
  }

  const displayData = getDisplayData()

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="icon" onClick={fetchAllData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCompactCurrency(displayData?.revenue || 0)}
                </p>
                <div className="mt-1">
                  <ChangeIndicator value={displayData?.changes.revenue || 0} />
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Units Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Units Sold</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatNumber(displayData?.units || 0)}
                </p>
                <div className="mt-1">
                  <ChangeIndicator value={displayData?.changes.units || 0} />
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orders</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatNumber(displayData?.orders || 0)}
                </p>
                <div className="mt-1">
                  <ChangeIndicator value={displayData?.changes.orders || 0} />
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AOV Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(displayData?.aov || (displayData?.orders ? displayData.revenue / displayData.orders : 0))}
                </p>
                <div className="mt-1">
                  <ChangeIndicator value={displayData?.changes.aov || 0} />
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return `${date.getDate()}/${date.getMonth() + 1}`
                      }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCompactCurrency(value).replace('AED ', '')}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value), 
                        name === 'revenue' ? 'Daily Revenue' : '7-Day Average'
                      ]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-AE', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      name="revenue"
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenueMA7" 
                      name="revenueMA7"
                      stroke="#6EE7B7" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Branch Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Branch Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {branches.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branches.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => formatCompactCurrency(value).replace('AED ', '')}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="branch" 
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No branch data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              Categories
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

        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {products.length > 0 ? (
                products.map((product, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}</span>
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

        {/* Top Clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-600" />
              Top Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clients.length > 0 ? (
                clients.map((client, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.client}</p>
                      <p className="text-xs text-muted-foreground">{client.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCompactCurrency(client.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{client.percentage}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">No client data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary Card */}
      {summary && (
        <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-dashed">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Last Month Revenue</p>
                <p className="text-lg font-bold">{formatCompactCurrency(summary.lastMonth.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Month Revenue</p>
                <p className="text-lg font-bold">{formatCompactCurrency(summary.thisMonth.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Month-over-Month</p>
                <p className="text-lg font-bold">
                  <ChangeIndicator value={summary.thisMonth.changes.revenue} />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orders This Month</p>
                <p className="text-lg font-bold">{formatNumber(summary.thisMonth.orders)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

