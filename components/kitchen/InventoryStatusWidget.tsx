'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatQuantity } from '@/lib/display-utils'

interface ShortageDetail {
  shortage_id: string
  ingredient_name: string
  inventory_item_name: string | null
  required_quantity: number
  available_quantity: number
  shortfall_amount: number
  unit: string
  status: 'MISSING' | 'PARTIAL' | 'CRITICAL'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  affected_recipes: string[]
  affected_production_items: string[]
  production_date: string
}

interface DayStatus {
  date: string
  dayName: string
  status: 'ALL_GOOD' | 'PARTIAL_SHORTAGE' | 'CRITICAL_SHORTAGE'
  shortages: ShortageDetail[]
  itemCount: number
}

interface InventoryStatusWidgetProps {
  scheduleId: string
  scheduleName: string
}

export function InventoryStatusWidget({ scheduleId, scheduleName }: InventoryStatusWidgetProps) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<any>(null)
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([])
  const [selectedDay, setSelectedDay] = useState<DayStatus | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  
  // Progress tracking
  const [checkProgress, setCheckProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState('')

  // Load existing check when component mounts or schedule changes
  useEffect(() => {
    if (scheduleId) {
      console.log('Loading inventory check for schedule:', scheduleId)
      loadCheck()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId])

  const loadCheck = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/inventory-check/${scheduleId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded existing check:', data.result ? 'Found' : 'Not found')
        if (data.result) {
          setCheckResult(data.result)
          processCheckResult(data.result)
        } else {
          setCheckResult(null)
        }
      } else if (response.status === 404) {
        // No check found - this is expected, widget will show "run check" button
        console.log('No existing inventory check found for this schedule')
        setCheckResult(null)
      } else {
        console.error('Error loading check:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading check:', error)
    } finally {
      setLoading(false)
    }
  }

  const runCheck = async () => {
    setChecking(true)
    setCheckProgress(0)
    setCurrentStage('Initializing check...')
    console.log('Running new inventory check for schedule:', scheduleId)
    
    // Smooth progress animation
    let currentProgress = 0
    const progressStages = [
      { target: 15, message: 'Loading production schedule...', duration: 500 },
      { target: 35, message: 'Extracting recipe ingredients...', duration: 1200 },
      { target: 55, message: 'Processing sub-recipes...', duration: 1500 },
      { target: 70, message: 'Aggregating requirements...', duration: 1000 },
      { target: 85, message: 'Comparing with inventory...', duration: 1200 },
    ]
    
    let stageIndex = 0
    let isCompleted = false
    
    // Animate progress smoothly
    const progressInterval = setInterval(() => {
      if (isCompleted || !checking) {
        clearInterval(progressInterval)
        return
      }
      
      if (stageIndex < progressStages.length) {
        const stage = progressStages[stageIndex]
        
        // Increment progress smoothly towards target
        if (currentProgress < stage.target) {
          currentProgress += 1
          setCheckProgress(currentProgress)
        } else {
          // Move to next stage
          stageIndex++
          if (stageIndex < progressStages.length) {
            setCurrentStage(progressStages[stageIndex].message)
          }
        }
      }
    }, 80) // Update every 80ms for smooth animation
    
    try {
      const response = await fetch('/api/inventory-check/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, userId: '1' })
      })
      
      clearInterval(progressInterval)
      isCompleted = true
      
      if (response.ok) {
        // Quickly finish the progress bar
        setCurrentStage('Processing results...')
        for (let i = currentProgress; i <= 95; i += 5) {
          setCheckProgress(i)
          await new Promise(resolve => setTimeout(resolve, 50))
        }
        
        const data = await response.json()
        console.log('Inventory check completed:', data.result)
        
        setCheckProgress(100)
        setCurrentStage('Complete!')
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 600))
        
        setCheckResult(data.result)
        processCheckResult(data.result)
      } else {
        console.error('Inventory check failed:', response.status, response.statusText)
        setCurrentStage('Check failed. Please try again.')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      clearInterval(progressInterval)
      isCompleted = true
      console.error('Error running check:', error)
      setCurrentStage('Error occurred. Please try again.')
      await new Promise(resolve => setTimeout(resolve, 2000))
    } finally {
      setChecking(false)
      setCheckProgress(0)
      setCurrentStage('')
    }
  }

  const processCheckResult = (result: any) => {
    // Group shortages by production date
    const shortagesByDate = new Map<string, ShortageDetail[]>()
    
    for (const shortage of result.shortages || []) {
      const date = shortage.production_date || result.productionDates[0]
      if (!shortagesByDate.has(date)) {
        shortagesByDate.set(date, [])
      }
      shortagesByDate.get(date)!.push(shortage)
    }

    // Create day statuses
    const statuses: DayStatus[] = result.productionDates.map((date: string) => {
      const dayShortages = shortagesByDate.get(date) || []
      const hasCritical = dayShortages.some(s => s.status === 'MISSING' || s.status === 'CRITICAL')
      const hasPartial = dayShortages.some(s => s.status === 'PARTIAL')
      
      let status: 'ALL_GOOD' | 'PARTIAL_SHORTAGE' | 'CRITICAL_SHORTAGE'
      if (hasCritical) {
        status = 'CRITICAL_SHORTAGE'
      } else if (hasPartial) {
        status = 'PARTIAL_SHORTAGE'
      } else {
        status = 'ALL_GOOD'
      }

      const dayDate = new Date(date)
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' })

      return {
        date,
        dayName: `${dayName} ${dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        status,
        shortages: dayShortages,
        itemCount: 0 // Would need to get from schedule
      }
    })

    setDayStatuses(statuses)
  }

  const toggleDayExpanded = (date: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDays(newExpanded)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ALL_GOOD':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'PARTIAL_SHORTAGE':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case 'CRITICAL_SHORTAGE':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Info className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ALL_GOOD':
        return <Badge className="bg-green-500 hover:bg-green-600">All Clear</Badge>
      case 'PARTIAL_SHORTAGE':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Partial Shortages</Badge>
      case 'CRITICAL_SHORTAGE':
        return <Badge className="bg-red-500 hover:bg-red-600">Missing Items</Badge>
      default:
        return <Badge variant="secondary">Not Checked</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge className="bg-red-500 hover:bg-red-600 text-xs">HIGH</Badge>
      case 'MEDIUM':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-xs">MEDIUM</Badge>
      case 'LOW':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">LOW</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!checkResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checking ? (
            // Inline progress display
            <div className="py-6">
              <div className="flex items-center justify-center mb-4">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">{currentStage}</span>
                  <span className="font-semibold text-blue-600">{checkProgress}%</span>
                </div>
                <Progress value={checkProgress} className="h-2" />
                <p className="text-xs text-gray-500 text-center">
                  Analyzing production schedule and inventory...
                </p>
              </div>
            </div>
          ) : (
            // No check yet - show button
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                No inventory check has been run for this schedule yet.
              </p>
              <Button onClick={runCheck} disabled={checking}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Inventory Check
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Production Inventory Status
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={runCheck}
              disabled={checking}
            >
              {checking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Check Now
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {scheduleName}
          </p>
        </CardHeader>
        <CardContent>
          {/* Show inline progress when checking */}
          {checking && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 font-medium flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {currentStage}
                  </span>
                  <span className="font-semibold text-blue-600">{checkProgress}%</span>
                </div>
                <Progress value={checkProgress} className="h-2" />
              </div>
            </div>
          )}
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{checkResult.missing}</div>
              <div className="text-xs text-gray-600">Missing/Critical</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{checkResult.partial}</div>
              <div className="text-xs text-gray-600">Partial Shortages</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{checkResult.sufficient}</div>
              <div className="text-xs text-gray-600">Sufficient</div>
            </div>
          </div>

          {/* Day-by-day status */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {dayStatuses.map((day) => (
                <div key={day.date} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleDayExpanded(day.date)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(day.status)}
                      <div className="text-left">
                        <div className="font-medium">{day.dayName}</div>
                        {day.shortages.length > 0 && (
                          <div className="text-sm text-gray-600">
                            {day.shortages.length} shortage{day.shortages.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(day.status)}
                      {expandedDays.has(day.date) ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {expandedDays.has(day.date) && day.shortages.length > 0 && (
                    <div className="border-t bg-gray-50 p-4 space-y-3">
                      {day.shortages.map((shortage) => (
                        <div key={shortage.shortage_id} className="bg-white p-3 rounded border">
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-medium">{shortage.ingredient_name}</div>
                            {getPriorityBadge(shortage.priority)}
                          </div>
                          <div className="text-sm space-y-1">
                            {(() => {
                              const required = formatQuantity(shortage.required_quantity ?? 0, shortage.unit)
                              const available = formatQuantity(shortage.available_quantity ?? 0, shortage.unit)
                              const shortfall = formatQuantity(shortage.shortfall_amount ?? 0, shortage.unit)
                              
                              return (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Required:</span>
                                    <span className="font-medium">
                                      {required.value} {required.unit}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Available:</span>
                                    <span className="font-medium">
                                      {available.value} {available.unit}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Shortfall:</span>
                                    <span className="font-medium text-red-600">
                                      -{shortfall.value} {shortfall.unit}
                                    </span>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                          {shortage.affected_recipes.length > 0 && (
                            <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                              Used in: {shortage.affected_recipes.slice(0, 2).join(', ')}
                              {shortage.affected_recipes.length > 2 && ` +${shortage.affected_recipes.length - 2} more`}
                            </div>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedDay(day)
                          setDetailModalOpen(true)
                        }}
                      >
                        View Full Details & Actions
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedDay && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedDay.dayName} - Inventory Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedDay.status)}
                {getStatusBadge(selectedDay.status)}
              </div>

              <div className="space-y-3">
                {selectedDay.shortages.map((shortage) => (
                  <Card key={shortage.shortage_id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-lg">{shortage.ingredient_name}</h4>
                        {getPriorityBadge(shortage.priority)}
                      </div>

                      {(() => {
                        const required = formatQuantity(shortage.required_quantity ?? 0, shortage.unit)
                        const available = formatQuantity(shortage.available_quantity ?? 0, shortage.unit)
                        const shortfall = formatQuantity(shortage.shortfall_amount ?? 0, shortage.unit)
                        
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <div className="text-sm text-gray-600">Required</div>
                                <div className="text-xl font-bold">
                                  {required.value} {required.unit}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Available</div>
                                <div className="text-xl font-bold">
                                  {available.value} {available.unit}
                                </div>
                              </div>
                            </div>

                            <div className="bg-red-50 p-3 rounded mb-4">
                              <div className="text-sm text-gray-600">Shortfall</div>
                              <div className="text-xl font-bold text-red-600">
                                -{shortfall.value} {shortfall.unit}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {(((shortage.shortfall_amount ?? 0) / (shortage.required_quantity || 1)) * 100).toFixed(1)}% short
                              </div>
                            </div>
                          </>
                        )
                      })()}

                      {shortage.affected_recipes.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium mb-2">Used in recipes:</div>
                          <div className="space-y-1">
                            {shortage.affected_recipes.map((recipe, idx) => (
                              <div key={idx} className="text-sm text-gray-700">
                                • {recipe}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {shortage.inventory_item_name && (
                        <div className="text-xs text-gray-500 mt-2">
                          Inventory item: {shortage.inventory_item_name}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
