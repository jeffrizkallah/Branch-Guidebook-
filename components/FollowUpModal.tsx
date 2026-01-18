'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  X, 
  RefreshCw, 
  Package, 
  AlertCircle,
  Check,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react'
import type { Dispatch, BranchDispatch, DispatchItem } from '@/lib/data'

interface FollowUpModalProps {
  isOpen: boolean
  onClose: () => void
  dispatch: Dispatch
  onFollowUpCreated: () => void
}

interface UnresolvedItem {
  branchSlug: string
  branchName: string
  item: DispatchItem
  stillToSend: number
  selected: boolean
  quantity: number // Editable quantity
}

export function FollowUpModal({ 
  isOpen, 
  onClose, 
  dispatch,
  onFollowUpCreated
}: FollowUpModalProps) {
  // State
  const [unresolvedItems, setUnresolvedItems] = useState<UnresolvedItem[]>([])
  const [deliveryDate, setDeliveryDate] = useState<string>('')
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Initialize unresolved items when modal opens
  useEffect(() => {
    if (isOpen && dispatch) {
      const items: UnresolvedItem[] = []
      
      dispatch.branchDispatches.forEach(bd => {
        bd.items.forEach(item => {
          // Only include items with issues that are unresolved
          if (item.issue && item.resolutionStatus !== 'resolved') {
            const receivedQty = item.receivedQty ?? 0
            const stillToSend = item.orderedQty - receivedQty
            
            if (stillToSend > 0) {
              items.push({
                branchSlug: bd.branchSlug,
                branchName: bd.branchName,
                item,
                stillToSend,
                selected: true, // Pre-selected
                quantity: stillToSend // Default to full amount
              })
            }
          }
        })
      })
      
      setUnresolvedItems(items)
      
      // Expand all branches by default
      const allBranches = new Set(items.map(i => i.branchSlug))
      setExpandedBranches(allBranches)
      
      // Set default delivery date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setDeliveryDate(tomorrow.toISOString().split('T')[0])
      
      setError('')
    }
  }, [isOpen, dispatch])

  // Group items by branch
  const itemsByBranch = useMemo(() => {
    const grouped: Record<string, UnresolvedItem[]> = {}
    unresolvedItems.forEach(item => {
      if (!grouped[item.branchSlug]) {
        grouped[item.branchSlug] = []
      }
      grouped[item.branchSlug].push(item)
    })
    return grouped
  }, [unresolvedItems])

  const selectedItems = unresolvedItems.filter(i => i.selected)
  const selectedBranches = new Set(selectedItems.map(i => i.branchSlug))

  const toggleBranch = (branchSlug: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev)
      if (next.has(branchSlug)) {
        next.delete(branchSlug)
      } else {
        next.add(branchSlug)
      }
      return next
    })
  }

  const handleItemSelect = (branchSlug: string, itemId: string, selected: boolean) => {
    setUnresolvedItems(prev => prev.map(ui => 
      ui.branchSlug === branchSlug && ui.item.id === itemId
        ? { ...ui, selected }
        : ui
    ))
  }

  const handleQuantityChange = (branchSlug: string, itemId: string, quantity: number) => {
    setUnresolvedItems(prev => prev.map(ui => 
      ui.branchSlug === branchSlug && ui.item.id === itemId
        ? { ...ui, quantity: Math.min(quantity, ui.stillToSend) }
        : ui
    ))
  }

  const handleSelectAll = () => {
    setUnresolvedItems(prev => prev.map(ui => ({ ...ui, selected: true })))
  }

  const handleClearAll = () => {
    setUnresolvedItems(prev => prev.map(ui => ({ ...ui, selected: false })))
  }

  const handleSelectBranch = (branchSlug: string, selected: boolean) => {
    setUnresolvedItems(prev => prev.map(ui => 
      ui.branchSlug === branchSlug ? { ...ui, selected } : ui
    ))
  }

  const getIssueLabel = (issue: string) => {
    const labels: Record<string, { color: string, label: string }> = {
      missing: { color: 'bg-red-100 text-red-700', label: 'Missing' },
      damaged: { color: 'bg-orange-100 text-orange-700', label: 'Damaged' },
      partial: { color: 'bg-yellow-100 text-yellow-700', label: 'Partial' },
      shortage: { color: 'bg-blue-100 text-blue-700', label: 'Shortage' }
    }
    return labels[issue] || { color: 'bg-gray-100 text-gray-700', label: issue }
  }

  const handleSubmit = async () => {
    setError('')
    
    // Validation
    if (selectedItems.length === 0) {
      setError('Please select at least one item to include in the follow-up')
      return
    }
    
    if (!deliveryDate) {
      setError('Please select a delivery date')
      return
    }
    
    // Validate quantities
    const invalidItems = selectedItems.filter(i => i.quantity <= 0)
    if (invalidItems.length > 0) {
      setError('All selected items must have a quantity greater than 0')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/dispatch/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentDispatchId: dispatch.id,
          deliveryDate,
          items: selectedItems.map(si => ({
            branchSlug: si.branchSlug,
            branchName: si.branchName,
            itemId: si.item.id,
            itemName: si.item.name,
            quantity: si.quantity,
            unit: si.item.unit,
            originalIssue: si.item.issue
          }))
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create follow-up dispatch')
      }

      // Success - refresh data and close
      onFollowUpCreated()
      onClose()
      
    } catch (err: any) {
      setError(err.message || 'Failed to create follow-up dispatch. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Quick date options
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(today)
  dayAfter.setDate(dayAfter.getDate() + 2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <RefreshCw className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Create Follow-Up Dispatch</h2>
              <p className="text-sm text-muted-foreground">
                Resolving issues from {formatDate(dispatch.deliveryDate)}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* No unresolved items */}
          {unresolvedItems.length === 0 ? (
            <div className="text-center py-12">
              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Unresolved Issues</h3>
              <p className="text-muted-foreground">
                All issues from this dispatch have been resolved or don't require follow-up.
              </p>
            </div>
          ) : (
            <>
              {/* Delivery Date Section */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Delivery Date
                </h3>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={deliveryDate === tomorrow.toISOString().split('T')[0] ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDeliveryDate(tomorrow.toISOString().split('T')[0])}
                  >
                    Tomorrow
                  </Button>
                  <Button
                    variant={deliveryDate === dayAfter.toISOString().split('T')[0] ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDeliveryDate(dayAfter.toISOString().split('T')[0])}
                  >
                    Day After
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">or</span>
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={tomorrow.toISOString().split('T')[0]}
                      className="w-auto h-9"
                    />
                  </div>
                </div>
                
                {deliveryDate && (
                  <p className="text-sm text-muted-foreground">
                    Follow-up will be delivered on <strong>{formatDate(deliveryDate)}</strong>
                  </p>
                )}
              </div>

              {/* Items Selection Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Items to Send ({unresolvedItems.length} items with issues)
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearAll}>
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Grouped by Branch */}
                <div className="space-y-3">
                  {Object.entries(itemsByBranch).map(([branchSlug, items]) => {
                    const branchName = items[0]?.branchName || branchSlug
                    const isExpanded = expandedBranches.has(branchSlug)
                    const selectedCount = items.filter(i => i.selected).length
                    const allSelected = selectedCount === items.length
                    
                    return (
                      <div key={branchSlug} className="border rounded-lg overflow-hidden">
                        {/* Branch Header */}
                        <div 
                          className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() => toggleBranch(branchSlug)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={(checked) => {
                                handleSelectBranch(branchSlug, checked as boolean)
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="font-medium">{branchName}</span>
                            <Badge variant="outline" className="text-xs">
                              {selectedCount}/{items.length} selected
                            </Badge>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        {/* Items List */}
                        {isExpanded && (
                          <div className="divide-y">
                            {items.map(ui => {
                              const issueStyle = getIssueLabel(ui.item.issue || '')
                              return (
                                <div 
                                  key={ui.item.id}
                                  className={`p-3 flex items-center gap-3 ${
                                    ui.selected ? 'bg-amber-50' : 'bg-white'
                                  }`}
                                >
                                  <Checkbox
                                    checked={ui.selected}
                                    onCheckedChange={(checked) => 
                                      handleItemSelect(branchSlug, ui.item.id, checked as boolean)
                                    }
                                  />
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">{ui.item.name}</span>
                                      <Badge className={`text-xs ${issueStyle.color}`}>
                                        {issueStyle.label}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      Ordered: {ui.item.orderedQty} • 
                                      Received: {ui.item.receivedQty ?? 0} • 
                                      <span className="text-orange-600 font-medium">
                                        Still to send: {ui.stillToSend} {ui.item.unit}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {ui.selected && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">Qty:</span>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        max={ui.stillToSend}
                                        value={ui.quantity}
                                        onChange={(e) => handleQuantityChange(
                                          branchSlug, 
                                          ui.item.id, 
                                          parseFloat(e.target.value) || 0
                                        )}
                                        className="w-20 h-8 text-sm"
                                      />
                                      <span className="text-sm text-muted-foreground w-12">
                                        {ui.item.unit}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Summary Section */}
              {selectedItems.length > 0 && (
                <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Follow-Up Summary
                  </h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <p>
                      <strong>{selectedItems.length}</strong> items to send across{' '}
                      <strong>{selectedBranches.size}</strong> branches
                    </p>
                    <p className="text-green-600">
                      Delivery: {formatDate(deliveryDate)}
                    </p>
                  </div>
                </div>
              )}

              {/* Info Banner */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Follow-Up Dispatch</p>
                  <p className="mt-1">
                    This will create a new dispatch linked to the original. 
                    Once delivered, the original issues will be marked as resolved.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {selectedItems.length > 0 ? (
              <span>
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
            ) : (
              <span>No items selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedItems.length === 0 || unresolvedItems.length === 0}
              className="min-w-[180px] bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Create Follow-Up Dispatch
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
