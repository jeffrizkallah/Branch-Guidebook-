'use client'

import { useState } from 'react'
import {
  Clock,
  ChefHat,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Package,
  Wrench,
  Link as LinkIcon,
  Tag,
  Thermometer,
  ListChecks
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Recipe, SubRecipe } from '@/lib/data'
import { SubRecipeAccordion } from './SubRecipeAccordion'
import { WorkflowTab } from './WorkflowTab'
import { QualitySpecsDisplay } from './QualitySpecsDisplay'

interface RecipeTabsProps {
  recipe: Recipe
}

export function RecipeTabs({ recipe }: RecipeTabsProps) {
  // Check if recipe has sub-recipes to determine default tab
  const hasSubRecipes = recipe.subRecipes && recipe.subRecipes.length > 0
  const [activeTab, setActiveTab] = useState(hasSubRecipes ? 'workflow' : 'ingredients')

  const getSubRecipe = (subRecipeId: string): SubRecipe | undefined => {
    return recipe.subRecipes?.find(sr => sr.subRecipeId === subRecipeId)
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="w-full inline-flex md:grid md:grid-cols-8 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] justify-start">
        {hasSubRecipes && (
          <TabsTrigger value="workflow" className="flex-shrink-0 whitespace-nowrap ml-1 md:ml-0">
            Workflow
          </TabsTrigger>
        )}
        <TabsTrigger value="ingredients" className="flex-shrink-0 whitespace-nowrap ml-1 md:ml-0">Ingredients</TabsTrigger>
        <TabsTrigger value="preparation" className="flex-shrink-0 whitespace-nowrap">Preparation</TabsTrigger>
        <TabsTrigger value="equipment" className="flex-shrink-0 whitespace-nowrap">Equipment</TabsTrigger>
        <TabsTrigger value="quality" className="flex-shrink-0 whitespace-nowrap">Quality</TabsTrigger>
        <TabsTrigger value="packing" className="flex-shrink-0 whitespace-nowrap">Packing</TabsTrigger>
        <TabsTrigger value="sops" className="flex-shrink-0 whitespace-nowrap">SOPs</TabsTrigger>
        <TabsTrigger value="troubleshooting" className="flex-shrink-0 whitespace-nowrap">Troubleshooting</TabsTrigger>
      </TabsList>

      {/* Workflow Tab */}
      {hasSubRecipes && (
        <TabsContent value="workflow">
          <WorkflowTab recipe={recipe} />
        </TabsContent>
      )}

      {/* Ingredients Tab */}
      <TabsContent value="ingredients">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ingredients
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {recipe.mainIngredients && recipe.mainIngredients.length > 0 
                ? 'Main ingredients with detailed sub-recipe breakdowns'
                : 'Complete ingredient list for this recipe'
              }
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Show mainIngredients if available (new enhanced recipes) */}
              {recipe.mainIngredients && recipe.mainIngredients.length > 0 ? (
                recipe.mainIngredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      ing.subRecipeId ? 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{ing.name}</h4>
                      {ing.subRecipeId && (
                        <Badge variant="secondary" className="text-xs">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Sub-recipe
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ing.quantity} {ing.unit}
                      {ing.specifications && ` • ${ing.specifications}`}
                    </p>
                    
                    {/* Show sub-recipe details if linked */}
                    {ing.subRecipeId && getSubRecipe(ing.subRecipeId) && (
                      <div className="mt-3">
                        <SubRecipeAccordion subRecipe={getSubRecipe(ing.subRecipeId)!} />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                /* Legacy ingredients for backward compatibility */
                recipe.ingredients.length > 0 ? (
                  recipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                      <div className="flex-1">
                        <p className="font-semibold">{ingredient.item}</p>
                        <p className="text-lg text-primary font-bold">{ingredient.quantity}</p>
                        {ingredient.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{ingredient.notes}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No ingredients specified for this recipe.
                  </p>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Equipment Tab */}
      <TabsContent value="equipment">
        {recipe.requiredMachinesTools && recipe.requiredMachinesTools.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Required Machines & Tools
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Equipment needed for this recipe with their settings
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recipe.requiredMachinesTools.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h4 className="font-semibold">{item.name}</h4>
                        {item.setting && <Badge variant="outline">{item.setting}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Purpose:</span> {item.purpose}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Note: {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No specific equipment requirements specified for this recipe.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Quality Tab */}
      <TabsContent value="quality">
        {recipe.qualitySpecifications && recipe.qualitySpecifications.length > 0 ? (
          <QualitySpecsDisplay qualitySpecifications={recipe.qualitySpecifications} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No quality specifications defined for this recipe.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Packing Tab */}
      <TabsContent value="packing">
        {recipe.packingLabeling && recipe.packingLabeling.packingType ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Packing & Labeling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Packing Type */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Packing Type</span>
                </div>
                <p className="text-sm font-medium">{recipe.packingLabeling.packingType}</p>
              </div>

              {/* Label Requirements */}
              {recipe.packingLabeling.labelRequirements && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Label Requirements</span>
                  </div>
                  <p className="text-sm">{recipe.packingLabeling.labelRequirements}</p>
                </div>
              )}

              {/* Storage & Shelf Life - Side by Side */}
              {(recipe.packingLabeling.storageCondition || recipe.packingLabeling.shelfLife) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recipe.packingLabeling.storageCondition && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-1">
                        <Thermometer className="h-4 w-4 text-cyan-600" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Storage</span>
                      </div>
                      <p className="text-sm">{recipe.packingLabeling.storageCondition}</p>
                    </div>
                  )}
                  {recipe.packingLabeling.shelfLife && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-violet-600" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shelf Life</span>
                      </div>
                      <p className="text-sm">{recipe.packingLabeling.shelfLife}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Service Items */}
              {recipe.packingLabeling.serviceItems && recipe.packingLabeling.serviceItems.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <ListChecks className="h-4 w-4 text-emerald-600" />
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
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No packing and labeling information specified for this recipe.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Preparation Tab */}
      <TabsContent value="preparation">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Preparation Steps
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Follow these steps in order. Critical steps are marked with a warning icon.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recipe.preparation.map((step, index) => (
                <div 
                  key={index} 
                  className={`flex gap-4 p-4 rounded-lg ${
                    step.critical 
                      ? 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800' 
                      : 'bg-secondary border border-orange-200/60'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step.critical 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-primary/20 text-primary border border-primary/30'
                  }`}>
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-lg">{step.instruction}</p>
                      {step.critical && (
                        <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{step.time}</span>
                      </div>
                      {step.critical && (
                        <Badge variant="destructive" className="text-xs">
                          Critical Step
                        </Badge>
                      )}
                    </div>
                    {step.hint && (
                      <div className="mt-2 flex items-start gap-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground italic">{step.hint}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* SOPs Tab */}
      <TabsContent value="sops">
        <div className="space-y-4">
          {/* Food Safety and Hygiene */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Food Safety & Hygiene
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recipe.sops.foodSafetyAndHygiene.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Cooking Standards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-blue-600" />
                Cooking Standards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recipe.sops.cookingStandards.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Storage and Holding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-purple-600" />
                Storage & Holding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recipe.sops.storageAndHolding.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              
              {recipe.storageInstructions && (
                <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-md">
                  <p className="font-semibold text-sm mb-1">Storage Instructions:</p>
                  <p className="text-sm">{recipe.storageInstructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quality Standards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Quality Standards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recipe.sops.qualityStandards.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Troubleshooting Tab */}
      <TabsContent value="troubleshooting">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Troubleshooting Guide
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Common problems and their solutions
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recipe.troubleshooting.map((item, index) => (
                <div key={index} className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
                    Problem: {item.problem}
                  </h3>
                  <div className="space-y-2">
                    <p className="font-medium text-sm text-muted-foreground mb-2">Solutions:</p>
                    {item.solutions.map((solution, sIndex) => (
                      <div key={sIndex} className="flex items-start gap-2 ml-7">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center justify-center text-xs font-bold">
                          {sIndex + 1}
                        </div>
                        <p className="text-sm pt-0.5">{solution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

