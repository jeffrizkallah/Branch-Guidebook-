'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, ChefHat, X, DollarSign, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OdooRecipe {
  item_id: number
  item: string
  category: string
  product_group: string
  ingredient_count: number
  recipe_total_cost: number
}

interface FiltersData {
  categories: string[]
  productGroups: string[]
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<OdooRecipe[]>([])
  const [filters, setFilters] = useState<FiltersData>({ categories: [], productGroups: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [productGroupFilter, setProductGroupFilter] = useState('')

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/odoo-recipes')
      if (!res.ok) throw new Error('Failed to fetch recipes')
      const data = await res.json()
      setRecipes(data.recipes || [])
      setFilters(data.filters || { categories: [], productGroups: [] })
    } catch (error) {
      console.error('Error fetching recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter recipes client-side for instant feedback
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      // Search filter
      if (searchQuery && !recipe.item.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      // Category filter
      if (categoryFilter && recipe.category !== categoryFilter) {
        return false
      }
      // Product group filter
      if (productGroupFilter && recipe.product_group !== productGroupFilter) {
        return false
      }
      return true
    })
  }, [recipes, searchQuery, categoryFilter, productGroupFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setProductGroupFilter('')
  }

  const hasActiveFilters = searchQuery || categoryFilter || productGroupFilter

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                <ChefHat className="h-7 w-7" />
                Recipes
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredRecipes.length} of {recipes.length} recipes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filters</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2 h-8">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search recipes..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">All Categories</option>
                  {filters.categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Product Group */}
              <div className="space-y-2">
                <Label htmlFor="productGroup">Product Group</Label>
                <select
                  id="productGroup"
                  value={productGroupFilter}
                  onChange={(e) => setProductGroupFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">All Groups</option>
                  {filters.productGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipe List */}
      <div className="container mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRecipes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? 'No recipes match your filters' : 'No recipes found'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map(recipe => (
              <Link key={recipe.item_id} href={`/recipes/${recipe.item_id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{recipe.item}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {recipe.category && (
                        <Badge variant="secondary" className="text-xs">
                          {recipe.category}
                        </Badge>
                      )}
                      {recipe.product_group && (
                        <Badge variant="outline" className="text-xs">
                          {recipe.product_group}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {recipe.ingredient_count} ingredients
                      </span>
                      {recipe.recipe_total_cost > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {recipe.recipe_total_cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
