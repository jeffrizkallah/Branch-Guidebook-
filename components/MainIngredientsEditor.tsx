'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react'
import type { MainIngredient, SubRecipe } from '@/lib/data'

interface MainIngredientsEditorProps {
  mainIngredients: MainIngredient[]
  subRecipes: SubRecipe[]
  onChange: (mainIngredients: MainIngredient[]) => void
}

export function MainIngredientsEditor({
  mainIngredients,
  subRecipes,
  onChange
}: MainIngredientsEditorProps) {
  const addMainIngredient = () => {
    onChange([
      ...mainIngredients,
      {
        name: '',
        quantity: 0,
        unit: 'GM',
        specifications: '',
        subRecipeId: undefined
      }
    ])
  }

  const updateMainIngredient = (
    index: number,
    field: keyof MainIngredient,
    value: any
  ) => {
    const updated = [...mainIngredients]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeMainIngredient = (index: number) => {
    onChange(mainIngredients.filter((_, i) => i !== index))
  }

  const linkToSubRecipe = (index: number, subRecipeId: string) => {
    const subRecipe = subRecipes.find((sr) => sr.subRecipeId === subRecipeId)
    if (subRecipe) {
      updateMainIngredient(index, 'name', subRecipe.name)
      updateMainIngredient(index, 'subRecipeId', subRecipeId)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Main ingredients for this recipe (can reference sub-recipes)
        </p>
        <Button onClick={addMainIngredient} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Main Ingredient
        </Button>
      </div>

      {mainIngredients.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No main ingredients added yet
          </CardContent>
        </Card>
      )}

      {mainIngredients.map((ingredient, index) => (
        <Card
          key={index}
          className={`border-l-4 ${
            ingredient.subRecipeId ? 'border-l-primary' : 'border-l-gray-300'
          }`}
        >
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label>Ingredient Name *</Label>
                      <Input
                        placeholder="e.g. Grilled Fish Hamour Marination 1 KG"
                        value={ingredient.name}
                        onChange={(e) =>
                          updateMainIngredient(index, 'name', e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link to Sub-Recipe</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={ingredient.subRecipeId || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            linkToSubRecipe(index, e.target.value)
                          } else {
                            updateMainIngredient(index, 'subRecipeId', undefined)
                          }
                        }}
                      >
                        <option value="">None</option>
                        {subRecipes.map((sr) => (
                          <option key={sr.subRecipeId} value={sr.subRecipeId}>
                            {sr.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        placeholder="200"
                        value={ingredient.quantity}
                        onChange={(e) =>
                          updateMainIngredient(
                            index,
                            'quantity',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit *</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={ingredient.unit}
                        onChange={(e) =>
                          updateMainIngredient(index, 'unit', e.target.value)
                        }
                      >
                        <option value="GM">GM</option>
                        <option value="ML">ML</option>
                        <option value="KG">KG</option>
                        <option value="L">L</option>
                        <option value="unit">unit</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Specifications</Label>
                      <Input
                        placeholder="e.g. Pre-marinated"
                        value={ingredient.specifications || ''}
                        onChange={(e) =>
                          updateMainIngredient(index, 'specifications', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {ingredient.subRecipeId && (
                    <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-2 rounded">
                      <LinkIcon className="h-4 w-4" />
                      <span>
                        Linked to sub-recipe:{' '}
                        {subRecipes.find((sr) => sr.subRecipeId === ingredient.subRecipeId)
                          ?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeMainIngredient(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

