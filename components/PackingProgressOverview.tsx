'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  User,
  AlertTriangle,
  Truck
} from 'lucide-react'
import type { BranchDispatch } from '@/lib/data'
import { cn } from '@/lib/utils'

interface PackingProgressOverviewProps {
  branchDispatches: BranchDispatch[]
  className?: string
}

interface BranchProgress {
  branchSlug: string
  branchName: string
  status: BranchDispatch['status']
  // Packing progress
  packingItemsChecked: number
  packingTotalItems: number
  packingPercentage: number
  packingStartedAt: string | null
  packingCompletedAt: string | null
  packingTimeElapsed: number | null // in minutes
  packedBy: string | null
  // Receiving progress
  receivingItemsChecked: number
  receivingPercentage: number
  receivingStartedAt: string | null
  receivedAt: string | null
  receivingTimeElapsed: number | null
  receivedBy: string | null
  // Overall
  totalItems: number
  currentPhase: 'not-started' | 'packing' | 'dispatched' | 'receiving' | 'completed'
}

function calculateProgress(branchDispatches: BranchDispatch[]): BranchProgress[] {
  return branchDispatches.map(bd => {
    const packingItemsChecked = bd.items.filter(item => item.packedChecked).length
    const receivingItemsChecked = bd.items.filter(item => item.receivedChecked).length
    const totalItems = bd.items.length
    
    const packingPercentage = totalItems > 0 ? Math.round((packingItemsChecked / totalItems) * 100) : 0
    const receivingPercentage = totalItems > 0 ? Math.round((receivingItemsChecked / totalItems) * 100) : 0
    
    const now = Date.now()
    const packingTimeElapsed = bd.packingStartedAt 
      ? Math.round((now - new Date(bd.packingStartedAt).getTime()) / 60000)
      : null
    const receivingTimeElapsed = bd.receivingStartedAt 
      ? Math.round((now - new Date(bd.receivingStartedAt).getTime()) / 60000)
      : null
    
    let currentPhase: BranchProgress['currentPhase'] = 'not-started'
    if (bd.status === 'completed') {
      currentPhase = 'completed'
    } else if (bd.status === 'receiving') {
      currentPhase = 'receiving'
    } else if (bd.status === 'dispatched') {
      currentPhase = 'dispatched'
    } else if (bd.status === 'packing') {
      currentPhase = 'packing'
    }
    
    return {
      branchSlug: bd.branchSlug,
      branchName: bd.branchName,
      status: bd.status,
      packingItemsChecked,
      packingTotalItems: totalItems,
      packingPercentage,
      packingStartedAt: bd.packingStartedAt,
      packingCompletedAt: bd.packingCompletedAt,
      packingTimeElapsed,
      packedBy: bd.packedBy,
      receivingItemsChecked,
      receivingPercentage,
      receivingStartedAt: bd.receivingStartedAt,
      receivedAt: bd.receivedAt,
      receivingTimeElapsed,
      receivedBy: bd.receivedBy,
      totalItems,
      currentPhase,
    }
  })
}

function formatTimeElapsed(minutes: number | null): string {
  if (minutes === null) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })
}

// Progress bar component
function ProgressBar({ 
  percentage, 
  status,
  showPercentage = true,
  size = 'md'
}: { 
  percentage: number
  status: 'not-started' | 'in-progress' | 'completed'
  showPercentage?: boolean
  size?: 'sm' | 'md'
}) {
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2'
  
  return (
    <div className="flex items-center gap-2 w-full">
      <div className={cn("flex-1 bg-muted rounded-full overflow-hidden", heightClass)}>
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            status === 'completed' ? 'bg-green-500' :
            status === 'in-progress' ? 'bg-blue-500 animate-pulse' :
            'bg-gray-300'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <span className={cn(
          "text-xs font-medium shrink-0 w-10 text-right",
          status === 'completed' ? 'text-green-600' :
          status === 'in-progress' ? 'text-blue-600' :
          'text-muted-foreground'
        )}>
          {percentage}%
        </span>
      )}
    </div>
  )
}

