'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, PlayCircle, Eye, Check } from 'lucide-react'
import type { StationTask } from './types'

interface StationTaskCardProps {
  task: StationTask
  onStart: () => void
  onComplete: () => void
  onViewRecipe: () => void
  stationColors: { bg: string; text: string; gradient: string }
}

export function StationTaskCard({
  task,
  onStart,
  onComplete,
  onViewRecipe,
  stationColors
}: StationTaskCardProps) {
  const isCompleted = task.completed || task.completedAt
  const isInProgress = task.startedAt && !isCompleted
  const isPending = !task.startedAt && !isCompleted

  const getStatus = () => {
    if (isCompleted) {
      return {
        label: 'Completed',
        icon: <CheckCircle2 className="h-4 w-4" />,
        className: 'bg-green-100 text-green-700'
      }
    }
    if (isInProgress) {
      return {
        label: 'In Progress',
        icon: <PlayCircle className="h-4 w-4" />,
        className: 'bg-blue-100 text-blue-700'
      }
    }
    return {
      label: 'Pending',
      icon: <Clock className="h-4 w-4" />,
      className: 'bg-gray-100 text-gray-700'
    }
  }

  const status = getStatus()

  // Calculate sub-recipe progress
  const subRecipeEntries = Object.entries(task.subRecipeProgress || {})
  const subRecipeCompleted = subRecipeEntries.filter(([, p]) => p.completed).length
  const hasSubRecipes = subRecipeEntries.length > 0

  return (
    <Card className={`overflow-hidden ${isCompleted ? 'opacity-75' : ''}`}>
      {/* Status bar at top */}
      <div className={`h-1.5 ${isCompleted ? 'bg-green-500' : isInProgress ? 'bg-blue-500' : 'bg-gray-300'}`} />

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className={`font-semibold text-lg ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {task.recipeName}
            </h3>
            <p className="text-muted-foreground">
              Target: <span className="font-medium">{task.quantity} {task.unit}</span>
              {task.actualQuantity && (
                <span className="text-green-600 ml-2">
                  (Actual: {task.actualQuantity} {task.actualUnit || task.unit})
                </span>
              )}
            </p>
            {task.notes && (
              <p className="text-sm text-muted-foreground mt-1 italic">{task.notes}</p>
            )}
          </div>

          <Badge className={`${status.className} gap-1 ml-2 shrink-0`}>
            {status.icon}
            {status.label}
          </Badge>
        </div>

        {/* Sub-recipe progress */}
        {hasSubRecipes && (
          <div className="mb-4 p-2 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium flex items-center gap-1">
              Sub-recipes: {subRecipeCompleted}/{subRecipeEntries.length} completed
            </p>
            <div className="flex gap-1 mt-1">
              {subRecipeEntries.map(([id, progress]) => (
                <div
                  key={id}
                  className={`h-2 flex-1 rounded ${progress.completed ? 'bg-green-500' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed timestamp */}
        {isCompleted && task.completedAt && (
          <p className="text-sm text-green-600 mb-3">
            Completed at {new Date(task.completedAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-12 text-base"
            onClick={onViewRecipe}
          >
            <Eye className="h-5 w-5 mr-2" />
            View Recipe
          </Button>

          {isPending && (
            <Button
              size="lg"
              className={`flex-1 h-12 text-base ${stationColors.bg} ${stationColors.text} hover:opacity-90`}
              onClick={onStart}
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              Start Task
            </Button>
          )}

          {isInProgress && (
            <Button
              size="lg"
              className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700 text-white"
              onClick={onComplete}
            >
              <Check className="h-5 w-5 mr-2" />
              Mark Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
