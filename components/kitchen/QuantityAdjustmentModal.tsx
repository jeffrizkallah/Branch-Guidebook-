'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Scale, AlertCircle, TrendingDown, Package, ArrowRight } from 'lucide-react'
import type { ProductionItem } from '@/lib/data'

interface QuantityAdjustmentModalProps {
  item: ProductionItem
  open: boolean
  onClose: () => void
  onConfirm: (adjustedQuantity: number, reason: string, inventoryOffset: number) => void | Promise<void>
  scheduleId: string
  selectedDate: string
}

type AdjustmentReason = 'existing_inventory' | 'capacity_constraints' | 'ingredient_shortage' | 'other'

export function QuantityAdjustmentModal({
  item,
  open,
  onClose,
  onConfirm,
  scheduleId,
  selectedDate
}: QuantityAdjustmentModalProps) {
  const originalQuantity = item.originalQuantity || item.quantity
  const [inventoryAmount, setInventoryAmount] = useState<string>('')
  const [adjustedQuantity, setAdjustedQuantity] = useState<string>(originalQuantity.toString())
  const [reason, setReason] = useState<AdjustmentReason>('existing_inventory')
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState(false)

  // Auto-calculate adjusted quantity when inventory changes
  useEffect(() => {
    if (reason === 'existing_inventory' && inventoryAmount) {
      const inventory = parseFloat(inventoryAmount)
      if (!isNaN(inventory) && inventory >= 0) {
        const newQuantity = Math.max(0, originalQuantity - inventory)
        setAdjustedQuantity(newQuantity.toString())
      }
    }
  }, [inventoryAmount, originalQuantity, reason])

  const handleSubmit = async () => {
    const adjusted = parseFloat(adjustedQuantity)
    const inventory = reason === 'existing_inventory' ? parseFloat(inventoryAmount || '0') : 0

    if (isNaN(adjusted) || adjusted < 0) {
      alert('Please enter a valid adjusted quantity')
      return
    }

    if (adjusted === originalQuantity) {
      alert('Adjusted quantity is the same as original. No changes needed.')
      return
    }

    const reasonText = reason === 'other' ? customReason : reason.replace(/_/g, ' ')
    if (!reasonText.trim()) {
      alert('Please provide a reason for the adjustment')
      return
    }

    setLoading(true)
    try {
      await onConfirm(adjusted, reasonText, inventory)
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setInventoryAmount('')
    setAdjustedQuantity(originalQuantity.toString())
    setReason('existing_inventory')
    setCustomReason('')
    onClose()
  }

  const adjustedValue = parseFloat(adjustedQuantity)
  const isValid = !isNaN(adjustedValue) && adjustedValue >= 0
  const difference = originalQuantity - adjustedValue
  const percentageChange = originalQuantity > 0 ? ((difference / originalQuantity) * 100).toFixed(1) : '0'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Adjust Production Quantity
          </DialogTitle>
          <DialogDescription>
            Modify the production quantity for <strong>{item.recipeName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Original Order Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Original Order</span>
              <Badge variant="secondary" className="text-lg font-bold">
                {originalQuantity} {item.unit}
              </Badge>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-3">
            <Label>Reason for Adjustment</Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as AdjustmentReason)}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="existing_inventory" id="existing_inventory" />
                <Label htmlFor="existing_inventory" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">Existing Inventory</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    We already have some of this item in stock
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="capacity_constraints" id="capacity_constraints" />
                <Label htmlFor="capacity_constraints" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    <span className="font-medium">Capacity Constraints</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Limited production capacity today
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="ingredient_shortage" id="ingredient_shortage" />
                <Label htmlFor="ingredient_shortage" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Ingredient Shortage</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Not enough ingredients to produce full amount
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="flex-1 cursor-pointer">
                  <span className="font-medium">Other Reason</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Inventory Input (only for existing_inventory) */}
          {reason === 'existing_inventory' && (
            <div className="space-y-2">
              <Label htmlFor="inventory">Current Inventory Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="inventory"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={inventoryAmount}
                  onChange={(e) => setInventoryAmount(e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center px-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">{item.unit}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Amount already available in inventory
              </p>
            </div>
          )}

          {/* Custom Reason Input (only for other) */}
          {reason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Please specify the reason</Label>
              <Textarea
                id="customReason"
                placeholder="Enter reason for adjustment..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Adjusted Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="adjusted">Adjusted Production Quantity</Label>
            <div className="flex gap-2">
              <Input
                id="adjusted"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={adjustedQuantity}
                onChange={(e) => setAdjustedQuantity(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center px-3 bg-muted rounded-md">
                <span className="text-sm font-medium">{item.unit}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The actual amount to produce
            </p>
          </div>

          {/* Calculation Preview */}
          {isValid && adjustedValue !== originalQuantity && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Production Adjustment</span>
                <Badge className="bg-blue-600">
                  {difference > 0 ? '-' : '+'}{Math.abs(difference).toFixed(1)} {item.unit} ({percentageChange}%)
                </Badge>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="font-bold text-lg">{originalQuantity} {item.unit}</span>
                <ArrowRight className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-lg text-blue-600">{adjustedValue.toFixed(1)} {item.unit}</span>
              </div>
              <p className="text-xs text-blue-700 mt-2 text-center">
                Recipe ingredients will be automatically scaled to match this quantity
              </p>
            </div>
          )}

          {/* Warning if quantity is 0 */}
          {isValid && adjustedValue === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">No Production</p>
                <p className="text-xs text-amber-700 mt-1">
                  Setting quantity to 0 means this item will not be produced. Consider rescheduling instead.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isValid}>
            {loading ? 'Adjusting...' : 'Confirm Adjustment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
