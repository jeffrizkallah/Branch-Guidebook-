'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ChefHat,
  Calendar,
  CheckCircle2,
  Clock,
  PlayCircle,
  RefreshCw,
  Flame,
  Snowflake,
  CakeSlice,
  Beef,
  Eye,
  ListChecks,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { StationTaskCard } from '@/components/kitchen/StationTaskCard'
import { TaskCompletionModal } from '@/components/kitchen/TaskCompletionModal'
import { RecipeViewModal } from '@/components/kitchen/RecipeViewModal'
import type { StationTask } from '@/components/kitchen/types'
import type { ProductionStation, Recipe } from '@/lib/data'

// Station icons mapping
const stationIcons: Record<string, React.ReactNode> = {
  'Hot Section': <Flame className="h-5 w-5" />,
  'Cold Section': <Snowflake className="h-5 w-5" />,
  'Baker': <CakeSlice className="h-5 w-5" />,
  'Butcher': <Beef className="h-5 w-5" />,
}

// Station colors mapping
const stationColors: Record<string, { bg: string; text: string; gradient: string }> = {
  'Hot Section': { bg: 'bg-red-100', text: 'text-red-700', gradient: 'from-red-50 to-orange-50' },
  'Cold Section': { bg: 'bg-blue-100', text: 'text-blue-700', gradient: 'from-blue-50 to-cyan-50' },
  'Baker': { bg: 'bg-amber-100', text: 'text-amber-700', gradient: 'from-amber-50 to-yellow-50' },
  'Butcher': { bg: 'bg-rose-100', text: 'text-rose-700', gradient: 'from-rose-50 to-pink-50' },
}

interface StationTasksResponse {
  station: string
  date: string
  scheduleId: string | null
  tasks: StationTask[]
}

export default function StationTabletPage() {
  const { user, loading: authLoading } = useAuth({
    required: true,
    allowedRoles: ['admin', 'station_staff']
  })

  const [tasks, setTasks] = useState<StationTask[]>([])
  const [scheduleId, setScheduleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])

  // Modal states
  const [completionModalTask, setCompletionModalTask] = useState<StationTask | null>(null)
  const [recipeModalTask, setRecipeModalTask] = useState<StationTask | null>(null)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  // Get the station from user's assignment
  const station = user?.stationAssignment || 'Hot Section'
  const colors = stationColors[station] || stationColors['Hot Section']

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!station) return

    try {
      const response = await fetch(`/api/stations/${encodeURIComponent(station)}/tasks?date=${selectedDate}`)
      const data: StationTasksResponse = await response.json()

      setTasks(data.tasks || [])
      setScheduleId(data.scheduleId)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [station, selectedDate])

  useEffect(() => {
    if (!authLoading) {
      fetchTasks()

      // Set up polling every 30 seconds
      const interval = setInterval(fetchTasks, 30000)
      return () => clearInterval(interval)
    }
  }, [fetchTasks, authLoading])

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchTasks()
  }

  // Handle date navigation
  const handlePreviousDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() - 1)
    setSelectedDate(currentDate.toISOString().split('T')[0])
    setLoading(true)
  }

  const handleNextDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + 1)
    setSelectedDate(currentDate.toISOString().split('T')[0])
    setLoading(true)
  }

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
    setLoading(true)
  }

  // Handle start task
  const handleStartTask = async (task: StationTask) => {
    if (!scheduleId) return

    try {
      const response = await fetch(
        `/api/production-schedules/${scheduleId}/items/${task.itemId}/start`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            startedAt: new Date().toISOString()
          })
        }
      )

      if (response.ok) {
        await fetchTasks()
      }
    } catch (error) {
      console.error('Error starting task:', error)
    }
  }

  // Handle complete task
  const handleCompleteTask = async (task: StationTask, actualQuantity: number, actualUnit: string) => {
    if (!scheduleId) return

    try {
      const response = await fetch(
        `/api/production-schedules/${scheduleId}/items/${task.itemId}/complete`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            completed: true,
            actualQuantity,
            actualUnit,
            completedAt: new Date().toISOString()
          })
        }
      )

      if (response.ok) {
        setCompletionModalTask(null)
        await fetchTasks()
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  // Handle sub-recipe progress
  const handleSubRecipeProgress = async (task: StationTask, subRecipeId: string, completed: boolean) => {
    if (!scheduleId) return

    try {
      const response = await fetch(
        `/api/production-schedules/${scheduleId}/items/${task.itemId}/sub-recipe-progress`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            subRecipeId,
            completed,
            completedAt: completed ? new Date().toISOString() : null
          })
        }
      )

      if (response.ok) {
        await fetchTasks()
      }
    } catch (error) {
      console.error('Error updating sub-recipe progress:', error)
    }
  }

  // Handle view recipe
  const handleViewRecipe = async (task: StationTask) => {
    setRecipeModalTask(task)
    setLoadingRecipe(true)

    try {
      // Fetch recipe by name match
      const response = await fetch('/api/recipes')
      const recipes: Recipe[] = await response.json()

      // Find matching recipe by name
      const matchedRecipe = recipes.find(r =>
        r.name.toLowerCase() === task.recipeName.toLowerCase() ||
        r.name.toLowerCase().includes(task.recipeName.toLowerCase()) ||
        task.recipeName.toLowerCase().includes(r.name.toLowerCase())
      )

      setRecipe(matchedRecipe || null)
    } catch (error) {
      console.error('Error fetching recipe:', error)
      setRecipe(null)
    } finally {
      setLoadingRecipe(false)
    }
  }

  // Calculate progress
  const completedCount = tasks.filter(t => t.completed || t.completedAt).length
  const inProgressCount = tasks.filter(t => t.startedAt && !t.completed && !t.completedAt).length
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${colors.gradient}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading station tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors.gradient}`}>
      {/* Header - Fixed */}
      <header className={`sticky top-0 z-10 ${colors.bg} border-b shadow-sm`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${colors.bg} ${colors.text}`}>
                {stationIcons[station]}
              </div>
              <div>
                <h1 className={`text-xl font-bold ${colors.text}`}>{station}</h1>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handlePreviousDay}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleNextDay}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="gap-1"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Today</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">
                {completedCount} of {tasks.length} tasks completed
              </span>
              <span className={`${colors.text} font-bold`}>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            {inProgressCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {inProgressCount} task{inProgressCount > 1 ? 's' : ''} in progress
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {tasks.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tasks Assigned</h3>
              <p className="text-muted-foreground">
                No production tasks have been assigned to {station} for today.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Tasks will appear here once the head chef assigns them.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <StationTaskCard
                key={task.itemId}
                task={task}
                onStart={() => handleStartTask(task)}
                onComplete={() => setCompletionModalTask(task)}
                onViewRecipe={() => handleViewRecipe(task)}
                stationColors={colors}
              />
            ))}
          </div>
        )}
      </main>

      {/* Completion Modal */}
      {completionModalTask && (
        <TaskCompletionModal
          task={completionModalTask}
          onComplete={handleCompleteTask}
          onClose={() => setCompletionModalTask(null)}
        />
      )}

      {/* Recipe View Modal */}
      {recipeModalTask && (
        <RecipeViewModal
          task={recipeModalTask}
          recipe={recipe}
          loading={loadingRecipe}
          scheduleId={scheduleId}
          selectedDate={selectedDate}
          onSubRecipeProgress={handleSubRecipeProgress}
          onClose={() => {
            setRecipeModalTask(null)
            setRecipe(null)
          }}
        />
      )}
    </div>
  )
}
