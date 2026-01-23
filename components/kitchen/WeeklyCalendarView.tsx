'use client'

import { useState, DragEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Calendar,
  GripVertical,
  AlertCircle,
  Package,
  TrendingUp,
  Clock,
} from 'lucide-react'
import type { ProductionSchedule, ProductionItem, ProductionStation } from '@/lib/data'

interface WeeklyCalendarViewProps {
  schedule: ProductionSchedule
  onReschedule: (itemId: string, currentDate: string, newDate: string, reason: string) => void | Promise<void>
  onItemClick?: (item: ProductionItem, date: string) => void
}

type RescheduleReason = 'missing_ingredients' | 'capacity_issue' | 'equipment_unavailable' | 'other'

export function WeeklyCalendarView({
  schedule,
  onReschedule,
  onItemClick
}: WeeklyCalendarViewProps) {
  const [draggedItem, setDraggedItem] = useState<{ item: ProductionItem; date: string } | null>(null)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean
    item: ProductionItem | null
    fromDate: string
    toDate: string
  }>({
    open: false,
    item: null,
    fromDate: '',
    toDate: ''
  })
  const [reason, setReason] = useState<RescheduleReason>('missing_ingredients')
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDragStart = (item: ProductionItem, date: string, e: DragEvent<HTMLDivElement>) => {
    setDraggedItem({ item, date })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (date: string, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setHoveredDate(date)
  }

  const handleDragLeave = () => {
    setHoveredDate(null)
  }

  const handleDrop = (targetDate: string, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setHoveredDate(null)

    if (!draggedItem) return
    if (draggedItem.date === targetDate) return // Same date, no move

    // Open confirmation dialog
    setRescheduleDialog({
      open: true,
      item: draggedItem.item,
      fromDate: draggedItem.date,
      toDate: targetDate
    })

    setDraggedItem(null)
  }

  const handleConfirmReschedule = async () => {
    if (!rescheduleDialog.item) return

    const reasonText = reason === 'other' ? customReason : reason.replace(/_/g, ' ')
    if (!reasonText.trim()) {
      alert('Please provide a reason for rescheduling')
      return
    }

    setLoading(true)
    try {
      await onReschedule(
        rescheduleDialog.item.itemId,
        rescheduleDialog.fromDate,
        rescheduleDialog.toDate,
        reasonText
      )
      handleCloseDialog()
    } finally {
      setLoading(false)
    }
  }

  const handleCloseDialog = () => {
    setRescheduleDialog({ open: false, item: null, fromDate: '', toDate: '' })
    setReason('missing_ingredients')
    setCustomReason('')
  }

  const getItemsForDate = (date: string) => {
    const day = schedule.days.find(d => d.date === date)
    return day?.items || []
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getDayName = (dateStr: string) => {
    const day = schedule.days.find(d => d.date === dateStr)
    return day?.dayName || ''
  }

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  const getItemColor = (item: ProductionItem) => {
    if (item.completed) return 'bg-green-100 border-green-300 text-green-800'
    if (item.assignedTo) return 'bg-blue-100 border-blue-300 text-blue-800'
    if (item.hasIngredientAlert) return 'bg-red-100 border-red-300 text-red-800'
    if (item.adjustedQuantity) return 'bg-amber-100 border-amber-300 text-amber-800'
    return 'bg-gray-100 border-gray-300 text-gray-800'
  }

  const getStationBadgeColor = (station: ProductionStation | undefined) => {
    if (!station) return 'bg-gray-500'
    const colors: Record<string, string> = {
      'Hot Section': 'bg-red-500',
      'Cold Section': 'bg-blue-500',
      'Baker': 'bg-amber-500',
      'Butcher': 'bg-rose-500',
    }
    return colors[station] || 'bg-gray-500'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Production Calendar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Drag and drop items to reschedule between days
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {schedule.days.map(day => {
          const items = getItemsForDate(day.date)
          const isHovered = hoveredDate === day.date
          const isTodayDate = isToday(day.date)

          return (
            <Card
              key={day.date}
              className={`transition-all ${
                isHovered
                  ? 'ring-2 ring-primary shadow-lg'
                  : isTodayDate
                  ? 'ring-2 ring-blue-400'
                  : ''
              }`}
              onDragOver={(e) => handleDragOver(day.date, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(day.date, e)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{getDayName(day.date)}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {formatDate(day.date)}
                    </div>
                  </div>
                  <Badge variant={isTodayDate ? 'default' : 'outline'} className="text-xs">
                    {items.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 min-h-[200px]">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No items</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div
                      key={item.itemId}
                      draggable={!item.completed && !item.startedAt}
                      onDragStart={(e) => handleDragStart(item, day.date, e)}
                      onClick={() => onItemClick?.(item, day.date)}
                      className={`p-2 rounded border-2 cursor-move transition-all hover:shadow-md ${getItemColor(
                        item
                      )} ${draggedItem?.item.itemId === item.itemId ? 'opacity-50' : ''} ${
                        item.completed || item.startedAt ? 'cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!item.completed && !item.startedAt && (
                          <GripVertical className="h-4 w-4 flex-shrink-0 opacity-40 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium line-clamp-2">
                            {item.recipeName}
                          </p>
                          <p className="text-xs opacity-75 mt-0.5">
                            {item.quantity} {item.unit}
                          </p>
                          
                          {/* Status indicators */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.completed && (
                              <Badge className="text-[10px] h-4 px-1 bg-green-600">
                                Done
                              </Badge>
                            )}
                            {item.assignedTo && !item.completed && (
                              <Badge className={`text-[10px] h-4 px-1 ${getStationBadgeColor(item.assignedTo)}`}>
                                {item.assignedTo}
                              </Badge>
                            )}
                            {item.hasIngredientAlert && (
                              <Badge className="text-[10px] h-4 px-1 bg-red-600">
                                <AlertCircle className="h-2 w-2 mr-0.5" />
                                Alert
                              </Badge>
                            )}
                            {item.adjustedQuantity && (
                              <Badge className="text-[10px] h-4 px-1 bg-amber-600">
                                Adjusted
                              </Badge>
                            )}
                            {item.rescheduledDate && (
                              <Badge className="text-[10px] h-4 px-1 bg-purple-600">
                                Moved
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Reschedule Confirmation Dialog */}
      <Dialog open={rescheduleDialog.open} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Confirm Reschedule
            </DialogTitle>
            <DialogDescription>
              Move <strong>{rescheduleDialog.item?.recipeName}</strong> from{' '}
              <strong>{getDayName(rescheduleDialog.fromDate)}</strong> to{' '}
              <strong>{getDayName(rescheduleDialog.toDate)}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date comparison */}
            <div className="flex items-center justify-center gap-3 p-3 bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="font-semibold">{getDayName(rescheduleDialog.fromDate)}</p>
                <p className="text-xs">{formatDate(rescheduleDialog.fromDate)}</p>
              </div>
              <div className="text-2xl text-muted-foreground">→</div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">To</p>
                <p className="font-semibold">{getDayName(rescheduleDialog.toDate)}</p>
                <p className="text-xs">{formatDate(rescheduleDialog.toDate)}</p>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-3">
              <Label>Reason for Rescheduling</Label>
              <RadioGroup value={reason} onValueChange={(v) => setReason(v as RescheduleReason)}>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <RadioGroupItem value="missing_ingredients" id="missing_ingredients" />
                  <Label htmlFor="missing_ingredients" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Missing Ingredients</span>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <RadioGroupItem value="capacity_issue" id="capacity_issue" />
                  <Label htmlFor="capacity_issue" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Capacity Issue</span>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <RadioGroupItem value="equipment_unavailable" id="equipment_unavailable" />
                  <Label htmlFor="equipment_unavailable" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Equipment Unavailable</span>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <RadioGroupItem value="other" id="other_reason" />
                  <Label htmlFor="other_reason" className="flex-1 cursor-pointer">
                    <span>Other Reason</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Custom Reason */}
            {reason === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Please specify</Label>
                <Textarea
                  id="customReason"
                  placeholder="Enter reason for rescheduling..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Info box */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="text-blue-900">
                This action will be logged. If the item is already assigned to a station, they will be notified of the change.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReschedule} disabled={loading}>
              {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
