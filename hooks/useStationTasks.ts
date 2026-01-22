'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProductionStation } from '@/lib/data'

interface StationTask {
  itemId: string
  recipeName: string
  quantity: number
  unit: string
  notes: string
  station: string
  assignedAt: string
  startedAt?: string
  completedAt?: string
  completed: boolean
  actualQuantity?: number
  actualUnit?: string
  subRecipeProgress: Record<string, { completed: boolean; completedAt?: string }>
  recipeId?: string
}

interface StationTasksResponse {
  station: string
  date: string
  scheduleId: string | null
  tasks: StationTask[]
}

interface UseStationTasksOptions {
  station: ProductionStation | string
  date: string
  pollingInterval?: number
  enabled?: boolean
}

export function useStationTasks({
  station,
  date,
  pollingInterval = 30000,
  enabled = true
}: UseStationTasksOptions) {
  const [tasks, setTasks] = useState<StationTask[]>([])
  const [scheduleId, setScheduleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!station || !date || !enabled) return

    try {
      const response = await fetch(
        `/api/stations/${encodeURIComponent(station)}/tasks?date=${date}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data: StationTasksResponse = await response.json()
      setTasks(data.tasks || [])
      setScheduleId(data.scheduleId)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [station, date, enabled])

  // Initial fetch
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Polling
  useEffect(() => {
    if (!enabled || pollingInterval <= 0) return

    const interval = setInterval(fetchTasks, pollingInterval)
    return () => clearInterval(interval)
  }, [fetchTasks, pollingInterval, enabled])

  // Calculate stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed || t.completedAt).length,
    inProgress: tasks.filter(t => t.startedAt && !t.completed && !t.completedAt).length,
    pending: tasks.filter(t => !t.startedAt && !t.completed && !t.completedAt).length
  }

  return {
    tasks,
    scheduleId,
    loading,
    error,
    lastUpdated,
    stats,
    refetch: fetchTasks
  }
}
