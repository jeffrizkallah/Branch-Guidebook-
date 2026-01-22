'use client'

import { useState, useEffect, useMemo } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  Factory, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Printer,
  Calendar,
  ClipboardList
} from 'lucide-react'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { isCentralKitchen } from '@/lib/data'
import type { ProductionSchedule, ProductionStation, Branch } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const STATIONS: ProductionStation[] = ['Butchery', 'Hot Section', 'Pantry', 'Desserts', 'Cold Section', 'Baker', 'Butcher']
const STATION_COLORS: Record<ProductionStation, string> = {
  'Butchery': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Hot Section': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Pantry': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Desserts': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Cold Section': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Baker': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Butcher': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
}

interface ProductionSchedulePageProps {
  params: {
    slug: string
  }
}

export default function ProductionSchedulePage({ params }: ProductionSchedulePageProps) {
  const [branch, setBranch] = useState<Branch | null | undefined>(undefined)
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedScheduleIndex, setSelectedScheduleIndex] = useState(0)
  const [selectedStation, setSelectedStation] = useState<'all' | ProductionStation>('all')
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)

  // Load branch data from API
  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        const found = data.find((b: Branch) => b.slug === params.slug)
        setBranch(found || null)
        
        // Redirect if not Central Kitchen
        if (found && !isCentralKitchen(found)) {
          window.location.href = `/branch/${found.slug}`
        }
      })
      .catch(() => setBranch(null))
  }, [params.slug])

  // Fetch schedules
  useEffect(() => {
    async function fetchSchedules() {
      try {
        const res = await fetch('/api/production-schedules')
        const data = await res.json()
        setSchedules(data)
        
        // Find current week's schedule
        const today = new Date()
        const currentIndex = data.findIndex((s: ProductionSchedule) => {
          const weekStart = new Date(s.weekStart)
          const weekEnd = new Date(s.weekEnd)
          return today >= weekStart && today <= weekEnd
        })
        if (currentIndex >= 0) {
          setSelectedScheduleIndex(currentIndex)
        }
        
        // Find today's day in the schedule
        const todayStr = today.toISOString().split('T')[0]
        if (data[currentIndex >= 0 ? currentIndex : 0]?.days) {
          const dayIndex = data[currentIndex >= 0 ? currentIndex : 0].days.findIndex(
            (d: any) => d.date === todayStr
          )
          if (dayIndex >= 0) {
            setSelectedDayIndex(dayIndex)
          }
        }
      } catch (error) {
        console.error('Failed to fetch schedules:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSchedules()
  }, [])

  const currentSchedule = schedules[selectedScheduleIndex]
  const currentDay = currentSchedule?.days[selectedDayIndex]

  // Filter items by station
  const filteredItems = useMemo(() => {
    if (!currentDay) return []
    if (selectedStation === 'all') return currentDay.items
    return currentDay.items.filter(item => item.station === selectedStation)
  }, [currentDay, selectedStation])

  // Group items by station for the overview
  const itemsByStation = useMemo((): Record<ProductionStation, typeof currentDay.items> => {
    const empty = STATIONS.reduce((acc, station) => {
      acc[station] = []
      return acc
    }, {} as Record<ProductionStation, typeof currentDay.items>)
    
    if (!currentDay) return empty
    return STATIONS.reduce((acc, station) => {
      acc[station] = currentDay.items.filter(item => item.station === station)
      return acc
    }, {} as Record<ProductionStation, typeof currentDay.items>)
  }, [currentDay])

  // Toggle item completion
  const toggleItemCompletion = async (itemId: string, completed: boolean) => {
    if (!currentSchedule || !currentDay) return
    
    try {
      await fetch(`/api/production-schedules/${currentSchedule.scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: currentDay.date,
          itemId,
          completed
        })
      })
      
      // Update local state
      setSchedules(prev => prev.map(s => {
        if (s.scheduleId !== currentSchedule.scheduleId) return s
        return {
          ...s,
          days: s.days.map(d => {
            if (d.date !== currentDay.date) return d
            return {
              ...d,
              items: d.items.map(item => {
                if (item.itemId !== itemId) return item
                return { ...item, completed }
              })
            }
          })
        }
      }))
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  // Calculate completion stats
  const completionStats = useMemo(() => {
    if (!currentDay) return { total: 0, completed: 0, percentage: 0 }
    const total = currentDay.items.length
    const completed = currentDay.items.filter(item => item.completed).length
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }, [currentDay])

  if (branch === null) {
    notFound()
  }

  if (branch === undefined || isLoading) {
    return (
      <div className="flex min-h-screen">
        <RoleSidebar />
        <main className="flex-1 flex flex-col pt-16 md:pt-0 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <RoleSidebar />

      <main className="flex-1 flex flex-col pt-16 md:pt-0">
        <div className="flex-1 container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: branch.name, href: `/branch/${branch.slug}` },
            { label: 'Production Schedule' },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Factory className="h-8 w-8 text-orange-500" />
            <h1 className="text-4xl font-bold">Production Schedule</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Central Kitchen - Weekly Production Plan
          </p>
        </div>

        {schedules.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Schedules Found</h3>
              <p className="text-muted-foreground mb-4">
                There are no production schedules available.
              </p>
              <Link href="/admin/production-schedules">
                <Button>Create Production Schedule</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Week Navigator */}
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedScheduleIndex(Math.max(0, selectedScheduleIndex - 1))}
                    disabled={selectedScheduleIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous Week
                  </Button>
                  
                  <div className="text-center">
                    <h2 className="font-semibold">
                      Week of {new Date(currentSchedule.weekStart).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })} - {new Date(currentSchedule.weekEnd).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Created by {currentSchedule.createdBy}
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedScheduleIndex(Math.min(schedules.length - 1, selectedScheduleIndex + 1))}
                    disabled={selectedScheduleIndex === schedules.length - 1}
                  >
                    Next Week
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Day Tabs */}
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex gap-2 flex-wrap justify-center">
                  {currentSchedule.days.map((day, index) => (
                    <Button
                      key={day.date}
                      variant={selectedDayIndex === index ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedDayIndex(index)}
                      className="min-w-[100px]"
                    >
                      <div className="text-center">
                        <div className="font-medium">{day.dayName}</div>
                        <div className="text-xs opacity-70">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {currentDay && (
              <>
                {/* Progress Card */}
                <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{currentDay.dayName}'s Progress</h3>
                        <p className="text-sm text-muted-foreground">
                          {completionStats.completed} of {completionStats.total} items completed
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-orange-500">
                          {completionStats.percentage}%
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-4 h-3 bg-orange-200 dark:bg-orange-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${completionStats.percentage}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Station Filter & Print */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <Tabs value={selectedStation} onValueChange={(v) => setSelectedStation(v as typeof selectedStation)}>
                    <TabsList>
                      <TabsTrigger value="all">All Stations</TabsTrigger>
                      {STATIONS.map(station => (
                        <TabsTrigger key={station} value={station}>
                          {station} ({itemsByStation[station]?.length || 0})
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Schedule
                  </Button>
                </div>

                {/* Items List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Production Items - {selectedStation === 'all' ? 'All Stations' : selectedStation}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredItems.length > 0 ? (
                      <div className="space-y-2">
                        {filteredItems.map(item => (
                          <div 
                            key={item.itemId}
                            className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                              item.completed 
                                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                                : 'bg-card hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={(checked) => toggleItemCompletion(item.itemId, checked as boolean)}
                            />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {item.recipeName}
                                </h4>
                                <Badge className={STATION_COLORS[item.station]}>
                                  {item.station}
                                </Badge>
                              </div>
                              {item.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                              )}
                            </div>
                            
                            <div className="text-right shrink-0">
                              <div className="font-semibold text-lg">
                                {item.quantity}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.unit}
                              </div>
                            </div>
                            
                            {item.completed && (
                              <Check className="h-5 w-5 text-green-500 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Factory className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No items for this station on {currentDay.dayName}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
        </div>
        <Footer />
      </main>
    </div>
  )
}

