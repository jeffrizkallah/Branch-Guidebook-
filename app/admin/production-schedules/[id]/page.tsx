'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Factory, 
  Save,
  ArrowLeft,
  Loader2,
  Calendar,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react'
import type { ProductionSchedule, ProductionDay, ProductionItem, ProductionStation } from '@/lib/data'

const STATIONS: ProductionStation[] = ['Butchery', 'Hot Section', 'Pantry', 'Desserts', 'Cold Section', 'Baker', 'Butcher']
const STATION_COLORS: Record<ProductionStation, string> = {
  'Butchery': 'bg-red-100 text-red-800',
  'Hot Section': 'bg-orange-100 text-orange-800',
  'Pantry': 'bg-green-100 text-green-800',
  'Desserts': 'bg-purple-100 text-purple-800',
  'Cold Section': 'bg-blue-100 text-blue-800',
  'Baker': 'bg-amber-100 text-amber-800',
  'Butcher': 'bg-rose-100 text-rose-800',
}

export default function EditProductionSchedulePage() {
  const router = useRouter()
  const params = useParams()
  const scheduleId = params.id as string

  const [schedule, setSchedule] = useState<ProductionSchedule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSchedule()
  }, [scheduleId])

  const fetchSchedule = async () => {
    try {
      const res = await fetch(`/api/production-schedules/${scheduleId}`)
      if (!res.ok) {
        throw new Error('Schedule not found')
      }
      const data = await res.json()
      setSchedule(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load schedule')
    } finally {
      setIsLoading(false)
    }
  }

  const updateSchedule = (updates: Partial<ProductionSchedule>) => {
    if (!schedule) return
    setSchedule({ ...schedule, ...updates })
  }

  const updateDay = (dayIndex: number, updates: Partial<ProductionDay>) => {
    if (!schedule) return
    const newDays = [...schedule.days]
    newDays[dayIndex] = { ...newDays[dayIndex], ...updates }
    setSchedule({ ...schedule, days: newDays })
  }

  const updateItem = (dayIndex: number, itemIndex: number, updates: Partial<ProductionItem>) => {
    if (!schedule) return
    const newDays = [...schedule.days]
    const newItems = [...newDays[dayIndex].items]
    newItems[itemIndex] = { ...newItems[itemIndex], ...updates }
    newDays[dayIndex] = { ...newDays[dayIndex], items: newItems }
    setSchedule({ ...schedule, days: newDays })
  }

  const addItem = (dayIndex: number) => {
    if (!schedule) return
    const newDays = [...schedule.days]
    const newItem: ProductionItem = {
      itemId: `prod-${Date.now()}`,
      recipeName: '',
      quantity: 0,
      unit: 'Kg',
      station: 'Hot Section',
      notes: '',
      completed: false
    }
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      items: [...newDays[dayIndex].items, newItem]
    }
    setSchedule({ ...schedule, days: newDays })
  }

  const removeItem = (dayIndex: number, itemIndex: number) => {
    if (!schedule) return
    const newDays = [...schedule.days]
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      items: newDays[dayIndex].items.filter((_, i) => i !== itemIndex)
    }
    setSchedule({ ...schedule, days: newDays })
  }

  const saveSchedule = async () => {
    if (!schedule) return

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/production-schedules/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      router.push('/admin/production-schedules')
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !schedule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
        <Link href="/admin/production-schedules">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Schedules
          </Button>
        </Link>
      </div>
    )
  }

  if (!schedule) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Factory className="h-8 w-8 text-orange-500" />
            Edit Production Schedule
          </h1>
          <p className="text-muted-foreground">
            Week of {new Date(schedule.weekStart).toLocaleDateString()}
          </p>
        </div>
        <Link href="/admin/production-schedules">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Schedule Info */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Week Start *</Label>
              <Input
                type="date"
                value={schedule.weekStart}
                onChange={(e) => updateSchedule({ weekStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Week End *</Label>
              <Input
                type="date"
                value={schedule.weekEnd}
                onChange={(e) => updateSchedule({ weekEnd: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Created By *</Label>
              <Input
                value={schedule.createdBy}
                onChange={(e) => updateSchedule({ createdBy: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Days */}
      <div className="space-y-4">
        {schedule.days.map((day, dayIndex) => (
          <Card key={day.date}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {day.dayName}, {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                  <Badge variant="secondary">{day.items.length} items</Badge>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addItem(dayIndex)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {day.items.map((item, itemIndex) => (
                  <div 
                    key={item.itemId} 
                    className="grid grid-cols-12 gap-2 p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="col-span-12 md:col-span-4 space-y-1">
                      <Label className="text-xs">Recipe Name</Label>
                      <Input
                        value={item.recipeName}
                        onChange={(e) => updateItem(dayIndex, itemIndex, { 
                          recipeName: e.target.value 
                        })}
                        placeholder="Recipe name"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => updateItem(dayIndex, itemIndex, { 
                          quantity: parseFloat(e.target.value) || 0 
                        })}
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(dayIndex, itemIndex, { 
                          unit: e.target.value 
                        })}
                        placeholder="Kg"
                      />
                    </div>
                    <div className="col-span-12 md:col-span-3 space-y-1">
                      <Label className="text-xs">Station</Label>
                      <select
                        value={item.station}
                        onChange={(e) => updateItem(dayIndex, itemIndex, { 
                          station: e.target.value as ProductionStation 
                        })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {STATIONS.map(station => (
                          <option key={station} value={station}>{station}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-1 space-y-1 flex items-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(dayIndex, itemIndex)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="col-span-12 space-y-1">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={item.notes}
                        onChange={(e) => updateItem(dayIndex, itemIndex, { 
                          notes: e.target.value 
                        })}
                        placeholder="Optional notes"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
                {day.items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No items for this day. Click "Add Item" to add one.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Link href="/admin/production-schedules">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button 
          onClick={saveSchedule}
          disabled={isSaving}
          className="gap-2 bg-orange-500 hover:bg-orange-600"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  )
}

