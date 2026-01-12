'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Factory, Calendar, Eye, Loader2 } from 'lucide-react'

interface ProductionSchedule {
  scheduleId: string
  weekStart: string
  weekEnd: string
  createdBy: string
  createdAt: string
  days: {
    date: string
    dayName: string
    items: {
      itemId: string
      recipeName: string
      quantity: number
      unit: string
      station: string
      notes: string
      completed: boolean
    }[]
  }[]
}

interface ProductionScheduleSectionProps {
  branchSlug: string
}

export function ProductionScheduleSection({ branchSlug }: ProductionScheduleSectionProps) {
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/production-schedules')
      const data: ProductionSchedule[] = await response.json()
      
      // Sort by week start, most recent first
      const sorted = data.sort((a, b) => 
        new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      )
      setSchedules(sorted)
    } catch (error) {
      console.error('Error fetching production schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalItems = (schedule: ProductionSchedule) => {
    return schedule.days.reduce((acc, day) => acc + day.items.length, 0)
  }

  const getCompletedItems = (schedule: ProductionSchedule) => {
    return schedule.days.reduce((acc, day) => 
      acc + day.items.filter(item => item.completed).length, 0
    )
  }

  return (
    <Card className="mb-4 md:mb-6 border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
      <CardHeader className="px-4 py-3 md:px-6 md:py-4">
        <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
          <Factory className="h-5 w-5 text-orange-500" />
          Production Schedule
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          View and manage the weekly production schedule
        </p>
      </CardHeader>
      <CardContent className="px-4 py-3 md:px-6 md:py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-orange-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No production schedules found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((schedule) => {
              const totalItems = getTotalItems(schedule)
              const completedItems = getCompletedItems(schedule)
              const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

              return (
                <Card 
                  key={schedule.scheduleId} 
                  className="bg-white dark:bg-gray-900 hover:shadow-lg transition-all group overflow-hidden border-orange-100 dark:border-orange-900"
                >
                  <div className="h-1.5 bg-orange-100 dark:bg-orange-900">
                    <div 
                      className="h-full bg-orange-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                          <Calendar className="h-4 w-4 text-orange-500" />
                          Week of {new Date(schedule.weekStart).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {new Date(schedule.weekStart).toLocaleDateString()} - {new Date(schedule.weekEnd).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge 
                        className={`${
                          progress === 100 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                        } border-0 text-xs`}
                      >
                        {progress}%
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs sm:text-sm text-muted-foreground mb-4">
                      <p>{schedule.days.length} production days</p>
                      <p>{totalItems} total items</p>
                      <p>{completedItems} completed</p>
                      <p className="text-xs">Created by {schedule.createdBy}</p>
                    </div>

                    <Link href={`/branch/${branchSlug}/production-schedule?scheduleId=${schedule.scheduleId}`}>
                      <Button 
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2"
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                        View Schedule
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
