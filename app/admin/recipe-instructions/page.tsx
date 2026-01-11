'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Loader2, Search, X, Upload, Flame } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { RecipeInstruction } from '@/lib/data'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AdminRecipeInstructionsPage() {
  const [instructions, setInstructions] = useState<RecipeInstruction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nameFilter, setNameFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  useEffect(() => {
    fetchInstructions()
  }, [])

  const fetchInstructions = async () => {
    try {
      const res = await fetch('/api/recipe-instructions')
      const data = await res.json()
      setInstructions(data)
    } catch (error) {
      console.error('Failed to fetch instructions', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteInstruction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this instruction?')) return

    try {
      const res = await fetch(`/api/recipe-instructions/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setInstructions(instructions.filter(i => i.instructionId !== id))
      } else {
        alert('Failed to delete instruction')
      }
    } catch (error) {
      console.error('Error deleting instruction', error)
    }
  }

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(instructions.map(i => i.category))
    return Array.from(cats).sort()
  }, [instructions])

  // Filter instructions
  const filteredInstructions = useMemo(() => {
    return instructions.filter(instruction => {
      if (nameFilter && !instruction.dishName.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false
      }
      if (categoryFilter !== 'all' && instruction.category !== categoryFilter) {
        return false
      }
      if (selectedDays.length > 0) {
        const hasSelectedDay = selectedDays.some(day => instruction.daysAvailable.includes(day))
        if (!hasSelectedDay) return false
      }
      return true
    })
  }, [instructions, nameFilter, categoryFilter, selectedDays])

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
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
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Flame className="h-8 w-8 text-orange-500" />
            Recipe Instructions Manager
          </h1>
          <p className="text-muted-foreground">Manage reheating & assembly instructions for branches</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/recipe-instructions/import">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Import Instructions
            </Button>
          </Link>
          <Link href="/admin/recipe-instructions/new">
            <Button className="gap-2 bg-orange-500 hover:bg-orange-600">
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  <tr className="border-b">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-16">Image</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Dish Name</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Category</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Components</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Days</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstructions.map((instruction) => (
                    <tr key={instruction.instructionId} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        {instruction.visualPresentation?.[0] ? (
                          <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted">
                            <Image
                              src={instruction.visualPresentation[0]}
                              alt={instruction.dishName}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                            <Flame className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-middle font-medium">{instruction.dishName}</td>
                      <td className="p-4 align-middle">{instruction.category}</td>
                      <td className="p-4 align-middle">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                          {instruction.components.length} component{instruction.components.length !== 1 ? 's' : ''}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex gap-1 flex-wrap">
                          {instruction.daysAvailable.map(day => (
                            <span key={day} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                              {day.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/recipe-instructions/${instruction.instructionId}`}>
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
                  ))}
                  {filteredInstructions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
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

