'use client'

import { useState, useEffect, useMemo } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TopNav } from '@/components/TopNav'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { RecipeCard } from '@/components/RecipeCard'
import { loadBranch } from '@/lib/data'
import type { Recipe, Branch } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChefHat, Loader2 } from 'lucide-react'

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface RecipesPageProps {
  params: {
    slug: string
  }
}

export default function RecipesPage({ params }: RecipesPageProps) {
  const searchParams = useSearchParams()
  const dayParam = searchParams.get('day')
  
  const [branch, setBranch] = useState<Branch | null | undefined>(undefined)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load branch data
  useEffect(() => {
    const branchData = loadBranch(params.slug)
    setBranch(branchData)
  }, [params.slug])

  // Fetch recipes from API
  useEffect(() => {
    async function fetchRecipes() {
      try {
        const res = await fetch('/api/recipes')
        const data = await res.json()
        setRecipes(data)
      } catch (error) {
        console.error('Failed to fetch recipes:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchRecipes()
  }, [])

  // Get unique days from recipes, sorted
  const days = useMemo(() => {
    const daysSet = new Set<string>()
    recipes.forEach(recipe => {
      recipe.daysAvailable?.forEach(day => daysSet.add(day))
    })
    return Array.from(daysSet).sort((a, b) => 
      DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
    )
  }, [recipes])

  // Filter recipes based on selected day
  const filteredRecipes = useMemo(() => {
    if (!dayParam) return recipes
    return recipes.filter(recipe => recipe.daysAvailable?.includes(dayParam))
  }, [recipes, dayParam])

  // Handle branch not found after loading
  if (branch === null) {
    notFound()
  }

  // Show loading while branch is being loaded
  if (branch === undefined || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: branch.name, href: `/branch/${branch.slug}` },
            { label: 'Recipes' },
          ]}
        />

        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ChefHat className="h-8 w-8" />
            <h1 className="text-4xl font-bold">
              {dayParam ? `${dayParam}'s Recipes` : 'All Recipes'}
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            {branch.name} - Daily Recipe Guide
          </p>
        </div>

        {/* Day Filter Tabs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/branch/${branch.slug}/recipes`}>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !dayParam
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  All Days
                </button>
              </Link>
              {days.map(day => (
                <Link key={day} href={`/branch/${branch.slug}/recipes?day=${day}`}>
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      dayParam === day
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {day}
                  </button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recipe Grid */}
        {filteredRecipes.length > 0 ? (
          <>
            <h2 className="text-2xl font-semibold mb-4">
              {filteredRecipes.length} Recipe{filteredRecipes.length !== 1 ? 's' : ''} Available
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map(recipe => (
                <RecipeCard key={recipe.recipeId} recipe={recipe} branchSlug={branch.slug} />
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Recipes Found</h3>
              <p className="text-muted-foreground">
                There are no recipes available for {dayParam || 'this selection'}.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  )
}

