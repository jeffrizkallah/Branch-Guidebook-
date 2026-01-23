'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  FileText, 
  Loader2,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Truck,
  PackageCheck,
  Timer,
  Sparkles,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { Dispatch } from '@/lib/data'

// Workflow Stepper Component
function WorkflowStepper({ 
  packing, 
  dispatched, 
  completed, 
  total,
  packingStartedAt
}: { 
  packing: number
  dispatched: number
  completed: number
  total: number
  packingStartedAt?: string | null
}) {
  const steps = [
    { 
      label: 'Packing', 
      count: packing, 
      icon: Package, 
      color: 'text-yellow-600 bg-yellow-100',
      activeColor: 'border-yellow-500',
      isActive: packing > 0
    },
    { 
      label: 'Dispatched', 
      count: dispatched, 
      icon: Truck, 
      color: 'text-blue-600 bg-blue-100',
      activeColor: 'border-blue-500',
      isActive: dispatched > 0 || completed > 0
    },
    { 
      label: 'Completed', 
      count: completed, 
      icon: CheckCircle2, 
      color: 'text-green-600 bg-green-100',
      activeColor: 'border-green-500',
      isActive: completed > 0
    },
  ]
  
  // Calculate time in stage
  const getTimeInStage = () => {
    if (!packingStartedAt) return null
    const start = new Date(packingStartedAt)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m in progress`
    }
    return `${diffMins}m in progress`
  }
  
  const timeInStage = getTimeInStage()
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-1">
        {steps.map((step, idx) => {
          const Icon = step.icon
          const isLast = idx === steps.length - 1
          return (
            <div key={step.label} className="flex items-center flex-1">
              <div className={cn(
                "flex flex-col items-center",
                step.isActive ? "opacity-100" : "opacity-40"
              )}>
                <div className={cn(
                  "w-7 h-7 xs:w-8 xs:h-8 rounded-full flex items-center justify-center border-2",
                  step.isActive ? step.activeColor : "border-muted-foreground/30",
                  step.isActive ? step.color : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                </div>
                <span className="text-[9px] xs:text-[10px] mt-1 font-medium">{step.label}</span>
                <span className={cn(
                  "text-[9px] xs:text-[10px]",
                  step.count > 0 ? (
                    step.label === 'Completed' ? 'text-green-600 font-semibold' :
                    step.label === 'Dispatched' ? 'text-blue-600 font-semibold' :
                    'text-yellow-600 font-semibold'
                  ) : 'text-muted-foreground'
                )}>
                  {step.count > 0 ? step.count : '—'}
                </span>
              </div>
              {!isLast && (
                <div className={cn(
                  "flex-1 h-0.5 mx-1 xs:mx-2",
                  steps[idx + 1].isActive ? "bg-gradient-to-r from-current to-muted" : "bg-muted"
                )} style={{ 
                  color: step.isActive ? (
                    step.label === 'Packing' ? '#eab308' : '#3b82f6'
                  ) : undefined 
                }} />
              )}
            </div>
          )
        })}
      </div>
      {timeInStage && packing > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Timer className="h-3 w-3" />
          <span>{timeInStage}</span>
        </div>
      )}
    </div>
  )
}

// Progress Bar Component
function ProgressBar({ 
  completed, 
  total,
  showLabel = true 
}: { 
  completed: number
  total: number
  showLabel?: boolean
}) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            "font-medium",
            percentage === 100 ? "text-green-600" : "text-muted-foreground"
          )}>
            {completed} of {total} branches complete
          </span>
          <span className={cn(
            "font-bold",
            percentage === 100 ? "text-green-600" : percentage > 50 ? "text-blue-600" : "text-yellow-600"
          )}>
            {percentage}%
          </span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            percentage === 100 ? "bg-green-500" : percentage > 50 ? "bg-blue-500" : "bg-yellow-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function DispatchDashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, canEdit } = useAuth({ 
    required: true, 
    allowedRoles: ['admin', 'operations_lead', 'dispatcher'] 
  })
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [showAllDispatches, setShowAllDispatches] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    fetchDispatches()
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId])

  const fetchDispatches = async () => {
    try {
      const response = await fetch('/api/dispatch')
      const data = await response.json()
      setDispatches(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dispatches:', error)
      setLoading(false)
    }
  }

  const handleDeleteClick = (dispatch: Dispatch) => {
    setSelectedDispatch(dispatch)
    setDeleteDialogOpen(true)
    setOpenMenuId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedDispatch) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/dispatch/${selectedDispatch.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDeleteDialogOpen(false)
        setSelectedDispatch(null)
        fetchDispatches()
        alert('✓ Dispatch deleted and archived successfully!')
      } else {
        throw new Error('Failed to delete dispatch')
      }
    } catch (error) {
      console.error('Error deleting dispatch:', error)
      alert('Error deleting dispatch. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleCardExpand = (dispatchId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(dispatchId)) {
        next.delete(dispatchId)
      } else {
        next.add(dispatchId)
      }
      return next
    })
  }

  // Calculate stats from dispatches
  const stats = {
    total: dispatches.length,
    pending: dispatches.filter(d => 
      d.branchDispatches.some(bd => bd.status === 'pending' || bd.status === 'packing')
    ).length,
    dispatched: dispatches.filter(d => 
      d.branchDispatches.some(bd => bd.status === 'dispatched' || bd.status === 'receiving')
    ).length,
    completed: dispatches.filter(d => 
      d.branchDispatches.every(bd => bd.status === 'completed')
    ).length,
    withIssues: dispatches.filter(d => 
      d.branchDispatches.some(bd => bd.items?.some((item: any) => item.issue !== null))
    ).length
  }
  
  // Sort by date, most recent first
  const sortedDispatches = useMemo(() => {
    return [...dispatches].sort((a, b) => 
      new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
    )
  }, [dispatches])
  
  // Show only first 3 or all
  const displayedDispatches = showAllDispatches 
    ? sortedDispatches 
    : sortedDispatches.slice(0, 3)
  
  const hiddenCount = sortedDispatches.length - 3

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, icon: any, label: string, color?: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      packing: { variant: 'default', icon: Package, label: 'Packing', color: 'bg-blue-600' },
      dispatched: { variant: 'default', icon: Truck, label: 'Dispatched', color: 'bg-orange-600' },
      receiving: { variant: 'default', icon: PackageCheck, label: 'Receiving', color: 'bg-orange-600' },
      completed: { variant: 'default', icon: CheckCircle2, label: 'Completed', color: 'bg-green-600' },
    }
    const config = variants[status] || variants.pending
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.color || ''}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    })
  }
  
  const formatDateLong = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    })
  }
  
  // Get card border color based on status
  const getCardBorderColor = (dispatch: Dispatch) => {
    const hasIssues = dispatch.branchDispatches.some(
      bd => bd.items?.some((item: any) => item.issue !== null)
    )
    const allCompleted = dispatch.branchDispatches.every(bd => bd.status === 'completed')
    const hasPending = dispatch.branchDispatches.some(
      bd => bd.status === 'pending' || bd.status === 'packing'
    )
    
    if (hasIssues) return 'border-l-red-500'
    if (allCompleted) return 'border-l-green-500'
    if (hasPending) return 'border-l-yellow-500'
    return 'border-l-blue-500'
  }
  
  // Get contextual message for zero states
  const getContextualMessage = (
    packing: number, 
    dispatched: number, 
    completed: number, 
    total: number
  ) => {
    if (completed === total && total > 0) {
      return { message: 'All branches delivered!', type: 'success' as const }
    }
    if (packing === total && dispatched === 0 && completed === 0) {
      return { message: `Ready to dispatch ${packing} branches`, type: 'action' as const }
    }
    if (packing > 0 && dispatched === 0) {
      return { message: 'Packing in progress...', type: 'progress' as const }
    }
    if (dispatched > 0 && completed === 0) {
      return { message: 'En route to branches', type: 'progress' as const }
    }
    return null
  }

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const canModify = canEdit('dispatch')

  return (
    <>
      <div className="flex min-h-screen">
        <RoleSidebar />
      
        <main className="flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0">
          <div className="flex-1 container mx-auto px-3 xs:px-4 py-4 xs:py-6 md:py-8">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Dispatch' },
              ]}
            />

            <div className="mb-4 xs:mb-6 md:mb-8">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 xs:gap-4 mb-4">
                <div className="min-w-0">
                  <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold mb-1 xs:mb-2">Dispatch Management</h1>
                  <p className="text-xs xs:text-sm text-muted-foreground">Monitor and manage all branch dispatches</p>
                </div>
                <Link href="/dispatch/upload" data-tour-id="create-dispatch-btn" className="w-full xs:w-auto shrink-0">
                  <Button size="default" className="flex items-center gap-2 w-full xs:w-auto h-9 xs:h-10 text-sm xs:text-base">
                    <Upload className="h-4 w-4 xs:h-5 xs:w-5" />
                    <span className="xs:hidden">Create</span>
                    <span className="hidden xs:inline">Create Dispatch</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 xs:grid-cols-3 fold:grid-cols-5 md:grid-cols-5 gap-2 xs:gap-3 md:gap-4 mb-4 xs:mb-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-3 xs:pt-4 md:pt-6 px-2 xs:px-4">
                  <div className="text-center">
                    <div className="text-xl xs:text-2xl md:text-3xl font-bold">{stats.total}</div>
                    <div className="text-[10px] xs:text-xs md:text-sm text-muted-foreground mt-0.5 xs:mt-1">Total</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-3 xs:pt-4 md:pt-6 px-2 xs:px-4">
                  <div className="text-center">
                    <div className={cn(
                      "text-xl xs:text-2xl md:text-3xl font-bold",
                      stats.pending > 0 ? "text-yellow-600" : "text-muted-foreground/50"
                    )}>
                      {stats.pending || '—'}
                    </div>
                    <div className="text-[10px] xs:text-xs md:text-sm text-muted-foreground mt-0.5 xs:mt-1">Pending</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-3 xs:pt-4 md:pt-6 px-2 xs:px-4">
                  <div className="text-center">
                    <div className={cn(
                      "text-xl xs:text-2xl md:text-3xl font-bold",
                      stats.dispatched > 0 ? "text-blue-600" : "text-muted-foreground/50"
                    )}>
                      {stats.dispatched || '—'}
                    </div>
                    <div className="text-[10px] xs:text-xs md:text-sm text-muted-foreground mt-0.5 xs:mt-1">Dispatched</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-3 xs:pt-4 md:pt-6 px-2 xs:px-4">
                  <div className="text-center">
                    <div className={cn(
                      "text-xl xs:text-2xl md:text-3xl font-bold",
                      stats.completed > 0 ? "text-green-600" : "text-muted-foreground/50"
                    )}>
                      {stats.completed || '—'}
                    </div>
                    <div className="text-[10px] xs:text-xs md:text-sm text-muted-foreground mt-0.5 xs:mt-1">Completed</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="col-span-2 xs:col-span-1 hover:shadow-md transition-shadow">
                <CardContent className="pt-3 xs:pt-4 md:pt-6 px-2 xs:px-4">
                  <div className="text-center">
                    <div className={cn(
                      "text-xl xs:text-2xl md:text-3xl font-bold",
                      stats.withIssues > 0 ? "text-red-600" : "text-muted-foreground/50"
                    )}>
                      {stats.withIssues || '—'}
                    </div>
                    <div className="text-[10px] xs:text-xs md:text-sm text-muted-foreground mt-0.5 xs:mt-1">With Issues</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dispatch List */}
            <Card data-tour-id="dispatch-list">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg xs:text-xl">Recent Dispatches</CardTitle>
                  {sortedDispatches.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      {sortedDispatches.length} total
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-pulse" />
                    <p className="text-muted-foreground">Loading dispatches...</p>
                  </div>
                ) : dispatches.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No dispatches yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first dispatch to get started
                    </p>
                    <Link href="/dispatch/upload">
                      <Button>
                        <Upload className="h-4 w-4 mr-2" />
                        Create First Dispatch
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedDispatches.map(dispatch => {
                      const totalBranches = dispatch.branchDispatches.length
                      const completedBranches = dispatch.branchDispatches.filter(
                        bd => bd.status === 'completed'
                      ).length
                      const pendingBranches = dispatch.branchDispatches.filter(
                        bd => bd.status === 'pending' || bd.status === 'packing'
                      ).length
                      const dispatchedBranches = dispatch.branchDispatches.filter(
                        bd => bd.status === 'dispatched' || bd.status === 'receiving'
                      ).length
                      const withIssues = dispatch.branchDispatches.filter(
                        bd => bd.items?.some((item: any) => item.issue !== null)
                      ).length
                      
                      const isExpanded = expandedCards.has(dispatch.id)
                      const isAllCompleted = completedBranches === totalBranches
                      const contextualMsg = getContextualMessage(pendingBranches, dispatchedBranches, completedBranches, totalBranches)
                      
                      // Get first packing start time for time-in-stage
                      const packingStartedAt = dispatch.branchDispatches.find(
                        bd => bd.packingStartedAt
                      )?.packingStartedAt

                      {/* Find parent dispatch for follow-ups */}
                      const isFollowUp = dispatch.type === 'follow_up'
                      const parentDispatch = isFollowUp 
                        ? sortedDispatches.find(d => d.id === dispatch.parentDispatchId)
                        : null

                      return (
                        <div 
                          key={dispatch.id} 
                          className={cn(
                            "border rounded-lg border-l-4 transition-all duration-200 hover:shadow-md",
                            isFollowUp ? "border-l-amber-500" : getCardBorderColor(dispatch),
                            isAllCompleted && "bg-green-50/50 dark:bg-green-900/10",
                            isFollowUp && !isAllCompleted && "bg-amber-50/30"
                          )}
                        >
                          {/* Compact Header - Always Visible */}
                          <div className="p-3 xs:p-4">
                            <div className="flex items-start justify-between gap-2 xs:gap-3">
                              {/* Left: Date and Status */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  {isFollowUp && (
                                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1 text-[10px] xs:text-xs">
                                      <RefreshCw className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
                                      Follow-Up
                                    </Badge>
                                  )}
                                  <h3 className="font-bold text-base xs:text-lg md:text-xl">
                                    {formatDateLong(dispatch.deliveryDate)}
                                  </h3>
                                  {withIssues > 0 && (
                                    <Link href={`/dispatch/${dispatch.id}/report`}>
                                      <Badge variant="destructive" className="flex items-center gap-1 cursor-pointer hover:bg-destructive/80 transition-colors text-[10px] xs:text-xs">
                                        <AlertTriangle className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
                                        {withIssues} Issue{withIssues > 1 ? 's' : ''}
                                      </Badge>
                                    </Link>
                                  )}
                                  {isAllCompleted && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 text-[10px] xs:text-xs">
                                      <Sparkles className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
                                      Complete
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] xs:text-xs text-muted-foreground">
                                  {isFollowUp && parentDispatch ? (
                                    <span className="flex items-center gap-1">
                                      <span>Resolving issues from</span>
                                      <Link 
                                        href={`/dispatch/${parentDispatch.id}/report`}
                                        className="text-amber-600 hover:underline inline-flex items-center gap-0.5"
                                      >
                                        {formatDate(parentDispatch.deliveryDate)}
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </Link>
                                    </span>
                                  ) : (
                                    <>Created {formatDate(dispatch.createdDate)} by {dispatch.createdBy}</>
                                  )}
                                </p>
                              </div>
                              
                              {/* Right: Actions */}
                              <div className="flex items-center gap-1.5 xs:gap-2 shrink-0">
                                {/* View Report - Primary Action */}
                                <Link href={`/dispatch/${dispatch.id}/report`}>
                                  <Button
                                    size="sm"
                                    className="flex items-center gap-1 xs:gap-2 h-8 xs:h-9 text-xs xs:text-sm px-2 xs:px-3"
                                  >
                                    <FileText className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                                    <span className="hidden xs:inline">View Report</span>
                                    <span className="xs:hidden">Report</span>
                                  </Button>
                                </Link>
                                
                                {/* Overflow Menu */}
                                <div className="relative">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 xs:h-9 w-8 xs:w-9 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenMenuId(openMenuId === dispatch.id ? null : dispatch.id)
                                    }}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                  
                                  {openMenuId === dispatch.id && (
                                    <div 
                                      className="absolute right-0 top-full mt-1 bg-popover border rounded-md shadow-lg py-1 z-50 min-w-[140px]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-red-600"
                                        onClick={() => handleDeleteClick(dispatch)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete Dispatch
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mt-3">
                              <ProgressBar 
                                completed={completedBranches} 
                                total={totalBranches} 
                              />
                            </div>
                            
                            {/* Contextual Message */}
                            {contextualMsg && (
                              <div className={cn(
                                "mt-2 text-xs font-medium flex items-center gap-1.5",
                                contextualMsg.type === 'success' && "text-green-600",
                                contextualMsg.type === 'action' && "text-yellow-600",
                                contextualMsg.type === 'progress' && "text-blue-600"
                              )}>
                                {contextualMsg.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                {contextualMsg.type === 'action' && <Truck className="h-3.5 w-3.5" />}
                                {contextualMsg.type === 'progress' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {contextualMsg.message}
                              </div>
                            )}
                            
                            {/* Workflow Stepper */}
                            <div className="mt-3 pt-3 border-t">
                              <WorkflowStepper 
                                packing={pendingBranches}
                                dispatched={dispatchedBranches}
                                completed={completedBranches}
                                total={totalBranches}
                                packingStartedAt={packingStartedAt}
                              />
                            </div>

                            {/* Expand/Collapse Button */}
                            <button
                              onClick={() => toggleCardExpand(dispatch.id)}
                              className="w-full mt-3 pt-2 border-t flex items-center justify-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 transition-transform" />
                                  Hide branch details
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 transition-transform" />
                                  View branch details ({totalBranches} branches)
                                </>
                              )}
                            </button>
                          </div>
                          
                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="px-3 xs:px-4 pb-3 xs:pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                              {dispatch.branchDispatches.map(bd => {
                                const issueItems = bd.items.filter((item: any) => item.issue !== null)
                                return (
                                  <div key={bd.branchSlug} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm">{bd.branchName}</div>
                                      <div className="text-[10px] xs:text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                                        <span>{bd.items.length} items</span>
                                        {issueItems.length > 0 && (
                                          <span className="text-red-600 font-medium">
                                            • {issueItems.length} issue{issueItems.length > 1 ? 's' : ''}
                                          </span>
                                        )}
                                        {bd.packedBy && (
                                          <span>• Packed by {bd.packedBy}</span>
                                        )}
                                        {bd.receivedBy && (
                                          <span>• Received by {bd.receivedBy}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="shrink-0 ml-2">
                                      {getStatusBadge(bd.status)}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    
                    {/* Show More / Show Less Button */}
                    {sortedDispatches.length > 3 && (
                      <button
                        onClick={() => setShowAllDispatches(!showAllDispatches)}
                        className="w-full py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2 border rounded-lg hover:bg-muted/50"
                      >
                        {showAllDispatches ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Show {hiddenCount} More Dispatch{hiddenCount > 1 ? 'es' : ''}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Footer />
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        dispatchDate={selectedDispatch ? formatDate(selectedDispatch.deliveryDate) : ''}
        branchCount={selectedDispatch?.branchDispatches.length || 0}
        isDeleting={isDeleting}
      />
    </>
  )
}

