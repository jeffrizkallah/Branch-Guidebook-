'use client'

import { useState, useEffect, useCallback } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Clock, 
  Users, 
  ChefHat, 
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PrintHeader } from '@/components/PrintHeader'
import { RecipeTabs } from '@/components/RecipeTabs'
import { YieldScaler } from '@/components/YieldScaler'
import type { Recipe, Branch } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatNumber } from '@/lib/yield-utils'

interface RecipePageProps {
  params: {
    slug: string
    recipeId: string
  }
}

export default function RecipePage({ params }: RecipePageProps) {
  const searchParams = useSearchParams()
  const [branch, setBranch] = useState<Branch | null | undefined>(undefined)
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [yieldMultiplier, setYieldMultiplier] = useState<number>(1)
  const [targetYieldValue, setTargetYieldValue] = useState<number>(1)

  const isPrintMode = searchParams.get('print') === '1'

  // Handle yield multiplier changes
  const handleMultiplierChange = useCallback((multiplier: number, targetValue: number) => {
    setYieldMultiplier(multiplier)
    setTargetYieldValue(targetValue)
  }, [])

  // Load branch data from API
  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        const found = data.find((b: Branch) => b.slug === params.slug)
        setBranch(found || null)
      })
      .catch(() => setBranch(null))
  }, [params.slug])

  // Fetch recipe from API
  useEffect(() => {
    async function fetchRecipe() {
      try {
        const res = await fetch('/api/recipes')
        const data: Recipe[] = await res.json()
        const foundRecipe = data.find(r => r.recipeId === params.recipeId)
        setRecipe(foundRecipe ?? null)
      } catch (error) {
        console.error('Failed to fetch recipe:', error)
        setRecipe(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchRecipe()
  }, [params.recipeId])

  // Show loading state
  if (branch === undefined || recipe === undefined || isLoading) {
    return (
      <div className={isPrintMode ? "min-h-screen flex flex-col" : "flex min-h-screen"}>
        {!isPrintMode && <RoleSidebar />}
        <main className={isPrintMode ? "flex-1 flex items-center justify-center" : "flex-1 flex flex-col pt-16 md:pt-0 items-center justify-center"}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        {isPrintMode && <Footer />}
      </div>
    )
  }

  // Handle not found
  if (!branch || !recipe) {
    notFound()
  }

  return (
    <div className={isPrintMode ? "min-h-screen flex flex-col" : "flex min-h-screen"}>
      {!isPrintMode && <RoleSidebar />}
      <PrintHeader branchName={`${branch.name} - ${recipe.name}`} />

      <main className={isPrintMode ? "flex-1 container mx-auto px-4 py-8" : "flex-1 flex flex-col pt-16 md:pt-0"}>
        <div className={isPrintMode ? "" : "flex-1 container mx-auto px-4 py-8"}>
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: branch.name, href: `/branch/${branch.slug}` },
            { label: 'Recipes', href: `/branch/${branch.slug}/recipes` },
            { label: recipe.name },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <ChefHat className="h-8 w-8" />
                <h1 className="text-4xl font-bold">{recipe.name}</h1>
              </div>
              <p className="text-xl text-muted-foreground mb-4">{recipe.category}</p>
              
              {/* Key Info */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Prep:</span>
                  <span className="font-semibold">{recipe.prepTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cook:</span>
                  <span className="font-semibold">{recipe.cookTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Servings:</span>
                  <span className="font-semibold">{recipe.servings}</span>
                </div>
              </div>

              {/* Days Available */}
              <div className="mt-3 flex items-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <span className="text-sm text-muted-foreground mr-2 flex-shrink-0">Available on:</span>
                <div className="flex gap-1 flex-nowrap">
                  {recipe.daysAvailable.map((day, index) => (
                    <Badge key={index} variant="secondary" className="flex-shrink-0">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Allergens */}
              {recipe.allergens.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">
                        Allergen Warning
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {recipe.allergens.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact Recipe Info - Station and Code */}
        {(recipe.station || recipe.recipeCode) && (
          <Card className="mb-4 bg-muted/30">
            <CardContent className="py-3">
              <div className="flex flex-wrap gap-6 text-sm">
                {recipe.station && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Station:</span>
                    <span className="font-semibold">{recipe.station}</span>
                  </div>
                )}
                {recipe.recipeCode && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-semibold font-mono">{recipe.recipeCode}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Yield Scaler - Only show if recipe has a yield */}
        {recipe.yield && (
          <YieldScaler
            baseYield={recipe.yield}
            onMultiplierChange={handleMultiplierChange}
            className="mb-6"
          />
        )}

        {/* Main Content Tabs */}
        <RecipeTabs recipe={recipe} yieldMultiplier={yieldMultiplier} />

        {/* Print Button */}
        {!isPrintMode && (
          <div className="mt-8 flex flex-col items-center gap-2">
            {yieldMultiplier !== 1 && recipe.yield && (
              <p className="text-sm text-muted-foreground">
                Print will include scaled quantities ({formatNumber(targetYieldValue)} {recipe.yield.replace(/^[\d.]+\s*/, '')})
              </p>
            )}
            <Link href={`/branch/${branch.slug}/recipes/${recipe.recipeId}?print=1`} target="_blank">
              <Button variant="outline" size="lg">Print Recipe</Button>
            </Link>
          </div>
        )}
        </div>
        {!isPrintMode && <Footer />}
      </main>
      {isPrintMode && <Footer />}
    </div>
  )
}


