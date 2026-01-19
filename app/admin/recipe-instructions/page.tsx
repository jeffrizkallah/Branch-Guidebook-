'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Loader2, Search, X, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { Recipe } from '@/lib/data'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AdminRecipeInstructionsPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nameFilter, setNameFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes')
      const data = await res.json()
      setRecipes(data)
    } catch (error) {
      console.error('Failed to fetch recipes', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteRecipe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe instruction?')) return

    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setRecipes(recipes.filter(r => r.recipeId !== id))
      } else {
        alert('Failed to delete recipe instruction')
      }
    } catch (error) {
      console.error('Error deleting recipe', error)
    }
  }

  // Get unique categories from recipes
  const categories = useMemo(() => {
    const cats = new Set(recipes.map(r => r.category))
    return Array.from(cats).sort()
  }, [recipes])

  // Filter recipes based on all filters
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      // Name filter
      if (nameFilter && !recipe.name.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false
      }

      // Category filter
      if (categoryFilter !== 'all' && recipe.category !== categoryFilter) {
        return false
      }

      // Days filter
      if (selectedDays.length > 0) {
        const recipeDays = recipe.daysAvailable
        const hasSelectedDay = selectedDays.some(day => recipeDays.includes(day))
        if (!hasSelectedDay) {
          return false
        }
      }

      return true
    })
  }, [recipes, nameFilter, categoryFilter, selectedDays])

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const clearFilters = () => {
    setNameFilter('')
    setCategoryFilter('all')
    setSelectedDays([])
  }

  const hasActiveFilters = nameFilter || categoryFilter !== 'all' || selectedDays.length > 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Recipe Instructions</h1>
          <p className="text-muted-foreground">Manage preparation instructions for recipes</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/recipe-instructions/import">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Import Instructions
            </Button>
          </Link>
          <Link href="/admin/recipe-instructions/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Instructions
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Filters</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Name Filter */}
              <div className="space-y-2">
                <Label>Name</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by name..."
                    className="pl-8"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Days Filter */}
              <div className="space-y-2">
                <Label>Days Available</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[2.5rem]">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`filter-day-${day}`}
                        checked={selectedDays.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <label 
                        htmlFor={`filter-day-${day}`} 
                        className="text-xs cursor-pointer whitespace-nowrap"
                      >
                        {day.slice(0, 3)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Category</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Days</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipes.map((recipe) => (
                    <tr key={recipe.recipeId} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle font-medium">{recipe.name}</td>
                      <td className="p-4 align-middle">{recipe.category}</td>
                      <td className="p-4 align-middle">
                        <div className="flex gap-1 flex-wrap">
                          {recipe.daysAvailable.map(day => (
                            <span key={day} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
                              {day.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/recipe-instructions/${recipe.recipeId}`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => deleteRecipe(recipe.recipeId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRecipes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No recipe instructions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
