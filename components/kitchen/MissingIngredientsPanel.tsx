'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  CheckCircle2,
  Bell,
  Package,
  Search,
  X
} from 'lucide-react'
import type { Recipe, Ingredient, MainIngredient } from '@/lib/data'

interface IngredientWithStatus {
  name: string
  quantityNeeded: number
  unit: string
  isMissing: boolean
  quantityAvailable: number
}

interface MissingIngredientsPanelProps {
  recipe: Recipe
  targetQuantity: number
  yieldMultiplier: number
  onReportMissing: (missingIngredients: {
    name: string
    quantityNeeded: number
    unit: string
    quantityAvailable: number
    status: 'MISSING' | 'PARTIAL'
  }[], notes: string) => void | Promise<void>
}

export function MissingIngredientsPanel({
  recipe,
  targetQuantity,
  yieldMultiplier,
  onReportMissing
}: MissingIngredientsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set())
  const [availableQuantities, setAvailableQuantities] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Combine all ingredients from the recipe
  const allIngredients = useMemo(() => {
    const ingredients: IngredientWithStatus[] = []

    // Add main ingredients
    if (recipe.mainIngredients) {
      recipe.mainIngredients.forEach((ing: MainIngredient) => {
        const scaledQty = parseFloat(ing.quantity.toString()) * yieldMultiplier
        ingredients.push({
          name: ing.name,
          quantityNeeded: scaledQty,
          unit: ing.unit,
          isMissing: false,
          quantityAvailable: scaledQty
        })
      })
    }

    // Add legacy ingredients
    if (recipe.ingredients) {
      recipe.ingredients.forEach((ing: Ingredient) => {
        const qty = parseFloat(ing.quantity)
        if (!isNaN(qty)) {
          const scaledQty = qty * yieldMultiplier
          ingredients.push({
            name: ing.item,
            quantityNeeded: scaledQty,
            unit: ing.unit || '',
            isMissing: false,
            quantityAvailable: scaledQty
          })
        }
      })
    }

    return ingredients
  }, [recipe, yieldMultiplier])

  // Filter ingredients by search term
  const filteredIngredients = useMemo(() => {
    if (!searchTerm.trim()) return allIngredients
    const term = searchTerm.toLowerCase()
    return allIngredients.filter(ing => ing.name.toLowerCase().includes(term))
  }, [allIngredients, searchTerm])

  const handleToggleIngredient = (ingredientName: string, checked: boolean) => {
    const newSelected = new Set(selectedIngredients)
    if (checked) {
      newSelected.add(ingredientName)
      // Initialize available quantity to 0 for missing items
      if (!availableQuantities[ingredientName]) {
        setAvailableQuantities(prev => ({ ...prev, [ingredientName]: '0' }))
      }
    } else {
      newSelected.delete(ingredientName)
    }
    setSelectedIngredients(newSelected)
  }

  const handleAvailableQuantityChange = (ingredientName: string, value: string) => {
    setAvailableQuantities(prev => ({ ...prev, [ingredientName]: value }))
  }

  const handleSelectAll = () => {
    if (selectedIngredients.size === filteredIngredients.length) {
      // Deselect all
      setSelectedIngredients(new Set())
      setAvailableQuantities({})
    } else {
      // Select all filtered ingredients
      const newSelected = new Set(filteredIngredients.map(ing => ing.name))
      setSelectedIngredients(newSelected)
      // Initialize available quantities
      const newQuantities: Record<string, string> = {}
      filteredIngredients.forEach(ing => {
        newQuantities[ing.name] = availableQuantities[ing.name] || '0'
      })
      setAvailableQuantities(newQuantities)
    }
  }

  const handleSubmit = async () => {
    if (selectedIngredients.size === 0) {
      alert('Please select at least one missing ingredient')
      return
    }

    const missingIngredients = Array.from(selectedIngredients).map(name => {
      const ingredient = allIngredients.find(ing => ing.name === name)!
      const available = parseFloat(availableQuantities[name] || '0')
      
      return {
        name,
        quantityNeeded: ingredient.quantityNeeded,
        unit: ingredient.unit,
        quantityAvailable: available,
        status: (available === 0 ? 'MISSING' : 'PARTIAL') as 'MISSING' | 'PARTIAL'
      }
    })

    setLoading(true)
    try {
      await onReportMissing(missingIngredients, notes)
      // Reset form
      setSelectedIngredients(new Set())
      setAvailableQuantities({})
      setNotes('')
      setSearchTerm('')
    } finally {
      setLoading(false)
    }
  }

  const missingCount = selectedIngredients.size
  const allSelected = filteredIngredients.length > 0 && selectedIngredients.size === filteredIngredients.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Report Missing Ingredients
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Select ingredients that are missing or insufficient
          </p>
        </div>
        {missingCount > 0 && (
          <Badge variant="destructive" className="text-sm">
            {missingCount} selected
          </Badge>
        )}
      </div>

      {/* Search and Select All */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleSelectAll}
          className="whitespace-nowrap"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      {/* Ingredients List */}
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-4 space-y-2">
          {filteredIngredients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No ingredients found</p>
            </div>
          ) : (
            filteredIngredients.map((ingredient) => {
              const isSelected = selectedIngredients.has(ingredient.name)
              const availableQty = availableQuantities[ingredient.name] || ''
              const available = parseFloat(availableQty)
              const isMissing = available === 0
              const isPartial = available > 0 && available < ingredient.quantityNeeded

              return (
                <div
                  key={ingredient.name}
                  className={`p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={ingredient.name}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleToggleIngredient(ingredient.name, checked === true)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={ingredient.name}
                        className="font-medium cursor-pointer"
                      >
                        {ingredient.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Needed: <span className="font-medium">{ingredient.quantityNeeded.toFixed(2)} {ingredient.unit}</span>
                      </p>

                      {/* Available Quantity Input (only show when selected) */}
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-2">
                          <Label htmlFor={`available-${ingredient.name}`} className="text-xs whitespace-nowrap">
                            Available:
                          </Label>
                          <Input
                            id={`available-${ingredient.name}`}
                            type="number"
                            min="0"
                            step="0.1"
                            max={ingredient.quantityNeeded}
                            placeholder="0"
                            value={availableQty}
                            onChange={(e) =>
                              handleAvailableQuantityChange(ingredient.name, e.target.value)
                            }
                            className="h-8 text-sm"
                          />
                          <span className="text-xs text-muted-foreground">{ingredient.unit}</span>
                        </div>
                      )}

                      {/* Status Badge */}
                      {isSelected && (
                        <div className="mt-2">
                          {isMissing ? (
                            <Badge variant="destructive" className="text-xs">
                              <X className="h-3 w-3 mr-1" />
                              Completely Missing
                            </Badge>
                          ) : isPartial ? (
                            <Badge className="bg-amber-500 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Partially Available ({((available / ingredient.quantityNeeded) * 100).toFixed(0)}%)
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Sufficient
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Notes */}
      {missingCount > 0 && (
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any additional information about the missing ingredients..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Impact Warning */}
      {missingCount > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Production Impact</p>
              <p className="text-xs text-red-700 mt-1">
                This item cannot be produced without these ingredients. Central Kitchen will be notified immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setSelectedIngredients(new Set())
            setAvailableQuantities({})
            setNotes('')
          }}
          disabled={loading || missingCount === 0}
        >
          Clear Selection
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || missingCount === 0}
          className="gap-2"
        >
          <Bell className="h-4 w-4" />
          {loading ? 'Reporting...' : `Report to Central Kitchen`}
        </Button>
      </div>
    </div>
  )
}
