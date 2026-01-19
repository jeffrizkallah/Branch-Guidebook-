'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react'
import type { Recipe, Ingredient, PreparationStep } from '@/lib/data'
import { SubRecipeEditor } from '@/components/SubRecipeEditor'
import { MainIngredientsEditor } from '@/components/MainIngredientsEditor'
import { MachineToolEditor } from '@/components/MachineToolEditor'
import { QualitySpecsEditor } from '@/components/QualitySpecsEditor'
import { PackingLabelingEditor } from '@/components/PackingLabelingEditor'

const EMPTY_RECIPE: Recipe = {
  recipeId: '',
  name: '',
  category: 'Main Course',
  station: '',
  recipeCode: '',
  yield: '',
  daysAvailable: [],
  prepTime: '',
  cookTime: '',
  servings: '',
  ingredients: [],
  mainIngredients: [],
  subRecipes: [],
  preparation: [],
  requiredMachinesTools: [],
  qualitySpecifications: [],
  packingLabeling: {
    packingType: '',
    serviceItems: [],
    labelRequirements: '',
    storageCondition: '',
    shelfLife: ''
  },
  presentation: {
    description: '',
    instructions: [],
    photos: []
  },
  sops: {
    foodSafetyAndHygiene: [],
    cookingStandards: [],
    storageAndHolding: [],
    qualityStandards: []
  },
  troubleshooting: [],
  allergens: [],
  storageInstructions: ''
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function RecipeInstructionsEditorPage({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new'
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe>(EMPTY_RECIPE)
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  useEffect(() => {
    if (!isNew) {
      fetchRecipe()
    }
  }, [params.id])

  const fetchRecipe = async () => {
    try {
      const res = await fetch('/api/recipes')
      const data = await res.json()
      const found = data.find((r: Recipe) => r.recipeId === params.id)
      if (found) {
        setRecipe(found)
      } else {
        alert('Recipe instructions not found')
        router.push('/admin/recipe-instructions')
      }
    } catch (error) {
      console.error('Failed to fetch recipe', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveRecipe = async () => {
    setIsSaving(true)
    try {
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? '/api/recipes' : `/api/recipes/${params.id}`
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      router.push('/admin/recipe-instructions')
      router.refresh()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: keyof Recipe, value: any) => {
    setRecipe(prev => ({ ...prev, [field]: value }))
  }

  const toggleDay = (day: string) => {
    setRecipe(prev => {
      const days = prev.daysAvailable.includes(day)
        ? prev.daysAvailable.filter(d => d !== day)
        : [...prev.daysAvailable, day]
      return { ...prev, daysAvailable: days }
    })
  }

  // Helper for array fields (ingredients, prep steps)
  const addIngredient = () => {
    setRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { item: '', quantity: '', notes: '' }]
    }))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...recipe.ingredients]
    newIngredients[index] = { ...newIngredients[index], [field]: value }
    setRecipe(prev => ({ ...prev, ingredients: newIngredients }))
  }

  const removeIngredient = (index: number) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const addPrepStep = () => {
    setRecipe(prev => ({
      ...prev,
      preparation: [...prev.preparation, {
        step: prev.preparation.length + 1,
        instruction: '',
        time: '',
        critical: false,
        hint: ''
      }]
    }))
  }

  const updatePrepStep = (index: number, field: keyof PreparationStep, value: any) => {
    const newSteps = [...recipe.preparation]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setRecipe(prev => ({ ...prev, preparation: newSteps }))
  }

  const removePrepStep = (index: number) => {
    setRecipe(prev => ({
      ...prev,
      preparation: prev.preparation.filter((_, i) => i !== index)
    }))
  }

  // Helper to handle array of strings via textarea (split by newline)
  const handleStringArrayChange = (field: keyof typeof recipe.sops, value: string) => {
    setRecipe(prev => ({
      ...prev,
      sops: {
        ...prev.sops,
        [field]: value.split('\n').filter(line => line.trim() !== '')
      }
    }))
  }

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{isNew ? 'Create Recipe Instructions' : `Edit: ${recipe.name}`}</h1>
        </div>
        <Button onClick={saveRecipe} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Instructions
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 gap-1">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="main-ingredients">Main Ingr.</TabsTrigger>
          <TabsTrigger value="sub-recipes">Sub-Recipes</TabsTrigger>
          <TabsTrigger value="preparation">Prep</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="packing">Packing</TabsTrigger>
          <TabsTrigger value="sops">SOPs</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipe Name *</Label>
                  <Input 
                    value={recipe.name} 
                    onChange={e => updateField('name', e.target.value)} 
                    placeholder="e.g. Fish Fillet w/ Creamy Dill Sauce"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recipe ID (Slug) *</Label>
                  <Input 
                    value={recipe.recipeId} 
                    onChange={e => updateField('recipeId', e.target.value)} 
                    placeholder="e.g. fish-fillet-creamy-dill"
                    disabled={!isNew}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Station</Label>
                  <Input 
                    value={recipe.station || ''} 
                    onChange={e => updateField('station', e.target.value)}
                    placeholder="e.g. Hot Section / Butchery / Pantry"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recipe Code</Label>
                  <Input 
                    value={recipe.recipeCode || ''} 
                    onChange={e => updateField('recipeCode', e.target.value)}
                    placeholder="e.g. CK-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yield</Label>
                  <Input 
                    value={recipe.yield || ''} 
                    onChange={e => updateField('yield', e.target.value)}
                    placeholder="e.g. 1 portion"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input 
                    value={recipe.category} 
                    onChange={e => updateField('category', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Servings</Label>
                  <Input 
                    value={recipe.servings} 
                    onChange={e => updateField('servings', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Storage Instructions</Label>
                  <Input 
                    value={recipe.storageInstructions} 
                    onChange={e => updateField('storageInstructions', e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prep Time</Label>
                  <Input 
                    value={recipe.prepTime} 
                    onChange={e => updateField('prepTime', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cook Time</Label>
                  <Input 
                    value={recipe.cookTime} 
                    onChange={e => updateField('cookTime', e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Days Available</Label>
                <div className="flex flex-wrap gap-4 p-4 border rounded-md">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center gap-2">
                      <Checkbox 
                        id={`day-${day}`} 
                        checked={recipe.daysAvailable.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <label htmlFor={`day-${day}`} className="text-sm cursor-pointer">{day}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Allergens (Comma separated)</Label>
                <Input 
                  value={recipe.allergens.join(', ')} 
                  onChange={e => updateField('allergens', e.target.value.split(',').map(s => s.trim()))} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="main-ingredients" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Main Ingredients</CardTitle>
              <p className="text-sm text-muted-foreground">
                Top-level ingredients for this recipe. Link to sub-recipes for detailed breakdowns.
              </p>
            </CardHeader>
            <CardContent>
              <MainIngredientsEditor
                mainIngredients={recipe.mainIngredients || []}
                subRecipes={recipe.subRecipes || []}
                onChange={(mainIngredients) => updateField('mainIngredients', mainIngredients)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sub-recipes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sub-Recipes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Define detailed ingredient breakdowns for components used in this recipe.
              </p>
            </CardHeader>
            <CardContent>
              <SubRecipeEditor
                subRecipes={recipe.subRecipes || []}
                onChange={(subRecipes) => updateField('subRecipes', subRecipes)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingredients" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Legacy Ingredients</CardTitle>
              <Button size="sm" onClick={addIngredient}><Plus className="h-4 w-4 mr-2" />Add Ingredient</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recipe.ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="flex-1 space-y-1">
                    <Input 
                      placeholder="Item" 
                      value={ing.item} 
                      onChange={e => updateIngredient(idx, 'item', e.target.value)}
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Input 
                      placeholder="Qty" 
                      value={ing.quantity} 
                      onChange={e => updateIngredient(idx, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input 
                      placeholder="Notes" 
                      value={ing.notes || ''} 
                      onChange={e => updateIngredient(idx, 'notes', e.target.value)}
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeIngredient(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {recipe.ingredients.length === 0 && <div className="text-center text-muted-foreground py-4">No ingredients added</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="machines" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Required Machines & Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <MachineToolEditor
                machinesTools={recipe.requiredMachinesTools || []}
                onChange={(machinesTools) => updateField('requiredMachinesTools', machinesTools)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <QualitySpecsEditor
                qualitySpecs={recipe.qualitySpecifications || []}
                onChange={(qualitySpecs) => updateField('qualitySpecifications', qualitySpecs)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packing" className="mt-4">
          <PackingLabelingEditor
            packingLabeling={recipe.packingLabeling || {
              packingType: '',
              serviceItems: [],
              labelRequirements: '',
              storageCondition: '',
              shelfLife: ''
            }}
            onChange={(packingLabeling) => updateField('packingLabeling', packingLabeling)}
          />
        </TabsContent>

        <TabsContent value="preparation" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Preparation Steps</CardTitle>
              <Button size="sm" onClick={addPrepStep}><Plus className="h-4 w-4 mr-2" />Add Step</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recipe.preparation.map((step, idx) => (
                <div key={idx} className="border p-4 rounded-md space-y-3">
                  <div className="flex justify-between">
                    <span className="font-bold">Step {idx + 1}</span>
                    <Button variant="ghost" size="icon" className="text-red-500 h-6 w-6" onClick={() => removePrepStep(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea 
                    placeholder="Instruction" 
                    value={step.instruction}
                    onChange={e => updatePrepStep(idx, 'instruction', e.target.value)}
                  />
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input 
                        placeholder="Time (e.g. 10 mins)" 
                        value={step.time}
                        onChange={e => updatePrepStep(idx, 'time', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input 
                        placeholder="Hint/Tip" 
                        value={step.hint || ''}
                        onChange={e => updatePrepStep(idx, 'hint', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox 
                        checked={step.critical}
                        onCheckedChange={(checked) => updatePrepStep(idx, 'critical', !!checked)}
                      />
                      <label className="text-sm">Critical Step</label>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sops" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Standard Operating Procedures</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Food Safety & Hygiene (One per line)</Label>
                <Textarea 
                  className="min-h-[150px]"
                  value={recipe.sops.foodSafetyAndHygiene.join('\n')}
                  onChange={e => handleStringArrayChange('foodSafetyAndHygiene', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cooking Standards (One per line)</Label>
                <Textarea 
                  className="min-h-[150px]"
                  value={recipe.sops.cookingStandards.join('\n')}
                  onChange={e => handleStringArrayChange('cookingStandards', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Storage & Holding (One per line)</Label>
                <Textarea 
                  className="min-h-[150px]"
                  value={recipe.sops.storageAndHolding.join('\n')}
                  onChange={e => handleStringArrayChange('storageAndHolding', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Presentation & Media</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Presentation Description</Label>
                <Textarea 
                  value={recipe.presentation.description}
                  onChange={e => setRecipe(prev => ({ ...prev, presentation: { ...prev.presentation, description: e.target.value } }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Photo URLs (One per line)</Label>
                <Textarea 
                  value={recipe.presentation.photos.join('\n')}
                  onChange={e => setRecipe(prev => ({ 
                    ...prev, 
                    presentation: { 
                      ...prev.presentation, 
                      photos: e.target.value.split('\n').filter(l => l.trim()) 
                    } 
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
