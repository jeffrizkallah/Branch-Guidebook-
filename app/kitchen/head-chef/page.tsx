'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChefHat,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  Clock,
  Flame,
  Snowflake,
  CakeSlice,
  Beef,
  RefreshCw,
  Printer,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { StationProgressCard } from '@/components/kitchen/StationProgressCard'
import { UnassignedItemsList } from '@/components/kitchen/UnassignedItemsList'
import { AssignedItemsByStation } from '@/components/kitchen/AssignedItemsByStation'
import { RecipeViewModal } from '@/components/kitchen/RecipeViewModal'
import type { ProductionSchedule, ProductionItem, ProductionStation, Recipe } from '@/lib/data'
import { getActiveStations, normalizeStationName } from '@/lib/data'

// Station icons mapping
const stationIcons: Record<string, React.ReactNode> = {
  'Hot Section': <Flame className="h-4 w-4" />,
  'Cold Section': <Snowflake className="h-4 w-4" />,
  'Baker': <CakeSlice className="h-4 w-4" />,
  'Butcher': <Beef className="h-4 w-4" />,
}

// Station colors mapping
const stationColors: Record<string, { bg: string; text: string; border: string }> = {
  'Hot Section': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Cold Section': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Baker': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Butcher': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
}

export default function HeadChefDashboard() {
  const { user, loading: authLoading } = useAuth({
    required: true,
    allowedRoles: ['admin', 'operations_lead', 'head_chef']
  })

  const [schedules, setSchedules] = useState<ProductionSchedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<ProductionSchedule | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // Recipe modal states
  const [recipeModalItem, setRecipeModalItem] = useState<ProductionItem | null>(null)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  // Get items for the selected date
  const getItemsForDate = useCallback(() => {
    if (!selectedSchedule || !selectedDate) return []
    const day = selectedSchedule.days.find(d => d.date === selectedDate)
    return day?.items || []
  }, [selectedSchedule, selectedDate])

  // Categorize items
  const categorizeItems = useCallback(() => {
    const items = getItemsForDate()
    const unassigned: ProductionItem[] = []
    const byStation: Record<string, ProductionItem[]> = {}

    // Initialize stations
    getActiveStations().forEach(station => {
      byStation[station] = []
    })

    items.forEach(item => {
      if (item.assignedTo) {
        const normalizedStation = normalizeStationName(item.assignedTo)
        if (!byStation[normalizedStation]) {
          byStation[normalizedStation] = []
        }
        byStation[normalizedStation].push(item)
      } else {
        unassigned.push(item)
      }
    })

    return { unassigned, byStation }
  }, [getItemsForDate])

  // Calculate station progress
  const getStationProgress = useCallback((stationItems: ProductionItem[]) => {
    const total = stationItems.length
    const completed = stationItems.filter(item => item.completed || item.completedAt).length
    const inProgress = stationItems.filter(item => item.startedAt && !item.completed && !item.completedAt).length
    return { total, completed, inProgress }
  }, [])

  // Fetch schedules
  const fetchSchedules = useCallback(async (preserveUserSelection = false) => {
    try {
      const response = await fetch('/api/production-schedules')
      const data: ProductionSchedule[] = await response.json()

      // Sort by week start, most recent first
      const sorted = data.sort((a, b) =>
        new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      )
      setSchedules(sorted)

      // If preserving user selection, just update the schedules list
      if (preserveUserSelection) {
        // Don't change user's selected schedule/date
        return
      }

      // Initial load: Find current week's schedule or use most recent
      const today = new Date()
      const currentSchedule = sorted.find(s => {
        const start = new Date(s.weekStart)
        const end = new Date(s.weekEnd)
        return today >= start && today <= end
      }) || sorted[0]

      if (currentSchedule) {
        setSelectedSchedule(currentSchedule)
        
        // Find today's date in the schedule, or use first available day
        const todayStr = today.toISOString().split('T')[0]
        const todayInSchedule = currentSchedule.days.find(d => d.date === todayStr)
        setSelectedDate(todayInSchedule ? todayStr : currentSchedule.days[0]?.date || '')
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, []) // No dependencies - function is stable

  useEffect(() => {
    fetchSchedules(false) // Initial load - select today's date

    // Set up polling every 30 seconds - preserve user's selected date and schedule
    const interval = setInterval(() => fetchSchedules(true), 30000)
    return () => clearInterval(interval)
  }, [fetchSchedules])

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSchedules(true) // Preserve the user's selected date and schedule during manual refresh
  }

  // Handle assignment
  const handleAssign = async (itemIds: string[], station: ProductionStation) => {
    if (!selectedSchedule || !selectedDate) return

    try {
      const response = await fetch(`/api/production-schedules/${selectedSchedule.scheduleId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          itemIds,
          station,
          assignedBy: user?.id?.toString()
        })
      })

      if (response.ok) {
        // Clear selection and refresh
        setSelectedItems(new Set())
        await fetchSchedules(true) // Preserve the user's selected date and schedule
      }
    } catch (error) {
      console.error('Error assigning items:', error)
    }
  }

  // Handle reassignment
  const handleReassign = async (itemId: string, newStation: ProductionStation | null) => {
    if (!selectedSchedule || !selectedDate) return

    try {
      const response = await fetch(`/api/production-schedules/${selectedSchedule.scheduleId}/items/${itemId}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          newStation,
          reassignedBy: user?.id?.toString()
        })
      })

      if (response.ok) {
        await fetchSchedules(true) // Preserve the user's selected date and schedule
      }
    } catch (error) {
      console.error('Error reassigning item:', error)
    }
  }

  // Handle view recipe
  const handleViewRecipe = async (item: ProductionItem) => {
    setRecipeModalItem(item)
    setLoadingRecipe(true)

    try {
      // Fetch recipe by name match
      const response = await fetch('/api/recipes')
      const recipes: Recipe[] = await response.json()

      // Find matching recipe by name
      const matchedRecipe = recipes.find(r =>
        r.name.toLowerCase() === item.recipeName.toLowerCase() ||
        r.name.toLowerCase().includes(item.recipeName.toLowerCase()) ||
        item.recipeName.toLowerCase().includes(r.name.toLowerCase())
      )

      setRecipe(matchedRecipe || null)
    } catch (error) {
      console.error('Error fetching recipe:', error)
      setRecipe(null)
    } finally {
      setLoadingRecipe(false)
    }
  }

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    if (!selectedSchedule) return

    const currentIndex = selectedSchedule.days.findIndex(d => d.date === selectedDate)
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedDate(selectedSchedule.days[currentIndex - 1].date)
    } else if (direction === 'next' && currentIndex < selectedSchedule.days.length - 1) {
      setSelectedDate(selectedSchedule.days[currentIndex + 1].date)
    }
  }

  // Navigate schedules
  const navigateSchedule = (direction: 'prev' | 'next') => {
    const currentIndex = schedules.findIndex(s => s.scheduleId === selectedSchedule?.scheduleId)
    if (direction === 'prev' && currentIndex > 0) {
      const newSchedule = schedules[currentIndex - 1]
      setSelectedSchedule(newSchedule)
      setSelectedDate(newSchedule.days[0]?.date || '')
    } else if (direction === 'next' && currentIndex < schedules.length - 1) {
      const newSchedule = schedules[currentIndex + 1]
      setSelectedSchedule(newSchedule)
      setSelectedDate(newSchedule.days[0]?.date || '')
    }
  }

  // Print handler
  const handlePrint = () => {
    window.print()
  }

  // Go to today's date
  const handleGoToToday = () => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    // Find the schedule that contains today
    const todaySchedule = schedules.find(s => {
      const start = new Date(s.weekStart)
      const end = new Date(s.weekEnd)
      return today >= start && today <= end
    })

    if (todaySchedule) {
      setSelectedSchedule(todaySchedule)
      // Check if today exists in this schedule
      const todayInSchedule = todaySchedule.days.find(d => d.date === todayStr)
      setSelectedDate(todayInSchedule ? todayStr : todaySchedule.days[0]?.date || '')
    }
  }

  const { unassigned, byStation } = categorizeItems()
  const currentDay = selectedSchedule?.days.find(d => d.date === selectedDate)

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading head chef dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100">
                <ChefHat className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Head Chef Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Delegate tasks to stations and monitor progress
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToToday}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="print:hidden"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Week Selector */}
          {schedules.length > 0 && selectedSchedule && (
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateSchedule('next')}
                    disabled={schedules.findIndex(s => s.scheduleId === selectedSchedule.scheduleId) === schedules.length - 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="text-center">
                    <p className="font-semibold flex items-center justify-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Week of {new Date(selectedSchedule.weekStart).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })} - {new Date(selectedSchedule.weekEnd).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateSchedule('prev')}
                    disabled={schedules.findIndex(s => s.scheduleId === selectedSchedule.scheduleId) === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Day selector */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateDate('prev')}
                    disabled={selectedSchedule.days.findIndex(d => d.date === selectedDate) === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex gap-1 overflow-x-auto py-1">
                    {selectedSchedule.days.map(day => (
                      <Button
                        key={day.date}
                        variant={day.date === selectedDate ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSelectedDate(day.date)}
                        className="min-w-[80px]"
                      >
                        {day.dayName.slice(0, 3)}
                        <span className="ml-1 text-xs opacity-70">
                          {new Date(day.date).getDate()}
                        </span>
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateDate('next')}
                    disabled={selectedSchedule.days.findIndex(d => d.date === selectedDate) === selectedSchedule.days.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Station Progress Cards */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Station Progress
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getActiveStations().map(station => {
                const progress = getStationProgress(byStation[station] || [])
                const colors = stationColors[station]
                return (
                  <StationProgressCard
                    key={station}
                    station={station}
                    icon={stationIcons[station]}
                    total={progress.total}
                    completed={progress.completed}
                    inProgress={progress.inProgress}
                    colors={colors}
                  />
                )
              })}
            </div>
          </div>

          {/* Current Day Header */}
          {currentDay && (
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {currentDay.dayName}, {new Date(currentDay.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h2>
              <Badge variant="outline">
                {getItemsForDate().length} total items
              </Badge>
            </div>
          )}

          {/* Unassigned Items */}
          {unassigned.length > 0 && (
            <UnassignedItemsList
              items={unassigned}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              onAssign={handleAssign}
              onViewRecipe={handleViewRecipe}
              stations={getActiveStations()}
              stationColors={stationColors}
              stationIcons={stationIcons}
            />
          )}

          {/* Assigned Items by Station */}
          <AssignedItemsByStation
            byStation={byStation}
            stations={getActiveStations()}
            stationColors={stationColors}
            stationIcons={stationIcons}
            onReassign={handleReassign}
            onViewRecipe={handleViewRecipe}
          />

          {/* Empty State */}
          {!selectedSchedule && (
            <Card className="py-12">
              <CardContent className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Production Schedule</h3>
                <p className="text-muted-foreground">
                  There are no production schedules available. Ask the operations lead to create one.
                </p>
              </CardContent>
            </Card>
          )}

      {/* Recipe View Modal */}
      {recipeModalItem && (
        <RecipeViewModal
          task={{
            itemId: recipeModalItem.itemId,
            recipeName: recipeModalItem.recipeName,
            quantity: recipeModalItem.quantity,
            unit: recipeModalItem.unit,
            completed: recipeModalItem.completed || false,
            startedAt: recipeModalItem.startedAt ?? undefined,
            completedAt: recipeModalItem.completedAt ?? undefined,
            notes: recipeModalItem.notes ?? undefined,
            subRecipeProgress: {}
          }}
          recipe={recipe}
          loading={loadingRecipe}
          scheduleId={null}
          selectedDate={selectedDate}
          onSubRecipeProgress={() => {}}
          onClose={() => {
            setRecipeModalItem(null)
            setRecipe(null)
          }}
        />
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
