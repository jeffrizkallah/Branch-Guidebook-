'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  X,
  ChefHat,
  ListChecks,
  Utensils,
  Scale,
  Clock,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Wrench,
  Image as ImageIcon,
} from 'lucide-react'
import type { Recipe, SubRecipe } from '@/lib/data'
import { parseYield } from '@/lib/yield-utils'
import type { StationTask } from './types'

interface RecipeViewModalProps {
  task: StationTask
  recipe: Recipe | null
  loading: boolean
  scheduleId: string | null
  selectedDate: string
  onSubRecipeProgress: (task: StationTask, subRecipeId: string, completed: boolean) => void | Promise<void>
  onClose: () => void
}

export function RecipeViewModal({
  task,
  recipe,
  loading,
  scheduleId,
  selectedDate,
  onSubRecipeProgress,
  onClose
}: RecipeViewModalProps) {
  const [activeTab, setActiveTab] = useState('ingredients')

  // Calculate yield multiplier
  const yieldMultiplier = useMemo(() => {
    if (!recipe?.yield) return 1 // Default to 1x if no yield specified

    const parsedYield = parseYield(recipe.yield)
    if (!parsedYield || parsedYield.value === 0) return 1

    // Calculate multiplier: target quantity / base yield
    // For example: need 40 KG, recipe yields 1 KG -> 40x multiplier
    return task.quantity / parsedYield.value
  }, [recipe, task.quantity])

  // Scale an ingredient quantity
  const scaleQuantity = (qty: string): string => {
    const num = parseFloat(qty)
    if (isNaN(num)) return qty
    const scaled = num * yieldMultiplier
    return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(2)
  }

  // Handle sub-recipe checkbox change
  const handleSubRecipeToggle = (subRecipeId: string, completed: boolean) => {
    onSubRecipeProgress(task, subRecipeId, completed)
  }

  // Get sub-recipe completion status
  const isSubRecipeCompleted = (subRecipeId: string): boolean => {
    return task.subRecipeProgress?.[subRecipeId]?.completed || false
  }

  // Count completed sub-recipes
  const subRecipeStats = useMemo(() => {
    if (!recipe?.subRecipes) return { completed: 0, total: 0 }
    const completed = recipe.subRecipes.filter(sr => isSubRecipeCompleted(sr.subRecipeId)).length
    return { completed, total: recipe.subRecipes.length }
  }, [recipe, task.subRecipeProgress])

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading recipe...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!recipe) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Recipe Not Found
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              No matching recipe found for "{task.recipeName}".
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              The recipe may not be in the system yet or the name may not match exactly.
            </p>
          </div>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-background border-b p-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                {recipe.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="gap-1">
                  <Scale className="h-3 w-3" />
                  Target: {task.quantity} {task.unit}
                </Badge>
                {recipe.yield && (
                  <Badge variant="secondary" className="gap-1">
                    Base: {recipe.yield}
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1">
                  {yieldMultiplier.toFixed(1)}x scale
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Scaling Notice Banner */}
          {yieldMultiplier > 1 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Scale className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-900 mb-1">
                    Ingredients Automatically Scaled ×{yieldMultiplier.toFixed(1)}
                  </h4>
                  <p className="text-sm text-blue-700">
                    All ingredient quantities below are automatically calculated for your target of <strong>{task.quantity} {task.unit}</strong>.
                    {recipe.yield && (
                      <span> The base recipe yields {recipe.yield}.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sub-recipe progress bar */}
          {recipe.subRecipes && recipe.subRecipes.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <ListChecks className="h-4 w-4" />
                  Sub-recipe Progress
                </span>
                <span className="text-sm">
                  {subRecipeStats.completed}/{subRecipeStats.total} completed
                </span>
              </div>
              <div className="flex gap-1">
                {recipe.subRecipes.map(sr => (
                  <div
                    key={sr.subRecipeId}
                    className={`h-2 flex-1 rounded ${
                      isSubRecipeCompleted(sr.subRecipeId) ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-4 border-b">
            <TabsList className="w-full justify-start h-12">
              <TabsTrigger value="ingredients" className="gap-1">
                <Utensils className="h-4 w-4" />
                Ingredients
              </TabsTrigger>
              {recipe.subRecipes && recipe.subRecipes.length > 0 && (
                <TabsTrigger value="workflow" className="gap-1">
                  <ListChecks className="h-4 w-4" />
                  Workflow
                </TabsTrigger>
              )}
              {recipe.preparation && recipe.preparation.length > 0 && (
                <TabsTrigger value="preparation" className="gap-1">
                  <ChefHat className="h-4 w-4" />
                  Preparation
                </TabsTrigger>
              )}
              {recipe.requiredMachinesTools && recipe.requiredMachinesTools.length > 0 && (
                <TabsTrigger value="equipment" className="gap-1">
                  <Wrench className="h-4 w-4" />
                  Equipment
                </TabsTrigger>
              )}
              <TabsTrigger value="overview" className="gap-1">
                <BookOpen className="h-4 w-4" />
                Overview
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="m-0">
                {/* Recipe Images */}
                {recipe.presentation?.photos && recipe.presentation.photos.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Recipe Photos
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {recipe.presentation.photos.map((photo, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted group"
                        >
                          <img
                            src={photo}
                            alt={`${recipe.name} photo ${idx + 1}`}
                            className="object-cover w-full h-full cursor-pointer transition-transform hover:scale-105"
                            onClick={() => window.open(photo, '_blank')}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Available'
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {recipe.prepTime && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Prep Time</p>
                      <p className="font-semibold flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {recipe.prepTime}
                      </p>
                    </div>
                  )}
                  {recipe.cookTime && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Cook Time</p>
                      <p className="font-semibold flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {recipe.cookTime}
                      </p>
                    </div>
                  )}
                </div>

                {/* Quality Specifications */}
                {recipe.qualitySpecifications && recipe.qualitySpecifications.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3">Quality Specifications</h3>
                    <div className="space-y-2">
                      {recipe.qualitySpecifications.map((spec, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          {spec.appearance && (
                            <p><span className="font-medium">Appearance:</span> {spec.appearance}</p>
                          )}
                          {spec.texture && (
                            <p><span className="font-medium">Texture:</span> {spec.texture}</p>
                          )}
                          {spec.tasteFlavorProfile && (
                            <p><span className="font-medium">Taste:</span> {spec.tasteFlavorProfile}</p>
                          )}
                          {spec.aroma && (
                            <p><span className="font-medium">Aroma:</span> {spec.aroma}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Packing & Labeling */}
                {recipe.packingLabeling && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3">Packing & Labeling</h3>
                    <div className="p-3 bg-muted rounded-lg space-y-1">
                      {recipe.packingLabeling.packingType && (
                        <p><span className="font-medium">Packing:</span> {recipe.packingLabeling.packingType}</p>
                      )}
                      {recipe.packingLabeling.storageCondition && (
                        <p><span className="font-medium">Storage:</span> {recipe.packingLabeling.storageCondition}</p>
                      )}
                      {recipe.packingLabeling.shelfLife && (
                        <p><span className="font-medium">Shelf Life:</span> {recipe.packingLabeling.shelfLife}</p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Ingredients Tab */}
              <TabsContent value="ingredients" className="m-0">
                <div className="space-y-6">
                  {/* Scaling reminder at top of ingredients */}
                  {yieldMultiplier > 1 && (
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <p className="text-sm font-medium text-blue-900">
                        <Scale className="h-4 w-4 inline mr-1" />
                        Quantities shown below are for {task.quantity} {task.unit}
                        {recipe.yield && ` (${yieldMultiplier.toFixed(1)}× the base recipe of ${recipe.yield})`}
                      </p>
                    </div>
                  )}

                  {/* Main Ingredients */}
                  {recipe.mainIngredients && recipe.mainIngredients.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        Main Ingredients
                        {yieldMultiplier > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            Scaled ×{yieldMultiplier.toFixed(1)}
                          </Badge>
                        )}
                      </h3>
                      <div className="space-y-2">
                        {recipe.mainIngredients.map((ing, idx) => {
                          const scaled = scaleQuantity(ing.quantity.toString())
                          const isScaled = yieldMultiplier > 1
                          return (
                            <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                              isScaled ? 'bg-blue-50 border-blue-200' : 'bg-muted'
                            }`}>
                              <span className="font-medium">{ing.name}</span>
                              <div className="text-right">
                                <div className={`font-bold ${isScaled ? 'text-blue-700 text-lg' : ''}`}>
                                  {scaled} {ing.unit}
                                </div>
                                {isScaled && (
                                  <div className="text-xs text-muted-foreground">
                                    base: {ing.quantity} {ing.unit}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Legacy Ingredients */}
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        Ingredients
                        {yieldMultiplier > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            Scaled ×{yieldMultiplier.toFixed(1)}
                          </Badge>
                        )}
                      </h3>
                      <div className="space-y-2">
                        {recipe.ingredients.map((ing, idx) => {
                          const scaled = scaleQuantity(ing.quantity)
                          const baseQty = parseFloat(ing.quantity)
                          const isScaled = yieldMultiplier > 1 && !isNaN(baseQty)
                          return (
                            <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                              isScaled ? 'bg-blue-50 border-blue-200' : 'bg-muted'
                            }`}>
                              <span className="font-medium">{ing.item}</span>
                              <div className="text-right">
                                <div className={`font-bold ${isScaled ? 'text-blue-700 text-lg' : ''}`}>
                                  {scaled} {ing.unit || ''}
                                </div>
                                {isScaled && (
                                  <div className="text-xs text-muted-foreground">
                                    base: {ing.quantity} {ing.unit || ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Workflow Tab (Sub-recipes with checkboxes) */}
              <TabsContent value="workflow" className="m-0">
                <div className="space-y-4">
                  {recipe.subRecipes?.map((subRecipe, idx) => {
                    const isCompleted = isSubRecipeCompleted(subRecipe.subRecipeId)
                    return (
                      <div
                        key={subRecipe.subRecipeId}
                        className={`p-4 rounded-lg border ${
                          isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={subRecipe.subRecipeId}
                            checked={isCompleted}
                            onCheckedChange={(checked) =>
                              handleSubRecipeToggle(subRecipe.subRecipeId, checked === true)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={subRecipe.subRecipeId}
                              className={`font-semibold cursor-pointer flex items-center gap-2 ${
                                isCompleted ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {idx + 1}. {subRecipe.name}
                              {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            </label>
                            {subRecipe.yield && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Yield: {subRecipe.yield}
                              </p>
                            )}

                            {/* Sub-recipe ingredients */}
                            {subRecipe.ingredients && subRecipe.ingredients.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium mb-2">
                                  Ingredients
                                  {yieldMultiplier > 1 && (
                                    <span className="ml-2 text-xs text-blue-600">(scaled ×{yieldMultiplier.toFixed(1)})</span>
                                  )}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {subRecipe.ingredients.map((ing, ingIdx) => {
                                    const scaled = scaleQuantity(ing.quantity)
                                    const isScaled = yieldMultiplier > 1
                                    return (
                                      <div key={ingIdx} className={`text-sm p-2 rounded ${
                                        isScaled ? 'bg-blue-50 border border-blue-200' : 'bg-muted/50'
                                      }`}>
                                        <div className="font-medium">{ing.item}</div>
                                        <div className={isScaled ? 'text-blue-700 font-bold' : ''}>
                                          {scaled} {ing.unit || ''}
                                        </div>
                                        {isScaled && (
                                          <div className="text-xs text-muted-foreground">
                                            base: {ing.quantity} {ing.unit || ''}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Sub-recipe preparation */}
                            {subRecipe.preparation && subRecipe.preparation.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium mb-2">Steps:</p>
                                <ol className="list-decimal list-inside space-y-1 text-sm">
                                  {subRecipe.preparation.map((step, stepIdx) => (
                                    <li key={stepIdx} className={step.critical ? 'text-red-600 font-medium' : ''}>
                                      {step.instruction}
                                      {step.time && <span className="text-muted-foreground"> ({step.time})</span>}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {subRecipe.notes && (
                              <p className="text-sm text-muted-foreground mt-2 italic">{subRecipe.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              {/* Preparation Tab */}
              <TabsContent value="preparation" className="m-0">
                <div className="space-y-4">
                  {recipe.preparation?.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        step.critical ? 'border-red-200 bg-red-50' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.critical ? 'bg-red-100 text-red-700' : 'bg-primary/10 text-primary'
                        } font-bold`}>
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <p className={step.critical ? 'font-medium' : ''}>
                            {step.instruction}
                          </p>
                          {step.time && (
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {step.time}
                            </p>
                          )}
                          {step.hint && (
                            <p className="text-sm text-amber-600 mt-1 italic">
                              Tip: {step.hint}
                            </p>
                          )}
                        </div>
                        {step.critical && (
                          <Badge variant="destructive" className="shrink-0">
                            Critical
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Equipment Tab */}
              <TabsContent value="equipment" className="m-0">
                <div className="space-y-3">
                  {recipe.requiredMachinesTools?.map((tool, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg">
                      <p className="font-medium flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        {tool.name}
                      </p>
                      {tool.purpose && (
                        <p className="text-sm text-muted-foreground mt-1">Purpose: {tool.purpose}</p>
                      )}
                      {tool.setting && (
                        <p className="text-sm text-muted-foreground">Setting: {tool.setting}</p>
                      )}
                      {tool.specifications && (
                        <p className="text-sm text-muted-foreground">Specs: {tool.specifications}</p>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
