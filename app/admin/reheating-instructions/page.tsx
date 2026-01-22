'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Loader2, Search, X, Link2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { RecipeInstruction } from '@/lib/data'

interface OdooRecipe {
  item_id: string
  item: string
  category: string
  product_group: string
  ingredient_count: number
  recipe_total_cost: number
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AdminReheatingInstructionsPage() {
  const [instructions, setInstructions] = useState<RecipeInstruction[]>([])
  const [odooRecipes, setOdooRecipes] = useState<OdooRecipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nameFilter, setNameFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [instructionsRes, odooRecipesRes] = await Promise.all([
        fetch('/api/recipe-instructions'),
        fetch('/api/odoo-recipes')
      ])
      const instructionsData = await instructionsRes.json()
      const odooRecipesData = await odooRecipesRes.json()
      setInstructions(instructionsData)
      setOdooRecipes(odooRecipesData.recipes || [])
    } catch (error) {
      console.error('Failed to fetch data', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteInstruction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reheating instruction?')) return

    try {
      const res = await fetch(`/api/recipe-instructions/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setInstructions(instructions.filter(i => i.instructionId !== id))
      } else {
        alert('Failed to delete reheating instruction')
      }
    } catch (error) {
      console.error('Error deleting instruction', error)
    }
  }

  // Get unique categories from instructions
  const categories = useMemo(() => {
    const cats = new Set(instructions.map(i => i.category))
    return Array.from(cats).sort()
  }, [instructions])

  // Filter instructions based on all filters
  const filteredInstructions = useMemo(() => {
    return instructions.filter(instruction => {
      // Name filter
      if (nameFilter && !instruction.dishName.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false
      }

      // Category filter
      if (categoryFilter !== 'all' && instruction.category !== categoryFilter) {
        return false
      }

      // Days filter
      if (selectedDays.length > 0) {
        const instructionDays = instruction.daysAvailable
        const hasSelectedDay = selectedDays.some(day => instructionDays.includes(day))
        if (!hasSelectedDay) {
          return false
        }
      }

      return true
    })
  }, [instructions, nameFilter, categoryFilter, selectedDays])

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

  // Helper to find linked Odoo recipe name
  const getLinkedRecipeName = (linkedRecipeId?: string) => {
    if (!linkedRecipeId) return null
    const recipe = odooRecipes.find(r => r.item_id === linkedRecipeId)
    return recipe?.item || linkedRecipeId
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Reheating Instructions</h1>
          <p className="text-muted-foreground">Manage reheating & assembly instructions for branches</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/reheating-instructions/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Instruction
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
                <Label>Dish Name</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by dish name..."
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
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Dish Name</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Category</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Linked Recipe</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Components</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Days</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstructions.map((instruction) => {
                    const linkedRecipeName = getLinkedRecipeName(instruction.linkedRecipeId)
                    return (
                      <tr key={instruction.instructionId} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle font-medium">{instruction.dishName}</td>
                        <td className="p-4 align-middle">{instruction.category}</td>
                        <td className="p-4 align-middle">
                          {linkedRecipeName ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Link2 className="h-3 w-3" />
                              {linkedRecipeName}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not linked</span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            {instruction.components.length} component{instruction.components.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex gap-1 flex-wrap">
                            {instruction.daysAvailable.map(day => (
                              <span key={day} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
                                {day.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/reheating-instructions/${instruction.instructionId}`}>
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => deleteInstruction(instruction.instructionId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredInstructions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No reheating instructions found.
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
