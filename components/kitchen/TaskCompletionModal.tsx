'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2 } from 'lucide-react'
import type { StationTask } from './types'

interface TaskCompletionModalProps {
  task: StationTask
  onComplete: (task: StationTask, actualQuantity: number, actualUnit: string) => void | Promise<void>
  onClose: () => void
}

const commonUnits = ['kg', 'g', 'L', 'ml', 'pcs', 'portions', 'batches', 'trays']

export function TaskCompletionModal({
  task,
  onComplete,
  onClose
}: TaskCompletionModalProps) {
  const [actualQuantity, setActualQuantity] = useState<string>(task.quantity.toString())
  const [actualUnit, setActualUnit] = useState<string>(task.unit)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const quantity = parseFloat(actualQuantity)
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity')
      setSubmitting(false)
      return
    }

    await onComplete(task, quantity, actualUnit)
    setSubmitting(false)
  }

  const variance = task.quantity > 0
    ? ((parseFloat(actualQuantity) - task.quantity) / task.quantity * 100).toFixed(1)
    : '0'

  const varianceNum = parseFloat(variance)
  const varianceColor = Math.abs(varianceNum) > 10
    ? 'text-red-600'
    : Math.abs(varianceNum) > 5
      ? 'text-amber-600'
      : 'text-green-600'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Complete Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-semibold">{task.recipeName}</p>
              <p className="text-sm text-muted-foreground">
                Target: {task.quantity} {task.unit}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="actual-quantity">Actual Quantity Produced</Label>
                <Input
                  id="actual-quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualQuantity}
                  onChange={(e) => setActualQuantity(e.target.value)}
                  className="text-lg h-12"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual-unit">Unit</Label>
                <Select value={actualUnit} onValueChange={setActualUnit}>
                  <SelectTrigger id="actual-unit" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commonUnits.map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                    {!commonUnits.includes(task.unit) && (
                      <SelectItem value={task.unit}>{task.unit}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variance display */}
            {actualQuantity && parseFloat(actualQuantity) !== task.quantity && (
              <div className={`text-sm ${varianceColor} p-2 rounded bg-muted/50`}>
                Variance: {varianceNum > 0 ? '+' : ''}{variance}%
                ({varianceNum > 0 ? 'Over' : 'Under'} by {Math.abs(parseFloat(actualQuantity) - task.quantity).toFixed(2)} {actualUnit})
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={submitting || !actualQuantity}
            >
              {submitting ? 'Saving...' : 'Complete Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
