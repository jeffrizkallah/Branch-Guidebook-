'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { formatQuantity } from '@/lib/display-utils'
import type { Shortage } from './ShortagesTable'

interface BulkResolveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedShortages: Shortage[]
  onResolve: (action: string, notes: string) => Promise<void>
}

export function BulkResolveModal({
  open,
  onOpenChange,
  selectedShortages,
  onResolve
}: BulkResolveModalProps) {
  const [resolutionAction, setResolutionAction] = useState<string>('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolving, setResolving] = useState(false)
  const [showAllItems, setShowAllItems] = useState(false)

  const handleResolve = async () => {
    if (!resolutionAction) return

    setResolving(true)
    try {
      await onResolve(resolutionAction, resolutionNotes)
      setResolutionAction('')
      setResolutionNotes('')
      onOpenChange(false)
    } catch (error) {
      console.error('Error resolving shortages:', error)
    } finally {
      setResolving(false)
    }
  }

  const displayItems = showAllItems ? selectedShortages : selectedShortages.slice(0, 3)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Resolve Shortages</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-3">
              You are resolving {selectedShortages.length} ingredient shortage{selectedShortages.length !== 1 ? 's' : ''}
            </p>
            
            <div className="space-y-2">
              <div className="text-xs font-semibold text-blue-700 mb-2">Selected Items:</div>
              {displayItems.map((shortage) => {
                const shortfall = formatQuantity(Math.abs(shortage.shortfall_amount), shortage.unit)
                return (
                  <div key={shortage.shortage_id} className="text-sm bg-white rounded px-3 py-2 border">
                    • {shortage.ingredient_name}{' '}
                    <span className="text-red-600 font-medium">
                      (-{shortfall.value} {shortfall.unit})
                    </span>
                  </div>
                )
              })}
              
              {selectedShortages.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllItems(!showAllItems)}
                  className="w-full text-blue-600"
                >
                  {showAllItems ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show all {selectedShortages.length} items
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">
              Resolution Action
            </Label>
            <RadioGroup value={resolutionAction} onValueChange={setResolutionAction}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ORDERED" id="bulk-ordered" />
                  <Label htmlFor="bulk-ordered" className="cursor-pointer">
                    Ingredients Ordered - Delivery scheduled
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="IN_STOCK_ERROR" id="bulk-in-stock" />
                  <Label htmlFor="bulk-in-stock" className="cursor-pointer">
                    Already in Stock - Inventory error
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SUBSTITUTED" id="bulk-substituted" />
                  <Label htmlFor="bulk-substituted" className="cursor-pointer">
                    Substitution Available - Using alternative
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="RESCHEDULED" id="bulk-rescheduled" />
                  <Label htmlFor="bulk-rescheduled" className="cursor-pointer">
                    Production Rescheduled - Moved to different date
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CANCELLED" id="bulk-cancelled" />
                  <Label htmlFor="bulk-cancelled" className="cursor-pointer">
                    Cannot Fulfill - Unable to resolve
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="bulk-notes" className="text-base font-semibold mb-2 block">
              Resolution Notes
            </Label>
            <Textarea
              id="bulk-notes"
              placeholder="Add details about how these shortages were resolved..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
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
            Apply to All {selectedShortages.length} Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
