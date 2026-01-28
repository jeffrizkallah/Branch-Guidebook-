'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Factory,
  Truck,
  ShoppingCart,
  AlertTriangle,
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface BranchVariance {
  branch: string
  received: number
  receivedCost: number
  sold: number
  revenue: number
  variance: number
  variancePct: number
  varianceCost: number
}

interface CentralKitchenData {
  produced: number
  transferred: number
  transferredCost: number
  variance: number
  variancePct: number
}

interface ProductionVarianceData {
  branches: BranchVariance[]
  centralKitchen: CentralKitchenData
  totals: {
    totalReceived: number
    totalSold: number
    totalVariance: number
    totalVarianceCost: number
  }
  dateRange: {
    start: string
    end: string
  }
}

interface ProductionVarianceWidgetProps {
  variant?: 'summary' | 'detailed' | 'ck-only'
  branches?: string[]
  showLink?: boolean
  className?: string
}

// Variance thresholds (positive variance = unsold/wasted)
const VARIANCE_THRESHOLDS = {
  good: 5.0,      // Green: < 5%
  warning: 10.0,  // Yellow: 5-10%, Red: > 10%
}

function getVarianceColor(variancePct: number): string {
  if (variancePct < VARIANCE_THRESHOLDS.good) return 'text-green-600 bg-green-100'
  if (variancePct < VARIANCE_THRESHOLDS.warning) return 'text-yellow-600 bg-yellow-100'
  return 'text-red-600 bg-red-100'
}

function getVarianceBadgeVariant(variancePct: number): 'default' | 'secondary' | 'destructive' {
  if (variancePct < VARIANCE_THRESHOLDS.good) return 'secondary'
  if (variancePct < VARIANCE_THRESHOLDS.warning) return 'default'
  return 'destructive'
}

export function ProductionVarianceWidget({
  variant = 'summary',
  branches,
  showLink = true,
  className,
}: ProductionVarianceWidgetProps) {
  const [data, setData] = useState<ProductionVarianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper to normalize branch names for matching
  const normalizeBranchName = (name: string): string => {
    return name.toLowerCase().replace(/[_\-\s]+/g, ' ').trim()
  }

  // Stabilize branches array to prevent unnecessary re-fetches
  const branchesKey = branches ? branches.sort().join(',') : ''

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/analytics/waste/production')
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to fetch production variance')
        }
        const responseData = await res.json()

        // Filter branches if specified using normalized names for better matching
        if (branches && branches.length > 0) {
          responseData.branches = responseData.branches.filter((b: BranchVariance) =>
            branches.some(slug => {
              const normalizedBranch = normalizeBranchName(b.branch)
              const normalizedSlug = normalizeBranchName(slug)
              return normalizedBranch.includes(normalizedSlug) ||
                     normalizedSlug.includes(normalizedBranch) ||
                     normalizedBranch === normalizedSlug
            })
          )
        }

        setData(responseData)
      } catch (err) {
        console.error('ProductionVarianceWidget error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load production data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [branchesKey]) // Use stable branchesKey instead of branches array

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Production Variance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Production Variance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  // Summary variant - overall variance stats
  if (variant === 'summary') {
    const overallVariancePct = data.totals.totalReceived > 0
      ? (data.totals.totalVariance / data.totals.totalReceived) * 100
      : 0

    const highVarianceBranches = data.branches.filter(b => b.variancePct > VARIANCE_THRESHOLDS.warning)

    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Production Variance
            {showLink && (
              <Link href="/admin/analytics/waste" className="ml-auto">
                <ChevronRight className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </Link>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Flow visualization */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <div className="flex items-center gap-1">
              <Truck className="h-3 w-3" />
              <span>Received</span>
            </div>
            <ArrowRight className="h-3 w-3" />
            <div className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              <span>Sold</span>
            </div>
            <span>=</span>
            <span>Variance</span>
          </div>

          <div className="flex items-center justify-between text-sm mb-3">
            <span>{data.totals.totalReceived.toLocaleString()}</span>
            <span>-</span>
            <span>{data.totals.totalSold.toLocaleString()}</span>
            <span>=</span>
            <span className={cn(
              'font-bold',
              overallVariancePct >= VARIANCE_THRESHOLDS.warning ? 'text-red-600' :
              overallVariancePct >= VARIANCE_THRESHOLDS.good ? 'text-yellow-600' : 'text-green-600'
            )}>
              {data.totals.totalVariance.toLocaleString()} ({overallVariancePct.toFixed(1)}%)
            </span>
          </div>

          <p className="text-xs text-gray-500">
            Estimated variance cost: AED {data.totals.totalVarianceCost.toLocaleString()}
          </p>

          {highVarianceBranches.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-1 text-xs text-red-600 mb-1">
                <AlertTriangle className="h-3 w-3" />
                High variance ({'>'}10%)
              </div>
              <div className="flex flex-wrap gap-1">
                {highVarianceBranches.slice(0, 3).map(b => (
                  <Badge key={b.branch} variant="destructive" className="text-xs">
                    {b.branch}: {b.variancePct.toFixed(1)}%
                  </Badge>
                ))}
                {highVarianceBranches.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{highVarianceBranches.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Detailed variant - includes branch breakdown
  if (variant === 'detailed') {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Production Variance by Branch
            {showLink && (
              <Link href="/admin/analytics/waste" className="ml-auto">
                <ChevronRight className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </Link>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Central Kitchen stats */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Factory className="h-4 w-4" />
              Central Kitchen
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Produced</p>
                <p className="font-medium">{data.centralKitchen.produced.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Transferred</p>
                <p className="font-medium">{data.centralKitchen.transferred.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Variance</p>
                <p className={cn(
                  'font-medium',
                  data.centralKitchen.variancePct >= VARIANCE_THRESHOLDS.warning ? 'text-red-600' :
                  data.centralKitchen.variancePct >= VARIANCE_THRESHOLDS.good ? 'text-yellow-600' : 'text-green-600'
                )}>
                  {data.centralKitchen.variance.toLocaleString()} ({data.centralKitchen.variancePct.toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>

          {/* Branch breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Branch Variance (Received vs Sold)</p>
            {data.branches.slice(0, 5).map(b => (
              <div key={b.branch} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{b.branch}</span>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{b.received.toLocaleString()}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{b.sold.toLocaleString()}</span>
                </div>
                <Badge variant={getVarianceBadgeVariant(b.variancePct)} className="ml-2">
                  {b.variancePct.toFixed(1)}%
                </Badge>
              </div>
            ))}
            {data.branches.length > 5 && (
              <p className="text-xs text-gray-400">+{data.branches.length - 5} more branches</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // CK-only variant - just central kitchen stats
  if (variant === 'ck-only') {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Central Kitchen Production
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{data.centralKitchen.produced.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Produced</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{data.centralKitchen.transferred.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Transferred</p>
            </div>
            <div>
              <p className={cn(
                'text-2xl font-bold',
                data.centralKitchen.variancePct >= VARIANCE_THRESHOLDS.warning ? 'text-red-600' :
                data.centralKitchen.variancePct >= VARIANCE_THRESHOLDS.good ? 'text-yellow-600' : 'text-green-600'
              )}>
                {data.centralKitchen.variancePct.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">Variance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
