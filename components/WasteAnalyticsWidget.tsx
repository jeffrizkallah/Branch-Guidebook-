'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Minus,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface WasteSummary {
  thisWeek: {
    totalWaste: number
    totalRevenue: number
    wastePct: number
  }
  lastWeek: {
    totalWaste: number
    totalRevenue: number
    wastePct: number
  }
  change: number
  highWasteBranches: Array<{ branch: string; wastePct: number }>
}

interface WasteByBranch {
  branch: string
  wasteAmount: number
  cogs: number
  orderRevenue: number
  wastePct: number
  dataQuality: 'complete' | 'partial'
}

interface WasteAnalyticsWidgetProps {
  variant?: 'summary' | 'detailed' | 'branch-list'
  branches?: string[] // Filter to specific branches (for branch managers)
  showLink?: boolean
  className?: string
}

// Waste percentage thresholds
const WASTE_THRESHOLDS = {
  good: 3.0,      // Green: < 3%
  warning: 5.0,   // Yellow: 3-5%, Red: > 5%
}

function getWasteColor(wastePct: number): string {
  if (wastePct < WASTE_THRESHOLDS.good) return 'text-green-600 bg-green-100'
  if (wastePct < WASTE_THRESHOLDS.warning) return 'text-yellow-600 bg-yellow-100'
  return 'text-red-600 bg-red-100'
}

function getWasteBadgeVariant(wastePct: number): 'default' | 'secondary' | 'destructive' {
  if (wastePct < WASTE_THRESHOLDS.good) return 'secondary'
  if (wastePct < WASTE_THRESHOLDS.warning) return 'default'
  return 'destructive'
}

export function WasteAnalyticsWidget({
  variant = 'summary',
  branches,
  showLink = true,
  className,
}: WasteAnalyticsWidgetProps) {
  const [summary, setSummary] = useState<WasteSummary | null>(null)
  const [branchData, setBranchData] = useState<WasteByBranch[]>([])
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

        if (variant === 'summary' || variant === 'detailed') {
          const summaryRes = await fetch('/api/analytics/waste/summary')
          if (!summaryRes.ok) {
            const errorData = await summaryRes.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to fetch waste summary')
          }
          const summaryData = await summaryRes.json()
          setSummary(summaryData)
        }

        if (variant === 'detailed' || variant === 'branch-list') {
          const weeklyRes = await fetch('/api/analytics/waste/weekly')
          if (!weeklyRes.ok) {
            const errorData = await weeklyRes.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to fetch weekly waste')
          }
          const weeklyData = await weeklyRes.json()

          let filteredBranches = weeklyData.branches || []
          if (branches && branches.length > 0) {
            // Use normalized branch names for more reliable matching
            filteredBranches = filteredBranches.filter((b: WasteByBranch) =>
              branches.some(slug => {
                const normalizedBranch = normalizeBranchName(b.branch)
                const normalizedSlug = normalizeBranchName(slug)
                return normalizedBranch.includes(normalizedSlug) ||
                       normalizedSlug.includes(normalizedBranch) ||
                       normalizedBranch === normalizedSlug
              })
            )
          }
          setBranchData(filteredBranches)
        }
      } catch (err) {
        console.error('WasteAnalyticsWidget error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load waste data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [variant, branchesKey]) // Use stable branchesKey instead of branches array

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Waste Analytics
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
            <Trash2 className="h-4 w-4" />
            Waste Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // Summary variant - simple card with overall waste %
  if (variant === 'summary' && summary) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Waste This Week
            {showLink && (
              <Link href="/admin/analytics/waste" className="ml-auto">
                <ChevronRight className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </Link>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'text-2xl font-bold',
              summary.thisWeek.wastePct >= WASTE_THRESHOLDS.warning ? 'text-red-600' :
              summary.thisWeek.wastePct >= WASTE_THRESHOLDS.good ? 'text-yellow-600' : 'text-green-600'
            )}>
              {summary.thisWeek.wastePct.toFixed(1)}%
            </span>
            <div className="flex items-center gap-1 text-sm">
              {summary.change > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">+{summary.change.toFixed(1)}%</span>
                </>
              ) : summary.change < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">{summary.change.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <Minus className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-400">0%</span>
                </>
              )}
              <span className="text-gray-400 text-xs">vs last week</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-1">
            AED {summary.thisWeek.totalWaste.toLocaleString()} waste / AED {summary.thisWeek.totalRevenue.toLocaleString()} COGS
          </p>

          {summary.highWasteBranches.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-1 text-xs text-red-600 mb-1">
                <AlertTriangle className="h-3 w-3" />
                High waste alerts ({'>'}5%)
              </div>
              <div className="flex flex-wrap gap-1">
                {summary.highWasteBranches.slice(0, 3).map(b => (
                  <Badge key={b.branch} variant="destructive" className="text-xs">
                    {b.branch}: {b.wastePct.toFixed(1)}%
                  </Badge>
                ))}
                {summary.highWasteBranches.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{summary.highWasteBranches.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Detailed variant - summary + branch list
  if (variant === 'detailed' && summary) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Waste Analytics
            {showLink && (
              <Link href="/admin/analytics/waste" className="ml-auto">
                <ChevronRight className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </Link>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall stats */}
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'text-2xl font-bold',
              summary.thisWeek.wastePct >= WASTE_THRESHOLDS.warning ? 'text-red-600' :
              summary.thisWeek.wastePct >= WASTE_THRESHOLDS.good ? 'text-yellow-600' : 'text-green-600'
            )}>
              {summary.thisWeek.wastePct.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">overall waste</span>
          </div>

          {/* Branch breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">By Branch</p>
            {branchData.slice(0, 5).map(b => (
              <div key={b.branch} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{b.branch}</span>
                <Badge variant={getWasteBadgeVariant(b.wastePct)} className="ml-2">
                  {b.wastePct.toFixed(1)}%
                </Badge>
              </div>
            ))}
            {branchData.length > 5 && (
              <p className="text-xs text-gray-400">+{branchData.length - 5} more branches</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Branch list variant - just the list for branch managers
  if (variant === 'branch-list') {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Weekly Waste %
          </CardTitle>
        </CardHeader>
        <CardContent>
          {branchData.length === 0 ? (
            <p className="text-sm text-gray-500">No waste data available</p>
          ) : (
            <div className="space-y-2">
              {branchData.map(b => (
                <div key={b.branch} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.branch}</p>
                    <p className="text-xs text-gray-500">
                      AED {b.wasteAmount.toFixed(2)} / AED {(b.cogs || b.orderRevenue).toLocaleString()}
                    </p>
                  </div>
                  <div className={cn(
                    'px-2 py-1 rounded text-sm font-medium',
                    getWasteColor(b.wastePct)
                  )}>
                    {b.wastePct.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return null
}
