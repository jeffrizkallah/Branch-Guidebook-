import Link from 'next/link'
import { Clock, Users, ChefHat } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Recipe } from '@/lib/data'

interface RecipeCardProps {
  recipe: Recipe
  branchSlug: string
}

export function RecipeCard({ recipe, branchSlug }: RecipeCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm sm:text-base md:text-lg mb-1.5 sm:mb-2 break-words leading-tight">{recipe.name}</CardTitle>
            <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 whitespace-nowrap">
              {recipe.category}
            </Badge>
          </div>
          <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-[10px] sm:text-xs shrink-0">Prep:</span>
              <span className="font-medium text-[10px] sm:text-xs truncate">{recipe.prepTime}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-[10px] sm:text-xs shrink-0">Cook:</span>
              <span className="font-medium text-[10px] sm:text-xs truncate">{recipe.cookTime}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 col-span-2 min-w-0">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-[10px] sm:text-xs shrink-0">Servings:</span>
              <span className="font-medium text-[10px] sm:text-xs truncate">{recipe.servings}</span>
            </div>
          </div>

          {/* Allergens if any */}
          {recipe.allergens.length > 0 && (
            <div className="pt-1.5 sm:pt-2 border-t min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Allergens:</p>
              <div className="flex flex-wrap gap-1">
                {recipe.allergens.map((allergen, index) => (
                  <Badge key={index} variant="outline" className="text-[9px] sm:text-xs px-1.5 py-0.5 whitespace-nowrap">
                    {allergen}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View Recipe Button */}
        <Link href={`/branch/${branchSlug}/recipes/${recipe.recipeId}`} className="block mt-2 sm:mt-3">
          <Button className="w-full text-[11px] sm:text-xs md:text-sm" variant="default" size="sm">
            View Recipe & Instructions
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

