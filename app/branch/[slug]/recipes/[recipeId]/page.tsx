'use client'

import { useState, useEffect } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Clock, 
  Users, 
  ChefHat, 
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { TopNav } from '@/components/TopNav'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PrintHeader } from '@/components/PrintHeader'
import { RecipeTabs } from '@/components/RecipeTabs'
import { loadBranch } from '@/lib/data'
import type { Recipe, Branch } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

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

  const isPrintMode = searchParams.get('print') === '1'

  // Load branch data
  useEffect(() => {
    const branchData = loadBranch(params.slug)
    setBranch(branchData ?? null)
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
      <div className="min-h-screen flex flex-col">
        {!isPrintMode && <TopNav />}
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  // Handle not found
  if (!branch || !recipe) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!isPrintMode && <TopNav />}
      <PrintHeader branchName={`${branch.name} - ${recipe.name}`} />

      <main className="flex-1 container mx-auto px-4 py-8">
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

        {/* Compact Recipe Info - Only if enhanced data exists */}
        {(recipe.station || recipe.yield || recipe.recipeCode) && (
          <Card className="mb-6 bg-primary/5">
            <CardContent className="py-3">
              <div className="flex flex-wrap gap-6 text-sm">
                {recipe.station && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Station:</span>
                    <span className="font-semibold">{recipe.station}</span>
                  </div>
                )}
                {recipe.yield && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Yield:</span>
                    <span className="font-semibold">{recipe.yield}</span>
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

        {/* Main Content Tabs */}
        <RecipeTabs recipe={recipe} />

        {/* Print Button */}
        {!isPrintMode && (
          <div className="mt-8 flex justify-center">
            <Link href={`/branch/${branch.slug}/recipes/${recipe.recipeId}?print=1`} target="_blank">
              <Button variant="outline" size="lg">Print Recipe</Button>
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}


