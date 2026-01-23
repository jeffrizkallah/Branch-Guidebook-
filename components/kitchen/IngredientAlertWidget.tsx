'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Bell,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Package,
  TrendingUp,
  Loader2,
  Eye,
} from 'lucide-react'
import type { IngredientAlert, MissingIngredient } from '@/lib/data'

interface IngredientAlertWidgetProps {
  scheduleId?: string
  refreshInterval?: number
}

export function IngredientAlertWidget({
  scheduleId,
  refreshInterval = 30000
}: IngredientAlertWidgetProps) {
  const [alerts, setAlerts] = useState<IngredientAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<IngredientAlert | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolution, setResolution] = useState<'ORDERED' | 'IN_STOCK_ERROR' | 'SUBSTITUTED' | 'RESCHEDULED' | 'CANCELLED'>('ORDERED')
  const [resolutionNotes, setResolutionNotes] = useState('')

  useEffect(() => {
    fetchAlerts()

    const interval = setInterval(fetchAlerts, refreshInterval)
    return () => clearInterval(interval)
  }, [scheduleId, refreshInterval])

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams()
      params.set('status', 'PENDING')
      if (scheduleId) params.set('scheduleId', scheduleId)

      const response = await fetch(`/api/ingredient-alerts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAlerts(data)
      }
    } catch (error) {
      console.error('Error fetching ingredient alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewAlert = (alert: IngredientAlert) => {
    setSelectedAlert(alert)
    setDialogOpen(true)
  }

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch(`/api/ingredient-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACKNOWLEDGED' })
      })

      if (response.ok) {
        await fetchAlerts()
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const handleResolve = async () => {
    if (!selectedAlert) return

    if (!resolutionNotes.trim()) {
      alert('Please provide resolution notes')
      return
    }

    setResolving(true)
    try {
      const response = await fetch(`/api/ingredient-alerts/${selectedAlert.alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          resolution,
          resolutionNotes
        })
      })

      if (response.ok) {
        await fetchAlerts()
        handleCloseDialog()
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
    } finally {
      setResolving(false)
    }
  }

  const handleCannotFulfill = async () => {
    if (!selectedAlert) return

    if (!resolutionNotes.trim()) {
      alert('Please provide details on why this cannot be fulfilled')
      return
    }

    setResolving(true)
    try {
      const response = await fetch(`/api/ingredient-alerts/${selectedAlert.alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANNOT_FULFILL',
          resolution: 'CANCELLED',
          resolutionNotes
        })
      })

      if (response.ok) {
        await fetchAlerts()
        handleCloseDialog()
      }
    } catch (error) {
      console.error('Error marking alert as cannot fulfill:', error)
    } finally {
      setResolving(false)
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedAlert(null)
    setResolution('ORDERED')
    setResolutionNotes('')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'LOW':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'MISSING':
        return <X className="h-3 w-3 text-red-600" />
      case 'PARTIAL':
        return <AlertTriangle className="h-3 w-3 text-amber-600" />
      case 'ORDERED':
        return <Clock className="h-3 w-3 text-blue-600" />
      case 'IN_STOCK':
        return <CheckCircle2 className="h-3 w-3 text-green-600" />
      default:
        return null
    }
  }

  const getDaysUntilProduction = (scheduledDate: string) => {
    const date = new Date(scheduledDate)
    const today = new Date()
    const days = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date().getTime()
    const then = new Date(timestamp).getTime()
    const diff = now - then
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const pendingCount = alerts.filter(a => a.status === 'PENDING').length

  return (
    <>
      <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              <span>Ingredient Alerts</span>
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="text-sm font-medium">All Clear!</p>
              <p className="text-xs text-muted-foreground mt-1">
                No missing ingredient alerts at the moment
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {alerts.map(alert => {
                  const daysUntil = getDaysUntilProduction(alert.scheduledDate)
                  const isUrgent = daysUntil <= 1

                  return (
                    <Card
                      key={alert.alertId}
                      className={`border-2 ${getPriorityColor(alert.priority)} hover:shadow-md transition-shadow`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant={alert.priority === 'HIGH' ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {alert.priority}
                              </Badge>
                              {isUrgent && (
                                <Badge className="text-xs bg-red-600">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  URGENT
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(alert.reportedAt)}
                              </span>
                            </div>

                            <h4 className="font-semibold text-sm line-clamp-1">
                              {alert.recipeName}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Production scheduled: {new Date(alert.scheduledDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                              {isUrgent && <span className="text-red-600 font-medium ml-1">(Tomorrow!)</span>}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1">
                              {alert.missingIngredients.slice(0, 3).map((ing, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {getStatusIcon(ing.status)}
                                  <span className="ml-1">{ing.name}</span>
                                </Badge>
                              ))}
                              {alert.missingIngredients.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{alert.missingIngredients.length - 3} more
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground mt-2">
                              Reported by: {alert.reportedByName}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewAlert(alert)}
                            className="flex-shrink-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Alert Details Dialog */}
      {selectedAlert && (
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Ingredient Alert Details
              </DialogTitle>
              <DialogDescription>
                {selectedAlert.recipeName} - {new Date(selectedAlert.scheduledDate).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Alert Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Badge variant={selectedAlert.priority === 'HIGH' ? 'destructive' : 'outline'}>
                    {selectedAlert.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reported</p>
                  <p className="text-sm font-medium">{getTimeAgo(selectedAlert.reportedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reported By</p>
                  <p className="text-sm font-medium">{selectedAlert.reportedByName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Production Date</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedAlert.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Missing Ingredients */}
              <div>
                <h4 className="font-semibold mb-3">Missing Ingredients ({selectedAlert.missingIngredients.length})</h4>
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-3 space-y-2">
                    {selectedAlert.missingIngredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border-2 ${
                          ing.status === 'MISSING'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{ing.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Needed: <span className="font-medium">{ing.quantityNeeded.toFixed(2)} {ing.unit}</span>
                            </p>
                            {ing.status === 'PARTIAL' && (
                              <p className="text-xs text-muted-foreground">
                                Available: <span className="font-medium">{ing.quantityAvailable.toFixed(2)} {ing.unit}</span>
                                {' '}({((ing.quantityAvailable / ing.quantityNeeded) * 100).toFixed(0)}%)
                              </p>
                            )}
                          </div>
                          <Badge className={ing.status === 'MISSING' ? 'bg-red-600' : 'bg-amber-600'}>
                            {ing.status === 'MISSING' ? 'Completely Missing' : 'Partial'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Notes from Head Chef */}
              {selectedAlert.notes && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-900 mb-1">Notes from Head Chef:</p>
                  <p className="text-sm text-blue-800">{selectedAlert.notes}</p>
                </div>
              )}

              {/* Resolution Options */}
              <div className="space-y-3">
                <Label>How will this be resolved?</Label>
                <RadioGroup value={resolution} onValueChange={(v: any) => setResolution(v)}>
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                    <RadioGroupItem value="ORDERED" id="ordered" />
                    <Label htmlFor="ordered" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>Ingredients Ordered</span>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                    <RadioGroupItem value="IN_STOCK_ERROR" id="in_stock" />
                    <Label htmlFor="in_stock" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Already in Stock (Inventory Error)</span>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                    <RadioGroupItem value="SUBSTITUTED" id="substituted" />
                    <Label htmlFor="substituted" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>Substituted with Alternative</span>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                    <RadioGroupItem value="RESCHEDULED" id="rescheduled" />
                    <Label htmlFor="rescheduled" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Production Rescheduled</span>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Resolution Notes */}
              <div className="space-y-2">
                <Label htmlFor="resolutionNotes">Resolution Details</Label>
                <Textarea
                  id="resolutionNotes"
                  placeholder="Provide details about the resolution..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <Button
                variant="destructive"
                onClick={handleCannotFulfill}
                disabled={resolving}
              >
                Cannot Fulfill
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCloseDialog} disabled={resolving}>
                  Cancel
                </Button>
                <Button onClick={handleResolve} disabled={resolving}>
                  {resolving ? 'Resolving...' : 'Mark as Resolved'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
