'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatQuantity } from '@/lib/display-utils'
import { exportShortagesToCSV } from '@/lib/csv-export'
import { useAuth } from '@/hooks/useAuth'

// Import new components
import { ShortagesTable, type Shortage } from './components/ShortagesTable'
import { ShortageDrawer } from './components/ShortageDrawer'
import { BulkActionsBar } from './components/BulkActionsBar'
import { PaginationControls } from './components/PaginationControls'
import { EnhancedFilters } from './components/EnhancedFilters'
import { BulkResolveModal } from './components/BulkResolveModal'

export default function IngredientProblemsPage() {
  const { user, loading: authLoading } = useAuth({ 
    required: true, 
    allowedRoles: ['admin', 'operations_lead', 'central_kitchen'] 
  })

  const [loading, setLoading] = useState(true)
  const [allShortages, setAllShortages] = useState<Shortage[]>([])
  const [selectedShortage, setSelectedShortage] = useState<Shortage | null>(null)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [bulkResolveModalOpen, setBulkResolveModalOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolutionAction, setResolutionAction] = useState<string>('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerShortage, setDrawerShortage] = useState<Shortage | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [dateFilter, setDateFilter] = useState<string>('ALL')
  
  // Quick filters
  const [quickFilters, setQuickFilters] = useState({
    criticalOnly: false,
    todayOnly: false,
    completelyMissing: false
  })

  useEffect(() => {
    loadShortages()
    // Poll every 30 seconds for updates
    const interval = setInterval(loadShortages, 30000)
    return () => clearInterval(interval)
  }, [statusFilter])

  const loadShortages = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter)
      }
      
      const response = await fetch(`/api/inventory-shortages?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setAllShortages(data.shortages || [])
      }
    } catch (error) {
      console.error('Error loading shortages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!selectedShortage || !resolutionAction) return

    setResolving(true)
    try {
      const response = await fetch(
        `/api/inventory-shortages/${selectedShortage.shortage_id}/resolve`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resolutionStatus: 'RESOLVED',
            resolutionAction,
            resolutionNotes,
            resolvedBy: user?.id || '1'
          })
        }
      )

      if (response.ok) {
        setResolveModalOpen(false)
        setResolutionAction('')
        setResolutionNotes('')
        setSelectedShortage(null)
        loadShortages() // Refresh list
      }
    } catch (error) {
      console.error('Error resolving shortage:', error)
    } finally {
      setResolving(false)
    }
  }

  const handleBulkResolve = async (action: string, notes: string) => {
    const selectedShortages = allShortages.filter(s => selectedIds.has(s.shortage_id))
    
    // Resolve all selected items
    for (const shortage of selectedShortages) {
      try {
        await fetch(
          `/api/inventory-shortages/${shortage.shortage_id}/resolve`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resolutionStatus: 'RESOLVED',
              resolutionAction: action,
              resolutionNotes: notes,
              resolvedBy: user?.id || '1'
            })
          }
        )
      } catch (error) {
        console.error(`Error resolving shortage ${shortage.shortage_id}:`, error)
      }
    }
    
    setSelectedIds(new Set())
    setBulkResolveModalOpen(false)
    loadShortages()
  }

  const handleExportCSV = () => {
    const selectedShortages = allShortages.filter(s => selectedIds.has(s.shortage_id))
    const dataToExport = selectedShortages.length > 0 ? selectedShortages : filteredShortages
    exportShortagesToCSV(dataToExport)
  }

  const handleQuickFilterToggle = (filter: 'criticalOnly' | 'todayOnly' | 'completelyMissing') => {
    setQuickFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }))
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setPriorityFilter('ALL')
    setDateFilter('ALL')
    setQuickFilters({
      criticalOnly: false,
      todayOnly: false,
      completelyMissing: false
    })
  }

  // Filter shortages
  const filteredShortages = useMemo(() => {
    return allShortages.filter(shortage => {
      // Search filter
      if (searchQuery && !shortage.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      // Priority filter
      if (priorityFilter !== 'ALL' && shortage.priority !== priorityFilter) {
        return false
      }
      
      // Date filter
      if (dateFilter !== 'ALL') {
        const productionDate = new Date(shortage.production_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (dateFilter === 'TODAY' && productionDate.toDateString() !== today.toDateString()) {
          return false
        }
        
        if (dateFilter === 'THIS_WEEK') {
          const weekFromNow = new Date(today)
          weekFromNow.setDate(weekFromNow.getDate() + 7)
          if (productionDate < today || productionDate > weekFromNow) {
            return false
          }
        }
      }
      
      // Quick filter: Critical only
      if (quickFilters.criticalOnly && shortage.status !== 'CRITICAL') {
        return false
      }
      
      // Quick filter: Today only
      if (quickFilters.todayOnly) {
        const productionDate = new Date(shortage.production_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (productionDate.toDateString() !== today.toDateString()) {
          return false
        }
      }
      
      // Quick filter: Completely missing
      if (quickFilters.completelyMissing && shortage.status !== 'MISSING') {
        return false
      }
      
      return true
    })
  }, [allShortages, searchQuery, priorityFilter, dateFilter, quickFilters])

  // Pagination
  const totalPages = Math.ceil(filteredShortages.length / pageSize)
  const paginatedShortages = filteredShortages.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Stats
  const stats = {
    total: filteredShortages.length,
    high: filteredShortages.filter(s => s.priority === 'HIGH').length,
    medium: filteredShortages.filter(s => s.priority === 'MEDIUM').length,
    low: filteredShortages.filter(s => s.priority === 'LOW').length,
    resolved: allShortages.filter(s => s.resolution_status === 'RESOLVED').length,
  }

  const handleRowClick = (shortage: Shortage) => {
    setDrawerShortage(shortage)
    setDrawerOpen(true)
  }

  const handleDrawerNext = () => {
    if (!drawerShortage) return
    const currentIndex = paginatedShortages.findIndex(s => s.shortage_id === drawerShortage.shortage_id)
    if (currentIndex < paginatedShortages.length - 1) {
      setDrawerShortage(paginatedShortages[currentIndex + 1])
    }
  }

  const handleDrawerPrev = () => {
    if (!drawerShortage) return
    const currentIndex = paginatedShortages.findIndex(s => s.shortage_id === drawerShortage.shortage_id)
    if (currentIndex > 0) {
      setDrawerShortage(paginatedShortages[currentIndex - 1])
    }
  }

  const getPriorityBadge = (priority: string) => {
    // Keep for modal
    return null
  }

  const getStatusBadge = (status: string) => {
    // Keep for modal
    return null
  }

  const getResolutionBadge = (action?: string) => {
    // Keep for modal
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading ingredient problems...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/kitchen">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Ingredient Shortage Management</h1>
            <p className="text-sm text-muted-foreground">
              Monitor and resolve inventory shortages for production schedules
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{stats.high}</p>
              <p className="text-xs text-muted-foreground mt-1">High Priority</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{stats.medium}</p>
              <p className="text-xs text-muted-foreground mt-1">Medium Priority</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.low}</p>
              <p className="text-xs text-muted-foreground mt-1">Low Priority</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground mt-1">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <EnhancedFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        quickFilters={quickFilters}
        onQuickFilterToggle={handleQuickFilterToggle}
        onRefresh={loadShortages}
        onClearFilters={handleClearFilters}
      />

      {/* Bulk Actions Bar */}
      <div className="mt-4">
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onBulkResolve={() => setBulkResolveModalOpen(true)}
          onExportCSV={handleExportCSV}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      </div>

      {/* Table */}
      <div className="mt-4">
        {paginatedShortages.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {statusFilter === 'PENDING' ? 'No Pending Shortages!' : 'No Shortages Found'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {statusFilter === 'PENDING' 
                    ? 'All production requirements are currently met.'
                    : 'Try adjusting your filters to see more results.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <ShortagesTable
              shortages={paginatedShortages}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onRowClick={handleRowClick}
              onResolve={(shortage) => {
                setSelectedShortage(shortage)
                setResolveModalOpen(true)
              }}
            />
            
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredShortages.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          </>
        )}
      </div>

      {/* Side Drawer */}
      <ShortageDrawer
        shortage={drawerShortage}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNext={handleDrawerNext}
        onPrev={handleDrawerPrev}
        onResolve={(shortage) => {
          setSelectedShortage(shortage)
          setResolveModalOpen(true)
          setDrawerOpen(false)
        }}
        currentIndex={drawerShortage ? paginatedShortages.findIndex(s => s.shortage_id === drawerShortage.shortage_id) : 0}
        totalCount={paginatedShortages.length}
      />

      {/* Single Resolve Modal */}
      <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolve Inventory Shortage</DialogTitle>
          </DialogHeader>

          {selectedShortage && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg">{selectedShortage.ingredient_name}</h3>
                </div>

                {(() => {
                  const required = formatQuantity(selectedShortage.required_quantity, selectedShortage.unit)
                  const available = formatQuantity(selectedShortage.available_quantity, selectedShortage.unit)
                  const shortfall = formatQuantity(selectedShortage.shortfall_amount, selectedShortage.unit)
                  
                  return (
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-600">Required</div>
                        <div className="font-bold">
                          {required.value} {required.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Available</div>
                        <div className="font-bold">
                          {available.value} {available.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Shortfall</div>
                        <div className="font-bold text-red-600">
                          -{shortfall.value} {shortfall.unit}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                <div className="text-sm">
                  <div className="text-gray-600">Production Date:</div>
                  <div className="font-medium">{formatDate(selectedShortage.production_date)}</div>
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Resolution Action
                </Label>
                <RadioGroup value={resolutionAction} onValueChange={setResolutionAction}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ORDERED" id="ordered" />
                      <Label htmlFor="ordered" className="cursor-pointer">
                        Ingredients Ordered - Delivery scheduled
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="IN_STOCK_ERROR" id="in-stock" />
                      <Label htmlFor="in-stock" className="cursor-pointer">
                        Already in Stock - Inventory error
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SUBSTITUTED" id="substituted" />
                      <Label htmlFor="substituted" className="cursor-pointer">
                        Substitution Available - Using alternative
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="RESCHEDULED" id="rescheduled" />
                      <Label htmlFor="rescheduled" className="cursor-pointer">
                        Production Rescheduled - Moved to different date
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CANCELLED" id="cancelled" />
                      <Label htmlFor="cancelled" className="cursor-pointer">
                        Cannot Fulfill - Unable to resolve
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="notes" className="text-base font-semibold mb-2 block">
                  Resolution Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add details about how this shortage was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResolveModalOpen(false)
                setResolutionAction('')
                setResolutionNotes('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!resolutionAction || resolving}
            >
              {resolving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Resolve Shortage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Resolve Modal */}
      <BulkResolveModal
        open={bulkResolveModalOpen}
        onOpenChange={setBulkResolveModalOpen}
        selectedShortages={allShortages.filter(s => selectedIds.has(s.shortage_id))}
        onResolve={handleBulkResolve}
      />
    </div>
  )
}
