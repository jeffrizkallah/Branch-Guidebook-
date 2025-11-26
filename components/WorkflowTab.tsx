'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Circle,
  Package,
  ChefHat,
  Wrench,
  CheckSquare,
  Clock,
  Lightbulb,
  AlertTriangle,
  Tag,
  Thermometer,
  ListChecks
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { Recipe, SubRecipe, MachineToolRequirement, PreparationStep } from '@/lib/data'
import { QualitySpecsDisplay } from './QualitySpecsDisplay'

interface WorkflowTabProps {
  recipe: Recipe
}

interface SubRecipeProgress {
  [subRecipeId: string]: boolean
}

export function WorkflowTab({ recipe }: WorkflowTabProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [completedSubRecipes, setCompletedSubRecipes] = useState<SubRecipeProgress>({})

  // Calculate progress
  const totalSubRecipes = (recipe.subRecipes?.length || 0) + 1 // +1 for assembly
  const completedCount = Object.values(completedSubRecipes).filter(Boolean).length

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleComplete = (subRecipeId: string) => {
    setCompletedSubRecipes(prev => ({
      ...prev,
      [subRecipeId]: !prev[subRecipeId]
    }))
  }

  // Match equipment to sub-recipe by name matching
  const getEquipmentForSubRecipe = (subRecipeName: string): MachineToolRequirement[] => {
    if (!recipe.requiredMachinesTools) return []
    
    return recipe.requiredMachinesTools.filter(tool => {
      const toolLower = tool.name.toLowerCase()
      const purposeLower = tool.purpose.toLowerCase()
      const subRecipeLower = subRecipeName.toLowerCase()
      
      // Match keywords from sub-recipe name
      const keywords = subRecipeLower.split(' ')
      return keywords.some(keyword => 
        toolLower.includes(keyword) || 
        purposeLower.includes(keyword) ||
        (keyword.length > 4 && (toolLower.includes(keyword) || purposeLower.includes(keyword)))
      )
    })
  }

  // Quality specs are now only shown in the final assembly step, not in sub-recipes

  // Get preparation steps for a sub-recipe
  const getPrepStepsForSubRecipe = (subRecipe: SubRecipe): PreparationStep[] => {
    // If the sub-recipe has its own preparation steps, use those
    if (subRecipe.preparation && subRecipe.preparation.length > 0) {
      return subRecipe.preparation
    }
    
    // Otherwise, try to match from main recipe preparation steps
    if (!recipe.preparation) return []
    
    return recipe.preparation.filter(step => {
      const stepLower = step.instruction.toLowerCase()
      const subRecipeLower = subRecipe.name.toLowerCase()
      const keywords = subRecipeLower.split(' ')
      
      return keywords.some(keyword => 
        keyword.length > 4 && stepLower.includes(keyword)
      )
    })
  }

  // Get main recipe preparation steps
  const getMainRecipeSteps = (): PreparationStep[] => {
    // Return all main recipe preparation steps
    // (Sub-recipe steps are now properly stored in their respective sub-recipes)
    return recipe.preparation || []
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">Workflow Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {totalSubRecipes} steps completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-primary">
                {totalSubRecipes > 0 ? Math.round((completedCount / totalSubRecipes) * 100) : 0}%
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${totalSubRecipes > 0 ? (completedCount / totalSubRecipes) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sub-Recipe Cards */}
      {recipe.subRecipes && recipe.subRecipes.map((subRecipe, index) => {
        const isExpanded = expandedCards.has(subRecipe.subRecipeId)
        const isCompleted = completedSubRecipes[subRecipe.subRecipeId]
        const equipment = getEquipmentForSubRecipe(subRecipe.name)
        const prepSteps = getPrepStepsForSubRecipe(subRecipe)

        return (
          <Card 
            key={subRecipe.subRecipeId}
            className={`border-l-4 ${
              isCompleted 
                ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' 
                : 'border-l-primary'
            }`}
          >
            <CardHeader className="cursor-pointer" onClick={() => toggleCard(subRecipe.subRecipeId)}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div 
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleComplete(subRecipe.subRecipeId)
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {subRecipe.name}
                      {isCompleted && (
                        <Badge variant="default" className="bg-green-600">
                          Completed
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Yield: {subRecipe.yield} • {subRecipe.ingredients.length} ingredients
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => toggleComplete(subRecipe.subRecipeId)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button variant="ghost" size="sm">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="border-t pt-6 space-y-6">
                {/* Ingredients */}
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-primary" />
                    Ingredients
                  </h4>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Item</th>
                          <th className="text-right p-2 font-medium">Quantity</th>
                          <th className="text-left p-2 font-medium">Unit</th>
                          <th className="text-left p-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subRecipe.ingredients.map((ing, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{ing.item}</td>
                            <td className="p-2 text-right font-mono">{ing.quantity}</td>
                            <td className="p-2">{ing.unit || '—'}</td>
                            <td className="p-2 text-muted-foreground text-xs">{ing.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preparation Steps */}
                {prepSteps.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                      <ChefHat className="h-4 w-4 text-blue-600" />
                      Preparation Steps
                    </h4>
                    <div className="space-y-3">
                      {prepSteps.map((step, idx) => (
                        <div 
                          key={idx}
                          className={`flex gap-3 p-3 rounded-lg ${
                            step.critical 
                              ? 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800' 
                              : 'bg-secondary border border-orange-200/60'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                            step.critical 
                              ? 'bg-orange-600 text-white' 
                              : 'bg-primary/20 text-primary border border-primary/30'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{step.instruction}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{step.time}</span>
                              </div>
                              {step.critical && (
                                <Badge variant="destructive" className="text-xs h-5">
                                  Critical
                                </Badge>
                              )}
                            </div>
                            {step.hint && (
                              <div className="mt-2 flex items-start gap-1 text-xs">
                                <Lightbulb className="h-3 w-3 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground italic">{step.hint}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equipment */}
                {equipment.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                      <Wrench className="h-4 w-4 text-blue-600" />
                      Required Equipment
                    </h4>
                    <div className="space-y-2">
                      {equipment.map((tool, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <h5 className="font-semibold text-sm">{tool.name}</h5>
                              {tool.setting && <Badge variant="outline" className="text-xs">{tool.setting}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Purpose:</span> {tool.purpose}
                            </p>
                            {tool.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {tool.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Packing & Labeling */}
                {subRecipe.packingLabeling && subRecipe.packingLabeling.packingType && (
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-primary" />
                      Packing & Labeling
                    </h4>
                    <div className="space-y-2">
                      {/* Packing Type */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Package className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Packing Type</span>
                        </div>
                        <p className="text-sm font-medium">{subRecipe.packingLabeling.packingType}</p>
                      </div>

                      {/* Label Requirements */}
                      {subRecipe.packingLabeling.labelRequirements && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Tag className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Label Requirements</span>
                          </div>
                          <p className="text-sm">{subRecipe.packingLabeling.labelRequirements}</p>
                        </div>
                      )}

                      {/* Storage & Shelf Life */}
                      {(subRecipe.packingLabeling.storageCondition || subRecipe.packingLabeling.shelfLife) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {subRecipe.packingLabeling.storageCondition && (
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Thermometer className="h-3.5 w-3.5 text-cyan-600" />
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Storage</span>
                              </div>
                              <p className="text-sm">{subRecipe.packingLabeling.storageCondition}</p>
                            </div>
                          )}
                          {subRecipe.packingLabeling.shelfLife && (
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Clock className="h-3.5 w-3.5 text-violet-600" />
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shelf Life</span>
                              </div>
                              <p className="text-sm">{subRecipe.packingLabeling.shelfLife}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Service Items */}
                      {subRecipe.packingLabeling.serviceItems && subRecipe.packingLabeling.serviceItems.length > 0 && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-0.5">
                            <ListChecks className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service Items</span>
                          </div>
                          <ul className="text-sm space-y-0.5">
                            {subRecipe.packingLabeling.serviceItems.map((item, idx) => (
                              <li key={idx} className="flex items-baseline gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {subRecipe.notes && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-sm">
                      <span className="font-semibold">Note: </span>
                      {subRecipe.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Final Assembly Card */}
      <Card className={`border-l-4 ${
        completedSubRecipes['assembly'] 
          ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' 
          : 'border-l-amber-500'
      }`}>
        <CardHeader className="cursor-pointer" onClick={() => toggleCard('assembly')}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div 
                className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleComplete('assembly')
                }}
              >
                {completedSubRecipes['assembly'] ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span>{(recipe.subRecipes?.length || 0) + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  Main Recipe: {recipe.name}
                  {completedSubRecipes['assembly'] && (
                    <Badge variant="default" className="bg-green-600">
                      Completed
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Final preparation steps
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={completedSubRecipes['assembly']}
                onCheckedChange={() => toggleComplete('assembly')}
                onClick={(e) => e.stopPropagation()}
              />
              <Button variant="ghost" size="sm">
                {expandedCards.has('assembly') ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {expandedCards.has('assembly') && (
          <CardContent className="border-t pt-6 space-y-6">
            {/* Main Recipe Ingredients */}
            {recipe.mainIngredients && recipe.mainIngredients.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-primary" />
                  Main Ingredients
                </h4>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Item</th>
                        <th className="text-right p-2 font-medium">Quantity</th>
                        <th className="text-left p-2 font-medium">Unit</th>
                        <th className="text-left p-2 font-medium">Specifications</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipe.mainIngredients.map((ing, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{ing.name}</td>
                          <td className="p-2 text-right font-mono">{ing.quantity}</td>
                          <td className="p-2">{ing.unit || '—'}</td>
                          <td className="p-2 text-muted-foreground text-xs">{ing.specifications || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Main Recipe Steps */}
            {getMainRecipeSteps().length > 0 && (
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <ChefHat className="h-4 w-4 text-blue-600" />
                  Preparation Steps
                </h4>
                <div className="space-y-3">
                  {getMainRecipeSteps().map((step, idx) => (
                    <div 
                      key={idx}
                      className={`flex gap-3 p-3 rounded-lg ${
                        step.critical 
                          ? 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800' 
                          : 'bg-secondary border border-orange-200/60'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        step.critical 
                          ? 'bg-orange-600 text-white' 
                          : 'bg-primary/20 text-primary border border-primary/30'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{step.instruction}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{step.time}</span>
                          </div>
                          {step.critical && (
                            <Badge variant="destructive" className="text-xs h-5">
                              Critical
                            </Badge>
                          )}
                        </div>
                        {step.hint && (
                          <div className="mt-2 flex items-start gap-1 text-xs">
                            <Lightbulb className="h-3 w-3 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground italic">{step.hint}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Specifications - Always shown in final step */}
            {recipe.qualitySpecifications && recipe.qualitySpecifications.length > 0 && (
              <QualitySpecsDisplay 
                qualitySpecifications={recipe.qualitySpecifications} 
                showHeader={true}
                compact={true}
              />
            )}

            {/* Packing & Labeling */}
            {recipe.packingLabeling && recipe.packingLabeling.packingType && (
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-primary" />
                  Packing & Labeling
                </h4>
                <div className="space-y-2">
                  {/* Packing Type */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Package className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Packing Type</span>
                    </div>
                    <p className="text-sm font-medium">{recipe.packingLabeling.packingType}</p>
                  </div>

                  {/* Label Requirements */}
                  {recipe.packingLabeling.labelRequirements && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Tag className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Label Requirements</span>
                      </div>
                      <p className="text-sm">{recipe.packingLabeling.labelRequirements}</p>
                    </div>
                  )}

                  {/* Storage & Shelf Life */}
                  {(recipe.packingLabeling.storageCondition || recipe.packingLabeling.shelfLife) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {recipe.packingLabeling.storageCondition && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Thermometer className="h-3.5 w-3.5 text-cyan-600" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Storage</span>
                          </div>
                          <p className="text-sm">{recipe.packingLabeling.storageCondition}</p>
                        </div>
                      )}
                      {recipe.packingLabeling.shelfLife && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Clock className="h-3.5 w-3.5 text-violet-600" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shelf Life</span>
                          </div>
                          <p className="text-sm">{recipe.packingLabeling.shelfLife}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Service Items */}
                  {recipe.packingLabeling.serviceItems && recipe.packingLabeling.serviceItems.length > 0 && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-0.5">
                        <ListChecks className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service Items</span>
                      </div>
                      <ul className="text-sm space-y-0.5">
                        {recipe.packingLabeling.serviceItems.map((item, idx) => (
                          <li key={idx} className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Completion Message */}
      {completedCount === totalSubRecipes && totalSubRecipes > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-500">
          <CardContent className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
              Recipe Completed! 🎉
            </h3>
            <p className="text-green-700 dark:text-green-300">
              All steps have been completed. Great work!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

