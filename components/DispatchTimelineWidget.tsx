'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  Truck, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BranchDispatch {
  branchSlug: string
  branchName: string
  status: 'pending' | 'packing' | 'dispatched' | 'receiving' | 'completed'
  items: Array<{
    packedChecked: boolean
    receivedChecked: boolean
  }>
  packingStartedAt: string | null
}

interface Dispatch {
  id: string
  deliveryDate: string
  branchDispatches: BranchDispatch[]
}

interface DispatchTimelineWidgetProps {
  dispatches: Dispatch[]
  className?: string
  showManageButton?: boolean
  maxBranches?: number
}

interface BranchProgress {
  name: string
  shortName: string
  status: BranchDispatch['status']
  percentage: number
  phase: 'packing' | 'receiving'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

// Compact horizontal progress bar for list view
function CompactProgressBar({ percentage, status }: { percentage: number; status: 'not-started' | 'in-progress' | 'completed' | 'dispatched' }) {
  return (
    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden min-w-[40px]">
      <div 
        className={cn(
          "h-full rounded-full transition-all duration-300",
          status === 'completed' ? 'bg-green-500' :
          status === 'in-progress' ? 'bg-blue-500' :
          status === 'dispatched' ? 'bg-amber-500' :
          'bg-gray-300'
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export function DispatchTimelineWidget({ 
  dispatches, 
  className,
  showManageButton = true,
  maxBranches = 20
}: DispatchTimelineWidgetProps) {
  // Get the most recent active dispatch
  const activeDispatch = useMemo(() => {
    // Sort by delivery date (most recent first)
    const sorted = [...dispatches].sort((a, b) => 
      new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
    )
    
    // Find the first dispatch that's not fully completed
    return sorted.find(d => 
      d.branchDispatches.some(bd => bd.status !== 'completed')
    ) || sorted[0]
  }, [dispatches])
  
  // Calculate progress for each branch
  const branchProgress: BranchProgress[] = useMemo(() => {
    if (!activeDispatch) return []
    
    return activeDispatch.branchDispatches.map(bd => {
      const totalItems = bd.items.length
      const packedItems = bd.items.filter(i => i.packedChecked).length
      const receivedItems = bd.items.filter(i => i.receivedChecked).length
      
      const isPacking = bd.status === 'pending' || bd.status === 'packing'
      const percentage = isPacking 
        ? (totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0)
        : (totalItems > 0 ? Math.round((receivedItems / totalItems) * 100) : 0)
      
      return {
        name: bd.branchName,
        shortName: bd.branchName.replace('ISC ', '').replace('Ice Cream ', ''),
        status: bd.status,
        percentage: bd.status === 'completed' ? 100 : percentage,
        phase: (isPacking ? 'packing' : 'receiving') as 'packing' | 'receiving'
      }
    }).sort((a, b) => {
      // Sort: in-progress first, then by percentage (lowest first), then completed last
      if (a.status === 'completed' && b.status !== 'completed') return 1
      if (a.status !== 'completed' && b.status === 'completed') return -1
      if ((a.status === 'packing' || a.status === 'receiving') && 
          (b.status !== 'packing' && b.status !== 'receiving')) return -1
      if ((b.status === 'packing' || b.status === 'receiving') && 
          (a.status !== 'packing' && a.status !== 'receiving')) return 1
      return a.percentage - b.percentage
    })
  }, [activeDispatch])
  
  // Stats
  const stats = useMemo(() => {
    if (!activeDispatch) return { pending: 0, packing: 0, dispatched: 0, receiving: 0, completed: 0, total: 0 }
    
    const bds = activeDispatch.branchDispatches
    return {
      pending: bds.filter(bd => bd.status === 'pending').length,
      packing: bds.filter(bd => bd.status === 'packing').length,
      dispatched: bds.filter(bd => bd.status === 'dispatched').length,
      receiving: bds.filter(bd => bd.status === 'receiving').length,
      completed: bds.filter(bd => bd.status === 'completed').length,
      total: bds.length
    }
  }, [activeDispatch])
  
  const inProgress = stats.packing + stats.receiving
  const allCompleted = stats.completed === stats.total && stats.total > 0
  
  if (!activeDispatch || dispatches.length === 0) {
    return (
      <Card className={cn("border-l-4 border-l-amber-500", className)}>
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-amber-600" />
            Dispatch Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active dispatches</p>
          </div>
          {showManageButton && (
            <Link href="/dispatch" className="block mt-2">
              <Button variant="outline" size="sm" className="w-full text-xs gap-2">
                <Package className="h-3.5 w-3.5" />
                Manage Dispatches
                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className={cn("border-l-4 border-l-amber-500", className)}>
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-amber-600" />
            <span>Dispatch Progress</span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px] px-1.5">
            {formatDate(activeDispatch.deliveryDate)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {/* Summary row */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-3">
            {inProgress > 0 && (
              <span className="flex items-center gap-1 text-blue-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                {inProgress} active
              </span>
            )}
            {stats.pending > 0 && (
              <span className="text-muted-foreground">{stats.pending} pending</span>
            )}
          </div>
          <span className={cn(
            "font-medium",
            allCompleted ? "text-green-600" : "text-muted-foreground"
          )}>
            {stats.completed}/{stats.total} done
          </span>
        </div>
        
        {/* Compact list view - handles high branch counts */}
        <div className="space-y-0.5 mb-3 max-h-[280px] overflow-y-auto pr-1">
          {branchProgress.slice(0, maxBranches).map(branch => {
            const isActive = branch.status === 'packing' || branch.status === 'receiving'
            const isCompleted = branch.status === 'completed'
            const isDispatched = branch.status === 'dispatched'
            const progressStatus = isCompleted ? 'completed' : isActive ? 'in-progress' : isDispatched ? 'dispatched' : 'not-started'
            
            return (
              <div 
                key={branch.name}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-md transition-colors",
                  isCompleted ? "bg-green-50/50" :
                  isActive ? "bg-blue-50/50" :
                  isDispatched ? "bg-amber-50/50" :
                  "bg-muted/30"
                )}
              >
                {/* Status indicator dot */}
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  isCompleted ? "bg-green-500" :
                  isActive ? "bg-blue-500" :
                  isDispatched ? "bg-amber-500" :
                  "bg-gray-300"
                )}>
                  {isActive && (
                    <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                  )}
                </div>
                
                {/* Branch name */}
                <span className={cn(
                  "text-[10px] font-medium truncate min-w-[60px] max-w-[80px]",
                  isActive ? "text-blue-700" :
                  isCompleted ? "text-green-700" :
                  "text-foreground"
                )} title={branch.name}>
                  {branch.shortName}
                </span>
                
                {/* Progress bar */}
                <CompactProgressBar percentage={branch.percentage} status={progressStatus} />
                
                {/* Percentage or checkmark */}
                <div className="w-8 text-right shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />
                  ) : (
                    <span className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-blue-600" : 
                      isDispatched ? "text-amber-600" :
                      "text-muted-foreground"
                    )}>
                      {branch.percentage}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Compact inline legend */}
        <div className="flex items-center justify-center gap-2 text-[8px] text-muted-foreground mb-2">
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>Pending</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Active</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>In Transit</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Done</span>
        </div>
        
        {/* Action button */}
        {showManageButton && (
          <Link href={`/dispatch/${activeDispatch.id}/report`} className="block">
            <Button variant="outline" size="sm" className="w-full text-xs gap-2 h-8">
              <Package className="h-3.5 w-3.5" />
              View Full Report
              <ArrowRight className="h-3.5 w-3.5 ml-auto" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
