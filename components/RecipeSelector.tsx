'use client'

import { useState } from 'react'
import { Calendar, ChefHat } from 'lucide-react'
import { RecipeCard } from './RecipeCard'
import { Button } from './ui/button'
import { getRecipesForDay, getUniqueDays } from '@/lib/data'
import type { Recipe } from '@/lib/data'

interface RecipeSelectorProps {
  branchSlug: string
}

export function RecipeSelector({ branchSlug }: RecipeSelectorProps) {
  const days = getUniqueDays()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const [selectedDay, setSelectedDay] = useState<string>(
    days.includes(today) ? today : days[0]
  )

  const recipesForDay = getRecipesForDay(selectedDay)

  return (
    <div className="space-y-3 md:space-y-4 min-w-0">
      {/* Day Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Select Day:</span>
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
          {days.map(day => (
            <Button
              key={day}
              variant={selectedDay === day ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDay(day)}
              className="text-xs sm:text-sm px-2.5 sm:px-3 whitespace-nowrap shrink-0"
            >
              {day}
            </Button>
          ))}
        </div>
      </div>

      {/* Recipes for Selected Day */}
      {recipesForDay.length > 0 ? (
        <>
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 min-w-0">
            <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="break-words">{selectedDay}&apos;s Menu ({recipesForDay.length} recipe{recipesForDay.length !== 1 ? 's' : ''})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {recipesForDay.map(recipe => (
              <RecipeCard key={recipe.recipeId} recipe={recipe} branchSlug={branchSlug} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-6 md:py-8 text-muted-foreground">
          <ChefHat className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm sm:text-base">No recipes available for {selectedDay}</p>
        </div>
      )}
    </div>
  )
}

