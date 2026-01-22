'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProductionSchedule, ProductionItem, ProductionStation } from '@/lib/data'
import { getActiveStations, normalizeStationName } from '@/lib/data'

interface UseHeadChefScheduleOptions {
  pollingInterval?: number
  enabled?: boolean
}

interface StationStats {
  station: ProductionStation
  total: number
  completed: number
  inProgress: number
  pending: number
}

export function useHeadChefSchedule({
  pollingInterval = 30000,
  enabled = true
}: UseHeadChefScheduleOptions = {}) {
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<ProductionSchedule | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    if (!enabled) return

    try {
      const response = await fetch('/api/production-schedules')

      if (!response.ok) {
        throw new Error('Failed to fetch schedules')
      }

      const data: ProductionSchedule[] = await response.json()

      // Sort by week start, most recent first
      const sorted = data.sort((a, b) =>
        new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      )

      setSchedules(sorted)

      // Auto-select current week's schedule if not already selected
      if (!selectedSchedule && sorted.length > 0) {
        const today = new Date()
        const currentSchedule = sorted.find(s => {
          const start = new Date(s.weekStart)
          const end = new Date(s.weekEnd)
          return today >= start && today <= end
        }) || sorted[0]

        setSelectedSchedule(currentSchedule)

        // Find today's date in the schedule
        const todayStr = today.toISOString().split('T')[0]
        const todayInSchedule = currentSchedule.days.find(d => d.date === todayStr)
        setSelectedDate(todayInSchedule ? todayStr : currentSchedule.days[0]?.date || '')
      } else if (selectedSchedule) {
        // Update the selected schedule with fresh data
        const updated = sorted.find(s => s.scheduleId === selectedSchedule.scheduleId)
        if (updated) {
          setSelectedSchedule(updated)
        }
      }

      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [enabled, selectedSchedule])

  // Initial fetch
  useEffect(() => {
    fetchSchedules()
  }, []) // Only run on mount

  // Polling
  useEffect(() => {
    if (!enabled || pollingInterval <= 0) return

    const interval = setInterval(fetchSchedules, pollingInterval)
    return () => clearInterval(interval)
  }, [fetchSchedules, pollingInterval, enabled])

  // Get items for selected date
  const getItemsForDate = useCallback(() => {
    if (!selectedSchedule || !selectedDate) return []
    const day = selectedSchedule.days.find(d => d.date === selectedDate)
    return day?.items || []
  }, [selectedSchedule, selectedDate])

  // Categorize items by assignment
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

  // Calculate station stats
  const getStationStats = useCallback((): StationStats[] => {
    const { byStation } = categorizeItems()

    return getActiveStations().map(station => {
      const items = byStation[station] || []
      return {
        station,
        total: items.length,
        completed: items.filter(i => i.completed || i.completedAt).length,
        inProgress: items.filter(i => i.startedAt && !i.completed && !i.completedAt).length,
        pending: items.filter(i => !i.startedAt && !i.completed && !i.completedAt).length
      }
    })
  }, [categorizeItems])

  // Navigate to a different schedule
  const selectSchedule = useCallback((schedule: ProductionSchedule) => {
    setSelectedSchedule(schedule)
    setSelectedDate(schedule.days[0]?.date || '')
  }, [])

  // Navigate to a different date
  const selectDate = useCallback((date: string) => {
    setSelectedDate(date)
  }, [])

  // Get current day info
  const currentDay = selectedSchedule?.days.find(d => d.date === selectedDate)

  return {
    schedules,
    selectedSchedule,
    selectedDate,
    currentDay,
    loading,
    error,
    lastUpdated,
    getItemsForDate,
    categorizeItems,
    getStationStats,
    selectSchedule,
    selectDate,
    refetch: fetchSchedules
  }
}
