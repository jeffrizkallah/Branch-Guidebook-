'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddItemModal } from '@/components/AddItemModal'
import { FollowUpModal } from '@/components/FollowUpModal'
import { PackingProgressOverview } from '@/components/PackingProgressOverview'
import { useAuth } from '@/hooks/useAuth'
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  Package,
  Clock,
  Printer,
  Download,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ExternalLink,
  CalendarClock
} from 'lucide-react'
import type { Dispatch, BranchDispatch, DispatchItem } from '@/lib/data'

interface ReportPageProps {
  params: {
    id: string
  }
  searchParams: {
    print?: string
  }
}

export default function DispatchReportPage({ params, searchParams }: ReportPageProps) {
  const [dispatch, setDispatch] = useState<Dispatch | null>(null)
  const [allDispatches, setAllDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)
  const [filterIssueType, setFilterIssueType] = useState<'all' | 'missing' | 'damaged' | 'partial' | 'shortage'>('all')
  const [issueViewFilter, setIssueViewFilter] = useState<'real' | 'all'>('real')
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [expandedIssueBranches, setExpandedIssueBranches] = useState<Set<string>>(new Set())
  const [completeDetailsFilter, setCompleteDetailsFilter] = useState<'all' | 'issues'>('all')
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [addItemPreselectedBranch, setAddItemPreselectedBranch] = useState<string | undefined>(undefined)
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false)
  const router = useRouter()
  const isPrintMode = searchParams.print === '1'
  const { canEdit } = useAuth()
  const canAddItems = canEdit('dispatch')

  useEffect(() => {
    fetchDispatch()
  }, [params.id])

  const fetchDispatch = async () => {
    try {
      const response = await fetch('/api/dispatch')
      const dispatches = await response.json()
      setAllDispatches(dispatches)
      const foundDispatch = dispatches.find((d: Dispatch) => d.id === params.id)
      setDispatch(foundDispatch || null)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dispatch:', error)
      setLoading(false)
    }
  }

  // Get follow-up dispatches for this dispatch
  const followUpDispatches = allDispatches.filter(
    d => dispatch?.followUpDispatchIds?.includes(d.id)
  )

  // Get parent dispatch if this is a follow-up
  const parentDispatch = dispatch?.parentDispatchId 
    ? allDispatches.find(d => d.id === dispatch.parentDispatchId)
    : null

  // Count unresolved real issues (items that could go into a follow-up, excluding packaging variances)
  const unresolvedIssueCount = dispatch?.branchDispatches.reduce((count, bd) => {
    return count + bd.items.filter(item => 
      item.issue && 
      item.resolutionStatus !== 'resolved' &&
      !item.expectedVariance &&
      (item.orderedQty - (item.receivedQty ?? 0)) > 0
    ).length
  }, 0) ?? 0

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    if (!dispatch) return
    
    // Create CSV export
    let csv = 'Branch Name,Item Name,Ordered Qty,Packed Qty,Received Qty,Still to Send,Unit,Issue Type,Notes,Status,Packed By,Received By\n'
    
    dispatch.branchDispatches.forEach(bd => {
      bd.items.forEach(item => {
        const shouldInclude = filterIssueType === 'all' 
          ? item.issue !== null 
          : item.issue === filterIssueType
        
        if (shouldInclude) {
          const packedQty = item.packedQty ?? item.orderedQty
          const receivedQty = item.receivedQty || 0
          const stillToSend = item.orderedQty - receivedQty
          const unit = item.orderedQty > 150 ? 'unit' : 'KG'
          csv += `"${bd.branchName}","${item.name}",${item.orderedQty},${packedQty},${receivedQty},${stillToSend},"${unit}","${item.issue || 'none'}","${item.notes}","${bd.status}","${bd.packedBy || ''}","${bd.receivedBy || ''}"\n`
        }
      })
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dispatch-report-${dispatch.deliveryDate}.csv`
    a.click()
  }

  const handleExportComplete = () => {
    if (!dispatch) return
    
    // Create CSV export with ALL items
    let csv = 'Branch Name,Item Name,Ordered Qty,Packed Qty,Received Qty,Still to Send,Unit,Issue Type,Notes,Packed Checked,Received Checked,Status,Packed By,Received By,Received At\n'
    
    dispatch.branchDispatches.forEach(bd => {
      bd.items.forEach(item => {
        const packedQty = item.packedQty ?? item.orderedQty
        const receivedQty = item.receivedQty || 0
        const stillToSend = item.orderedQty - receivedQty
        const unit = item.orderedQty > 150 ? 'unit' : 'KG'
        csv += `"${bd.branchName}","${item.name}",${item.orderedQty},${packedQty},${receivedQty},${stillToSend},"${unit}","${item.issue || 'none'}","${item.notes || ''}",${item.packedChecked},${item.receivedChecked},"${bd.status}","${bd.packedBy || ''}","${bd.receivedBy || ''}","${bd.receivedAt || ''}"\n`
      })
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dispatch-complete-details-${dispatch.deliveryDate}.csv`
    a.click()
  }

  const toggleBranch = (branchSlug: string) => {
    setExpandedBranches(prev => {
      const newSet = new Set(prev)
      if (newSet.has(branchSlug)) {
        newSet.delete(branchSlug)
      } else {
        newSet.add(branchSlug)
      }
      return newSet
    })
  }

  const expandAllBranches = () => {
    const allSlugs = dispatch?.branchDispatches.map(bd => bd.branchSlug) || []
    setExpandedBranches(new Set(allSlugs))
  }

  const collapseAllBranches = () => {
    setExpandedBranches(new Set())
  }

  const toggleIssueBranch = (branchSlug: string) => {
    setExpandedIssueBranches(prev => {
      const newSet = new Set(prev)
      if (newSet.has(branchSlug)) {
        newSet.delete(branchSlug)
      } else {
        newSet.add(branchSlug)
      }
      return newSet
    })
  }

  const expandAllIssueBranches = () => {
    if (!dispatch) return
    const filteredSlugs = dispatch.branchDispatches
      .filter(bd => bd.items.some(item => 
        filterIssueType === 'all' 
          ? item.issue !== null 
          : item.issue === filterIssueType
      ))
      .map(bd => bd.branchSlug)
    setExpandedIssueBranches(new Set(filteredSlugs))
  }

  const collapseAllIssueBranches = () => {
    setExpandedIssueBranches(new Set())
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <RoleSidebar />
        <main className="flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0">
          <div className="flex-1 container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-pulse" />
              <p className="text-muted-foreground">Loading dispatch report...</p>
            </div>
          </div>
          <Footer />
        </main>
      </div>
    )
  }

  if (!dispatch) {
    return (
      <div className="flex min-h-screen">
        <RoleSidebar />
        <main className="flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0">
          <div className="flex-1 container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Dispatch not found</h3>
              <p className="text-muted-foreground mb-4">The requested dispatch could not be found</p>
              <Link href="/dispatch">
                <Button>Back to Dispatch Dashboard</Button>
              </Link>
            </div>
          </div>
          <Footer />
        </main>
      </div>
    )
  }

  // Calculate statistics
  const totalBranches = dispatch.branchDispatches.length
  const completedBranches = dispatch.branchDispatches.filter(bd => bd.status === 'completed').length
  const pendingBranches = dispatch.branchDispatches.filter(bd => bd.status === 'pending').length
  const inProgressBranches = dispatch.branchDispatches.filter(bd => bd.status === 'receiving').length

  // Issue statistics
  const allItems = dispatch.branchDispatches.flatMap(bd => 
    bd.items.map(item => ({ ...item, branchName: bd.branchName, branchSlug: bd.branchSlug }))
  )
  const itemsWithIssues = allItems.filter(item => item.issue !== null)
  const realIssues = itemsWithIssues.filter(item => !item.expectedVariance)
  const packagingVariances = itemsWithIssues.filter(item => item.expectedVariance === true)
  const missingItems = itemsWithIssues.filter(item => item.issue === 'missing')
  const damagedItems = itemsWithIssues.filter(item => item.issue === 'damaged')
  const partialItems = itemsWithIssues.filter(item => item.issue === 'partial')
  const shortageItems = itemsWithIssues.filter(item => item.issue === 'shortage')
  const branchesWithIssues = dispatch.branchDispatches.filter(bd => 
    bd.items.some(item => item.issue !== null)
  )

  // Filtered items based on issue type and view filter (real issues vs all)
  const filteredBranchesWithIssues = dispatch.branchDispatches
    .map(bd => ({
      ...bd,
      items: bd.items.filter(item => {
        // First filter by issue type
        const matchesIssueType = filterIssueType === 'all' 
          ? item.issue !== null 
          : item.issue === filterIssueType
        
        if (!matchesIssueType) return false
        
        // Then filter by real issues vs all
        if (issueViewFilter === 'real') {
          return !item.expectedVariance
        }
        
        return true
      })
    }))
    .filter(bd => bd.items.length > 0)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getIssueTypeBadge = (issueType: 'missing' | 'damaged' | 'partial' | 'shortage') => {
    const config = {
      missing: { color: 'bg-red-500', label: 'Missing', icon: XCircle },
      damaged: { color: 'bg-orange-500', label: 'Damaged', icon: AlertTriangle },
      partial: { color: 'bg-yellow-500', label: 'Partial', icon: TrendingDown },
      shortage: { color: 'bg-primary', label: 'Shortage', icon: TrendingDown }
    }
    const { color, label, icon: Icon } = config[issueType]
    return (
      <Badge className={`${color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string, label: string, icon: any }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending', icon: Clock },
      receiving: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'In Progress', icon: Package },
      completed: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Completed', icon: CheckCircle2 },
    }
    const config = variants[status] || variants.pending
    const Icon = config.icon
    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className={isPrintMode ? "min-h-screen flex flex-col" : "flex min-h-screen"}>
      {!isPrintMode && <RoleSidebar />}
        
        {/* Print Header */}
        {isPrintMode && (
          <div className="print-only bg-white p-6 border-b">
            <h1 className="text-2xl font-bold">Mikana - Dispatch Report</h1>
            <p className="text-sm text-muted-foreground">
              Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        )}
        
        <main className={isPrintMode ? "flex-1 container mx-auto px-4 py-8" : "flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0"}>
          <div className="flex-1 container mx-auto px-4 py-8">
          {!isPrintMode && (
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Dispatch', href: '/dispatch' },
                { label: 'Report' },
              ]}
            />
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">
                    {dispatch.type === 'follow_up' ? 'Follow-Up Dispatch Report' : 'Dispatch Report'}
                  </h1>
                  {dispatch.type === 'follow_up' && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-sm px-3 py-1">
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      FOLLOW-UP
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-muted-foreground">
                  Delivery Date: {formatDate(dispatch.deliveryDate)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Created: {formatDate(dispatch.createdDate)} by {dispatch.createdBy}
                </p>
                {/* Show parent dispatch link if this is a follow-up */}
                {parentDispatch && (
                  <p className="text-sm text-amber-600 mt-1">
                    <Link href={`/dispatch/${parentDispatch.id}/report`} className="flex items-center gap-1 hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Resolving issues from {formatDate(parentDispatch.deliveryDate)} dispatch
                    </Link>
                  </p>
                )}
              </div>
              {!isPrintMode && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {/* Create Follow-Up Button - Only for primary dispatches with unresolved issues */}
                  {dispatch.type !== 'follow_up' && unresolvedIssueCount > 0 && canAddItems && (
                    <Button
                      onClick={() => setFollowUpModalOpen(true)}
                      className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Create Follow-Up ({unresolvedIssueCount})
                    </Button>
                  )}
                  {canAddItems && (
                    <Button
                      onClick={() => {
                        setAddItemPreselectedBranch(undefined)
                        setAddItemModalOpen(true)
                      }}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Link href="/dispatch">
                    <Button variant="outline" className="flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Follow-Up Dispatches Section */}
            {followUpDispatches.length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4" />
                  Follow-Up Dispatches ({followUpDispatches.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {followUpDispatches.map(fu => {
                    const isCompleted = fu.branchDispatches.every(bd => bd.status === 'completed')
                    return (
                      <Link key={fu.id} href={`/dispatch/${fu.id}/report`}>
                        <Badge 
                          variant="outline" 
                          className={`cursor-pointer hover:bg-amber-100 transition-colors ${
                            isCompleted ? 'bg-green-100 border-green-300 text-green-800' : 'bg-amber-100 border-amber-300 text-amber-800'
                          }`}
                        >
                          <CalendarClock className="h-3 w-3 mr-1" />
                          {formatDate(fu.deliveryDate)}
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 ml-1 text-green-600" />
                          ) : (
                            <span className="ml-1 text-xs">
                              ({fu.branchDispatches.filter(bd => bd.status === 'completed').length}/{fu.branchDispatches.length})
                            </span>
                          )}
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{totalBranches}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Branches</div>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    {completedBranches} completed • {pendingBranches} pending
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                  <div className="text-2xl font-bold text-red-600">{realIssues.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Real Issues</div>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    Requires investigation
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                  <div className="text-2xl font-bold text-amber-600">{packagingVariances.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Packaging</div>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    Expected variances
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                  <div className="text-2xl font-bold text-red-500">{missingItems.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Missing Items</div>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    Not received at all
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingDown className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                  <div className="text-2xl font-bold text-yellow-600">{partialItems.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Partial Deliveries</div>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    {damagedItems.length} damaged items
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Packing Progress Overview - Not shown in print mode */}
          {!isPrintMode && (
            <PackingProgressOverview 
              branchDispatches={dispatch.branchDispatches} 
              className="mb-6"
            />
          )}

          {/* Issue Type Filter */}
          {itemsWithIssues.length > 0 && !isPrintMode && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* View Toggle: Real Issues vs All */}
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <span className="text-sm font-medium">View:</span>
                    <div className="flex gap-2">
                      <Button
                        variant={issueViewFilter === 'real' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setIssueViewFilter('real')}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        🔴 Real Issues Only ({realIssues.length})
                      </Button>
                      <Button
                        variant={issueViewFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setIssueViewFilter('all')}
                      >
                        Show All ({itemsWithIssues.length})
                      </Button>
                    </div>
                    {packagingVariances.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ⓘ {packagingVariances.length} packaging variance{packagingVariances.length !== 1 ? 's' : ''} {issueViewFilter === 'real' ? 'excluded' : 'included'}
                      </span>
                    )}
                  </div>
                  
                  {/* Issue Type Filter */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Filter by Type:</span>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant={filterIssueType === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterIssueType('all')}
                      >
                        All Types ({issueViewFilter === 'real' ? realIssues.length : itemsWithIssues.length})
                      </Button>
                    <Button
                      variant={filterIssueType === 'missing' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterIssueType('missing')}
                    >
                      Missing ({missingItems.length})
                    </Button>
                    <Button
                      variant={filterIssueType === 'damaged' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterIssueType('damaged')}
                    >
                      Damaged ({damagedItems.length})
                    </Button>
                    <Button
                      variant={filterIssueType === 'partial' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterIssueType('partial')}
                    >
                      Partial ({partialItems.length})
                    </Button>
                    <Button
                      variant={filterIssueType === 'shortage' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterIssueType('shortage')}
                    >
                      Shortage ({shortageItems.length})
                    </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Branches Status */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">All Branches Status</h2>
            
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dispatch.branchDispatches.map(bd => {
                    const issueCount = bd.items.filter(item => item.issue !== null).length
                    const canAddToBranch = (bd.status === 'pending' || bd.status === 'packing') && canAddItems
                    return (
                      <div
                        key={bd.branchSlug}
                        className={`p-4 border rounded-lg ${
                          issueCount > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold">{bd.branchName}</div>
                          <div className="flex items-center gap-2">
                            {canAddToBranch && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary/20"
                                onClick={() => {
                                  setAddItemPreselectedBranch(bd.branchSlug)
                                  setAddItemModalOpen(true)
                                }}
                                title={`Add item to ${bd.branchName}`}
                              >
                                <Plus className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                            {getStatusBadge(bd.status)}
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="text-muted-foreground">
                            {bd.items.length} items total
                          </div>
                          {issueCount > 0 ? (
                            <div className="text-red-600 font-medium">
                              ⚠️ {issueCount} issue{issueCount > 1 ? 's' : ''}
                            </div>
                          ) : (
                            <div className="text-green-600 font-medium">
                              ✓ No issues
                            </div>
                          )}
                          {bd.receivedBy && (
                            <div className="text-xs text-muted-foreground mt-2">
                              By: {bd.receivedBy}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Issues by Branch */}
          {itemsWithIssues.length > 0 ? (
            <div className="space-y-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Issues by Branch</h2>
                {!isPrintMode && filteredBranchesWithIssues.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={expandAllIssueBranches}
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Expand All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={collapseAllIssueBranches}
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Collapse All
                    </Button>
                  </div>
                )}
              </div>
              
              {filteredBranchesWithIssues.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        No {filterIssueType !== 'all' ? filterIssueType : ''} issues found
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredBranchesWithIssues.map(bd => {
                  const isIssueExpanded = expandedIssueBranches.has(bd.branchSlug)
                  
                  return (
                    <Card key={bd.branchSlug} className="border-l-4 border-l-red-500">
                      <CardHeader 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleIssueBranch(bd.branchSlug)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isIssueExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <div>
                              <CardTitle className="text-xl flex items-center gap-2">
                                {bd.branchName}
                                {getStatusBadge(bd.status)}
                              </CardTitle>
                              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                {bd.packedBy && (
                                  <div>
                                    Packed by: <span className="font-medium">{bd.packedBy}</span>
                                    {bd.packingCompletedAt && <> at {formatTime(bd.packingCompletedAt)}</>}
                                  </div>
                                )}
                                {bd.receivedBy && (
                                  <div>
                                    Received by: <span className="font-medium">{bd.receivedBy}</span>
                                    {bd.receivedAt && <> at {formatTime(bd.receivedAt)}</>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant="destructive" className="text-lg px-4 py-2">
                            {bd.items.length} Issue{bd.items.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      {isIssueExpanded && (
                        <CardContent>
                          {/* Issues Table */}
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="text-left p-3 font-medium">Item Name</th>
                                  <th className="text-center p-3 font-medium">Ordered</th>
                                  <th className="text-center p-3 font-medium">Packed</th>
                                  <th className="text-center p-3 font-medium">Received</th>
                                  <th className="text-center p-3 font-medium">Still to Send</th>
                                  <th className="text-center p-3 font-medium">Unit</th>
                                  <th className="text-center p-3 font-medium">Issue Type</th>
                                  <th className="text-center p-3 font-medium">Resolution</th>
                                  <th className="text-left p-3 font-medium">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bd.items.map(item => {
                                  const packedQty = item.packedQty ?? item.orderedQty
                                  const receivedQty = item.receivedQty ?? 0
                                  const stillToSend = item.orderedQty - receivedQty
                                  const packingIssue = item.orderedQty !== packedQty
                                  const transitIssue = packedQty !== receivedQty
                                  
                                  // Find the follow-up dispatch if scheduled
                                  const followUpDispatch = item.resolvedByDispatchId 
                                    ? allDispatches.find(d => d.id === item.resolvedByDispatchId)
                                    : null
                                  
                                  return (
                                    <tr key={item.id} className="border-t hover:bg-muted/50">
                                      <td className="p-3">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{item.name}</span>
                                            {item.addedLate && (
                                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded border border-amber-200">
                                                ⚡ LATE
                                              </span>
                                            )}
                                          </div>
                                          {item.addedLate && item.addedBy && (
                                            <div className="text-xs text-amber-600 mt-0.5">
                                              Added by {item.addedBy}
                                            </div>
                                          )}
                                        </td>
                                      <td className="p-3 text-center">{item.orderedQty}</td>
                                      <td className="p-3 text-center">
                                        <span className={packingIssue ? 'text-orange-600 font-semibold' : ''}>
                                          {packedQty}
                                        </span>
                                        {packingIssue && <div className="text-xs text-orange-600">Kitchen</div>}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className={transitIssue ? 'text-red-600 font-semibold' : ''}>
                                          {receivedQty}
                                        </span>
                                        {transitIssue && <div className="text-xs text-red-600">Transit</div>}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className={stillToSend > 0 ? 'text-orange-600 font-semibold' : 'text-green-600'}>
                                          {stillToSend.toFixed(1)}
                                        </span>
                                      </td>
                                      <td className="p-3 text-center text-sm text-muted-foreground">{item.orderedQty > 150 ? 'unit' : 'KG'}</td>
                                      <td className="p-3 text-center">
                                        {item.issue && getIssueTypeBadge(item.issue)}
                                      </td>
                                      <td className="p-3 text-center">
                                        {item.resolutionStatus === 'resolved' ? (
                                          <Badge className="bg-green-100 text-green-700 border-green-200">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Resolved
                                          </Badge>
                                        ) : item.resolutionStatus === 'scheduled' && followUpDispatch ? (
                                          <Link href={`/dispatch/${followUpDispatch.id}/report`}>
                                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-200">
                                              <CalendarClock className="h-3 w-3 mr-1" />
                                              {formatDate(followUpDispatch.deliveryDate)}
                                            </Badge>
                                          </Link>
                                        ) : stillToSend > 0 ? (
                                          <Badge variant="outline" className="text-red-600 border-red-300">
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            Unresolved
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">—</span>
                                        )}
                                      </td>
                                      <td className="p-3 text-sm">
                                        {item.notes || <span className="text-muted-foreground italic">No notes</span>}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Overall Branch Notes */}
                          {bd.overallNotes && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="font-medium text-sm mb-1">Overall Branch Notes:</div>
                              <div className="text-sm">{bd.overallNotes}</div>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  )
                })
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Issues Reported</h3>
                  <p className="text-muted-foreground">
                    All items were received successfully across all branches!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete Branch Dispatch Details - Hidden in print mode */}
          {!isPrintMode && (
            <div className="space-y-6 mt-8 no-print">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Complete Branch Dispatch Details</h2>
              </div>
              
              {/* Controls */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Show:</span>
                      <div className="flex gap-2">
                        <Button
                          variant={completeDetailsFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCompleteDetailsFilter('all')}
                        >
                          All Items
                        </Button>
                        <Button
                          variant={completeDetailsFilter === 'issues' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCompleteDetailsFilter('issues')}
                        >
                          Issues Only
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={expandAllBranches}
                      >
                        Expand All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={collapseAllBranches}
                      >
                        Collapse All
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleExportComplete}
                        className="flex items-center gap-2"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Export Complete Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expandable Branch Cards */}
              <div className="space-y-4">
                {dispatch.branchDispatches.map(bd => {
                  const isExpanded = expandedBranches.has(bd.branchSlug)
                  const issueCount = bd.items.filter(item => item.issue !== null).length
                  
                  // Filter items based on completeDetailsFilter
                  const displayItems = completeDetailsFilter === 'issues' 
                    ? bd.items.filter(item => item.issue !== null)
                    : bd.items

                  // Skip branch if no items to display
                  if (displayItems.length === 0) return null

                  return (
                    <Card key={bd.branchSlug} className="border-2">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleBranch(bd.branchSlug)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <CardTitle className="text-xl flex items-center gap-2">
                                {bd.branchName}
                                {getStatusBadge(bd.status)}
                              </CardTitle>
                              <div className="text-sm text-muted-foreground mt-1">
                                {displayItems.length} item{displayItems.length !== 1 ? 's' : ''}
                                {issueCount > 0 && (
                                  <span className="text-red-600 font-medium ml-2">
                                    • {issueCount} issue{issueCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            {bd.receivedBy && (
                              <>
                                <div className="font-medium">{bd.receivedBy}</div>
                                {bd.receivedAt && (
                                  <div className="text-muted-foreground">{formatTime(bd.receivedAt)}</div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent>
                          {/* Items Table */}
                          <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="text-left p-3 font-medium">Item Name</th>
                                    <th className="text-center p-3 font-medium">Ordered</th>
                                    <th className="text-center p-3 font-medium">Packed</th>
                                    <th className="text-center p-3 font-medium">Received</th>
                                    <th className="text-center p-3 font-medium">Still to Send</th>
                                    <th className="text-center p-3 font-medium">Unit</th>
                                    <th className="text-center p-3 font-medium">Status</th>
                                    <th className="text-left p-3 font-medium">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {displayItems.map(item => {
                                    const packedQty = item.packedQty ?? item.orderedQty
                                    const receivedQty = item.receivedQty ?? 0
                                    const stillToSend = item.orderedQty - receivedQty
                                    const hasIssue = item.issue !== null
                                    const isPerfect = receivedQty === item.orderedQty && packedQty === item.orderedQty && !hasIssue
                                    const packingIssue = item.orderedQty !== packedQty
                                    const transitIssue = packedQty !== receivedQty
                                    
                                    return (
                                      <tr 
                                        key={item.id} 
                                        className={`border-t hover:bg-muted/30 ${
                                          hasIssue ? 'bg-red-50' : isPerfect ? 'bg-green-50' : ''
                                        }`}
                                      >
                                        <td className="p-3">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{item.name}</span>
                                            {item.addedLate && (
                                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded border border-amber-200">
                                                ⚡ LATE
                                              </span>
                                            )}
                                          </div>
                                          {item.addedLate && item.addedBy && (
                                            <div className="text-xs text-amber-600 mt-0.5">
                                              Added by {item.addedBy}
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-3 text-center">{item.orderedQty}</td>
                                        <td className="p-3 text-center">
                                          <span className={packingIssue ? 'text-orange-600 font-semibold' : ''}>
                                            {packedQty}
                                          </span>
                                        </td>
                                        <td className="p-3 text-center">
                                          <span className={transitIssue ? 'text-red-600 font-semibold' : ''}>
                                            {receivedQty || 'N/A'}
                                          </span>
                                        </td>
                                        <td className="p-3 text-center">
                                          <span className={stillToSend > 0 ? 'text-orange-600 font-semibold' : 'text-green-600'}>
                                            {item.receivedQty !== null ? stillToSend.toFixed(1) : 'N/A'}
                                          </span>
                                        </td>
                                        <td className="p-3 text-center text-sm text-muted-foreground">{item.orderedQty > 150 ? 'unit' : 'KG'}</td>
                                        <td className="p-3 text-center">
                                          {hasIssue ? (
                                            getIssueTypeBadge(item.issue!)
                                          ) : isPerfect ? (
                                            <Badge className="bg-green-500 text-white flex items-center gap-1 w-fit mx-auto">
                                              <CheckCircle2 className="h-3 w-3" />
                                              Perfect
                                            </Badge>
                                          ) : item.receivedQty === null ? (
                                            <Badge variant="outline" className="text-muted-foreground">
                                              Pending
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-blue-500 text-white">
                                              OK
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="p-3 text-sm">
                                          {item.notes || <span className="text-muted-foreground italic">No notes</span>}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Overall Branch Notes */}
                          {bd.overallNotes && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="font-medium text-sm mb-1">Overall Branch Notes:</div>
                              <div className="text-sm">{bd.overallNotes}</div>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
                </div>
              </div>
            )}
          </div>

        {!isPrintMode && <Footer />}
      </main>

      {/* Add Item Modal */}
      {dispatch && (
        <AddItemModal
          isOpen={addItemModalOpen}
          onClose={() => {
            setAddItemModalOpen(false)
            setAddItemPreselectedBranch(undefined)
          }}
          dispatchId={dispatch.id}
          branchDispatches={dispatch.branchDispatches}
          preSelectedBranch={addItemPreselectedBranch}
          onItemAdded={fetchDispatch}
        />
      )}

      {/* Follow-Up Modal */}
      {dispatch && (
        <FollowUpModal
          isOpen={followUpModalOpen}
          onClose={() => setFollowUpModalOpen(false)}
          dispatch={dispatch}
          onFollowUpCreated={fetchDispatch}
        />
      )}
    </div>
  )
}