// Individual branch progress card
function BranchProgressCard({ progress }: { progress: BranchProgress }) {
  const isPacking = progress.currentPhase === 'packing'
  const isReceiving = progress.currentPhase === 'receiving'
  const isDispatched = progress.currentPhase === 'dispatched'
  const isCompleted = progress.currentPhase === 'completed'
  const isNotStarted = progress.currentPhase === 'not-started'
  
  const progressStatus = isCompleted ? 'completed' : 
    (isPacking || isReceiving) ? 'in-progress' : 'not-started'
  
  const currentPercentage = isPacking || isNotStarted ? progress.packingPercentage :
    isReceiving ? progress.receivingPercentage : 100
    
  const timeElapsed = isPacking ? progress.packingTimeElapsed : 
    isReceiving ? progress.receivingTimeElapsed : null
    
  const currentPerson = isPacking ? progress.packedBy : 
    isReceiving ? progress.receivedBy : progress.receivedBy || progress.packedBy
  
  // Determine if slow (more than 45 minutes for packing, more than 30 for receiving)
  const isSlow = (isPacking && timeElapsed && timeElapsed > 45) ||
    (isReceiving && timeElapsed && timeElapsed > 30)
  
  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all",
      isCompleted ? "bg-green-50 border-green-200" :
      isPacking ? "bg-blue-50 border-blue-200" :
      isReceiving ? "bg-indigo-50 border-indigo-200" :
      isDispatched ? "bg-amber-50 border-amber-200" :
      "bg-gray-50 border-gray-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm truncate flex-1 mr-2">
          {progress.branchName}
        </span>
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] px-1.5 py-0 shrink-0",
            isCompleted ? "bg-green-100 text-green-700 border-green-300" :
            isPacking ? "bg-blue-100 text-blue-700 border-blue-300" :
            isReceiving ? "bg-indigo-100 text-indigo-700 border-indigo-300" :
            isDispatched ? "bg-amber-100 text-amber-700 border-amber-300" :
            "bg-gray-100 text-gray-600 border-gray-300"
          )}
        >
          {isCompleted ? 'Done' :
           isPacking ? 'Packing' :
           isReceiving ? 'Receiving' :
           isDispatched ? 'Dispatched' :
           'Pending'}
        </Badge>
      </div>
      
      {/* Progress bar */}
      <ProgressBar 
        percentage={currentPercentage} 
        status={progressStatus}
        size="sm"
      />
      
      {/* Stats row */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          <span>
            {isPacking || isNotStarted 
              ? `${progress.packingItemsChecked}/${progress.totalItems}` 
              : `${progress.receivingItemsChecked}/${progress.totalItems}`}
          </span>
        </div>
        
        {timeElapsed !== null && (
          <div className={cn(
            "flex items-center gap-1",
            isSlow ? "text-orange-600 font-medium" : ""
          )}>
            <Clock className="h-3 w-3" />
            <span>{formatTimeElapsed(timeElapsed)}</span>
            {isSlow && <AlertTriangle className="h-3 w-3" />}
          </div>
        )}
        
        {currentPerson && (
          <div className="flex items-center gap-1 truncate max-w-[80px]">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{currentPerson}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function PackingProgressOverview({ branchDispatches, className }: PackingProgressOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [sortBy, setSortBy] = useState<'progress' | 'time' | 'name'>('progress')
  
  const progressData = useMemo(() => calculateProgress(branchDispatches), [branchDispatches])
  
  // Group by phase
  const packingBranches = progressData.filter(p => p.currentPhase === 'packing')
  const receivingBranches = progressData.filter(p => p.currentPhase === 'receiving')
  const pendingBranches = progressData.filter(p => p.currentPhase === 'not-started')
  const dispatchedBranches = progressData.filter(p => p.currentPhase === 'dispatched')
  const completedBranches = progressData.filter(p => p.currentPhase === 'completed')
  
  const activeBranches = [...packingBranches, ...receivingBranches]
  const inProgressCount = activeBranches.length
  
  // Sort active branches
  const sortedActiveBranches = useMemo(() => {
    const branches = [...activeBranches]
    switch (sortBy) {
      case 'progress':
        return branches.sort((a, b) => {
          const aProgress = a.currentPhase === 'packing' ? a.packingPercentage : a.receivingPercentage
          const bProgress = b.currentPhase === 'packing' ? b.packingPercentage : b.receivingPercentage
          return aProgress - bProgress // Lowest first (needs most attention)
        })
      case 'time':
        return branches.sort((a, b) => {
          const aTime = a.currentPhase === 'packing' ? a.packingTimeElapsed : a.receivingTimeElapsed
          const bTime = b.currentPhase === 'packing' ? b.packingTimeElapsed : b.receivingTimeElapsed
          return (bTime || 0) - (aTime || 0) // Longest first
        })
      case 'name':
        return branches.sort((a, b) => a.branchName.localeCompare(b.branchName))
      default:
        return branches
    }
  }, [activeBranches, sortBy])
  
  // Overall progress
  const overallPackingProgress = useMemo(() => {
    const totalItems = progressData.reduce((sum, p) => sum + p.totalItems, 0)
    const packedItems = progressData.reduce((sum, p) => sum + p.packingItemsChecked, 0)
    return totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0
  }, [progressData])
  
  const overallReceivingProgress = useMemo(() => {
    const totalItems = progressData.reduce((sum, p) => sum + p.totalItems, 0)
    const receivedItems = progressData.reduce((sum, p) => sum + p.receivingItemsChecked, 0)
    return totalItems > 0 ? Math.round((receivedItems / totalItems) * 100) : 0
  }, [progressData])
  
  // If all completed, show success message
  const allCompleted = completedBranches.length === branchDispatches.length
  
  // If nothing active, don't show this section prominently
  const hasActiveWork = inProgressCount > 0 || pendingBranches.length > 0
  
  return (
    <Card className={cn("border-l-4 border-l-blue-500", className)}>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Packing Progress
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {allCompleted ? (
                  <span className="text-green-600 font-medium">All branches completed!</span>
                ) : (
                  <>
                    {completedBranches.length}/{branchDispatches.length} branches done
                    {inProgressCount > 0 && ` • ${inProgressCount} in progress`}
                  </>
                )}
              </p>
            </div>
          </div>
          
          {/* Overall progress indicators */}
          <div className="flex items-center gap-4">
            <div className="text-center hidden sm:block">
              <div className="text-2xl font-bold text-blue-600">{overallPackingProgress}%</div>
              <div className="text-xs text-muted-foreground">Packed</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-2xl font-bold text-indigo-600">{overallReceivingProgress}%</div>
              <div className="text-xs text-muted-foreground">Received</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-600">{pendingBranches.length}</div>
              <div className="text-[10px] text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{packingBranches.length}</div>
              <div className="text-[10px] text-muted-foreground">Packing</div>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-lg">
              <div className="text-lg font-bold text-amber-600">{dispatchedBranches.length}</div>
              <div className="text-[10px] text-muted-foreground">Dispatched</div>
            </div>
            <div className="text-center p-2 bg-indigo-50 rounded-lg">
              <div className="text-lg font-bold text-indigo-600">{receivingBranches.length}</div>
              <div className="text-[10px] text-muted-foreground">Receiving</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{completedBranches.length}</div>
              <div className="text-[10px] text-muted-foreground">Done</div>
            </div>
          </div>
          
          {/* Active branches section */}
          {sortedActiveBranches.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Currently Active ({sortedActiveBranches.length})
                </h3>
                <div className="flex gap-1">
                  <Button 
                    variant={sortBy === 'progress' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-6 text-[10px] px-2"
                    onClick={(e) => { e.stopPropagation(); setSortBy('progress') }}
                  >
                    By Progress
                  </Button>
                  <Button 
                    variant={sortBy === 'time' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-6 text-[10px] px-2"
                    onClick={(e) => { e.stopPropagation(); setSortBy('time') }}
                  >
                    By Time
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {sortedActiveBranches.map(branch => (
                  <BranchProgressCard key={branch.branchSlug} progress={branch} />
                ))}
              </div>
            </div>
          )}
          
          {/* All branches grid (collapsed view showing all) */}
          <div>
            <h3 className="text-sm font-semibold mb-2">All Branches</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
              {progressData
                .sort((a, b) => a.branchName.localeCompare(b.branchName))
                .map(branch => {
                  const percentage = branch.currentPhase === 'completed' ? 100 :
                    branch.currentPhase === 'packing' ? branch.packingPercentage :
                    branch.currentPhase === 'receiving' ? branch.receivingPercentage :
                    branch.packingPercentage
                    
                  const status = branch.currentPhase === 'completed' ? 'completed' :
                    (branch.currentPhase === 'packing' || branch.currentPhase === 'receiving') ? 'in-progress' :
                    'not-started'
                  
                  return (
                    <div 
                      key={branch.branchSlug}
                      className={cn(
                        "p-2 rounded-lg border text-center",
                        branch.currentPhase === 'completed' ? "bg-green-50 border-green-200" :
                        branch.currentPhase === 'packing' ? "bg-blue-50 border-blue-200" :
                        branch.currentPhase === 'receiving' ? "bg-indigo-50 border-indigo-200" :
                        branch.currentPhase === 'dispatched' ? "bg-amber-50 border-amber-200" :
                        "bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className="text-[10px] font-medium truncate mb-1">
                        {branch.branchName.replace('ISC ', '')}
                      </div>
                      <ProgressBar 
                        percentage={percentage} 
                        status={status}
                        showPercentage={false}
                        size="sm"
                      />
                      <div className="text-[9px] text-muted-foreground mt-1">
                        {branch.currentPhase === 'completed' ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500 mx-auto" />
                        ) : (
                          `${percentage}%`
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
