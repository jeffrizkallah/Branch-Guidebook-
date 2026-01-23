'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Save, ArrowLeft, Loader2, Link2, Search, X, Download } from 'lucide-react'
import type { Recipe, Ingredient, PreparationStep, MainIngredient, SubRecipe } from '@/lib/data'
import { SubRecipeEditor } from '@/components/SubRecipeEditor'
import { MainIngredientsEditor } from '@/components/MainIngredientsEditor'
import { MachineToolEditor } from '@/components/MachineToolEditor'
import { QualitySpecsEditor } from '@/components/QualitySpecsEditor'
import { PackingLabelingEditor } from '@/components/PackingLabelingEditor'
import { ImageUpload } from '@/components/ImageUpload'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog'
import { useToast, ToastContainer } from '@/components/ui/toast'

const EMPTY_RECIPE: Recipe = {
  recipeId: '',
  name: '',
  category: 'Main Course',
  station: '',
  recipeCode: '',
  yield: '',
  linkedRecipeId: undefined,
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
  // Odoo recipes for linking (recipes with ingredients but no instructions)
  interface OdooRecipe {
    item_id: string
    item: string
    category: string
    product_group: string
    ingredient_count: number
    recipe_total_cost: number
  }
  const [odooRecipes, setOdooRecipes] = useState<OdooRecipe[]>([])
  const [linkedRecipeId, setLinkedRecipeId] = useState<string>('')
  const [linkedRecipeName, setLinkedRecipeName] = useState<string>('')
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true)
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('')
  const [showRecipeDropdown, setShowRecipeDropdown] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Import confirmation dialog
  const [showImportConfirmDialog, setShowImportConfirmDialog] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<{
    recipe: OdooRecipe
    mainIngredients: MainIngredient[]
    subRecipes: SubRecipe[]
  } | null>(null)
  
  // Toast notifications
  const { toasts, success, error: showError, removeToast } = useToast()

  useEffect(() => {
    fetchOdooRecipes()
    if (!isNew) {
      fetchRecipe()
    } else {
      // Check for query parameters when creating new instructions
      const searchParams = new URLSearchParams(window.location.search)
      const odooRecipeId = searchParams.get('odooRecipeId')
      const odooRecipeName = searchParams.get('odooRecipeName')
      
      if (odooRecipeId && odooRecipeName) {
        setLinkedRecipeId(odooRecipeId)
        setLinkedRecipeName(odooRecipeName)
        setRecipeSearchQuery(odooRecipeName)
      }
    }
  }, [params.id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRecipeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchOdooRecipes = async () => {
    try {
      setIsLoadingRecipes(true)
      const res = await fetch('/api/odoo-recipes')
      const data = await res.json()
      console.log('Fetched Odoo recipes for dropdown:', data.recipes?.length || 0, 'recipes')
      setOdooRecipes(data.recipes || [])
    } catch (error) {
      console.error('Failed to fetch Odoo recipes', error)
    } finally {
      setIsLoadingRecipes(false)
    }
  }

  const fetchRecipe = async () => {
    try {
      const res = await fetch('/api/recipes')
      const data = await res.json()
      const found = data.find((r: Recipe) => r.recipeId === params.id)
      if (found) {
        setRecipe(found)
        setLinkedRecipeId(found.linkedRecipeId || '')
        // Set search query to linked recipe name if exists
        if (found.linkedRecipeId) {
          // Try to find the linked Odoo recipe name
          const odooRes = await fetch('/api/odoo-recipes')
          const odooData = await odooRes.json()
          const linkedOdooRecipe = odooData.recipes?.find((r: any) => r.item_id === found.linkedRecipeId)
          if (linkedOdooRecipe) {
            setRecipeSearchQuery(linkedOdooRecipe.item)
            setLinkedRecipeName(linkedOdooRecipe.item)
          } else {
            // Fallback: use the ID as the name
            setRecipeSearchQuery(found.linkedRecipeId)
            setLinkedRecipeName(found.linkedRecipeId)
          }
        }
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

  // Filter Odoo recipes based on search query
  const filteredOdooRecipes = useMemo(() => {
    if (!recipeSearchQuery.trim()) return odooRecipes
    const query = recipeSearchQuery.toLowerCase()
    return odooRecipes.filter(r => 
      r.item.toLowerCase().includes(query) ||
      String(r.item_id).toLowerCase().includes(query) ||
      r.category?.toLowerCase().includes(query) ||
      r.product_group?.toLowerCase().includes(query)
    )
  }, [odooRecipes, recipeSearchQuery])

  const fetchAndTransformOdooRecipe = async (selectedRecipe: OdooRecipe) => {
    try {
      // Fetch detailed recipe data from Odoo
      const res = await fetch(`/api/odoo-recipes/${selectedRecipe.item_id}`)
      if (!res.ok) {
        throw new Error('Failed to fetch recipe details')
      }
      
      const data = await res.json()
      
      // Transform Odoo ingredients to MainIngredients and SubRecipes format
      const mainIngredients: MainIngredient[] = []
      const subRecipes: SubRecipe[] = []
      
      data.ingredients.forEach((ing: any) => {
        if (ing.item_type === 'ingredient') {
          // Add as main ingredient
          mainIngredients.push({
            name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
            specifications: ing.notes || undefined,
          })
        } else if (ing.item_type === 'subrecipe') {
          // Create a sub-recipe ID from the name
          const subRecipeId = ing.ingredient_name.toLowerCase().replace(/\s+/g, '-')
          
          // Add reference in main ingredients
          mainIngredients.push({
            name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
            specifications: ing.notes || undefined,
            subRecipeId: subRecipeId,
          })
          
          // Add the sub-recipe with its ingredients
          const subRecipeIngredients: Ingredient[] = (ing.subrecipe_ingredients || []).map((subIng: any) => ({
            item: subIng.ingredient_name,
            quantity: `${subIng.quantity} ${subIng.unit}`,
            notes: subIng.notes || undefined,
            unit: subIng.unit,
          }))
          
          subRecipes.push({
            subRecipeId: subRecipeId,
            name: ing.ingredient_name,
            yield: `${ing.quantity} ${ing.unit}`,
            ingredients: subRecipeIngredients,
            notes: ing.notes || undefined,
          })
        }
      })
      
      return { mainIngredients, subRecipes }
    } catch (err) {
      console.error('Error fetching recipe details:', err)
      showError('Failed to fetch recipe details from Odoo')
      return null
    }
  }

  const handleSelectOdooRecipe = async (selectedRecipe: OdooRecipe) => {
    setLinkedRecipeId(selectedRecipe.item_id)
    setLinkedRecipeName(selectedRecipe.item)
    setRecipeSearchQuery(selectedRecipe.item)
    setShowRecipeDropdown(false)
    
    // Generate slug from recipe name (only if creating new recipe)
    const slug = selectedRecipe.item
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    
    // Set the recipe name and ID to match the Odoo recipe
    setRecipe(prev => ({
      ...prev,
      name: selectedRecipe.item,
      recipeId: isNew ? slug : prev.recipeId, // Only update ID if it's a new recipe
    }))
    
    // Fetch and prepare import data
    const importData = await fetchAndTransformOdooRecipe(selectedRecipe)
    if (!importData) return
    
    // Check if there's existing data that would be replaced
    const hasExistingData = 
      (recipe.mainIngredients && recipe.mainIngredients.length > 0) ||
      (recipe.subRecipes && recipe.subRecipes.length > 0)
    
    if (hasExistingData) {
      // Show confirmation dialog
      setPendingImportData({
        recipe: selectedRecipe,
        ...importData,
      })
      setShowImportConfirmDialog(true)
    } else {
      // No existing data, import directly
      applyImportData(importData.mainIngredients, importData.subRecipes)
      success(`Imported ${importData.mainIngredients.length} ingredients and ${importData.subRecipes.length} sub-recipes from "${selectedRecipe.item}"`)
    }
  }
  
  const applyImportData = (mainIngredients: MainIngredient[], subRecipes: SubRecipe[]) => {
    setRecipe(prev => ({
      ...prev,
      mainIngredients,
      subRecipes,
    }))
  }
  
  const handleConfirmImport = () => {
    if (pendingImportData) {
      applyImportData(pendingImportData.mainIngredients, pendingImportData.subRecipes)
      success(`Imported ${pendingImportData.mainIngredients.length} ingredients and ${pendingImportData.subRecipes.length} sub-recipes from "${pendingImportData.recipe.item}"`)
    }
    setShowImportConfirmDialog(false)
    setPendingImportData(null)
  }
  
  const handleCancelImport = () => {
    setShowImportConfirmDialog(false)
    setPendingImportData(null)
  }

  const handleClearRecipeLink = () => {
    setLinkedRecipeId('')
    setLinkedRecipeName('')
    setRecipeSearchQuery('')
  }

  const saveRecipe = async () => {
    setIsSaving(true)
    try {
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? '/api/recipes' : `/api/recipes/${params.id}`
      
      // Include linkedRecipeId in the recipe data
      const recipeData = {
        ...recipe,
        linkedRecipeId: linkedRecipeId || undefined
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData)
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
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Import Confirmation Dialog */}
      <Dialog open={showImportConfirmDialog} onOpenChange={setShowImportConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Ingredients & Sub-Recipes?</DialogTitle>
            <DialogDescription>
              This will replace your current ingredients and sub-recipes with data from the linked Odoo recipe.
            </DialogDescription>
          </DialogHeader>
          
          {pendingImportData && (
            <div className="py-4 space-y-2">
              <p className="text-sm">
                <strong>Recipe:</strong> {pendingImportData.recipe.item}
              </p>
              <p className="text-sm">
                <strong>Main Ingredients:</strong> {pendingImportData.mainIngredients.length} items
              </p>
              <p className="text-sm">
                <strong>Sub-Recipes:</strong> {pendingImportData.subRecipes.length} items
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelImport}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport} className="gap-2">
              <Download className="h-4 w-4" />
              Import Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Link to Existing Recipe (Searchable)
                </Label>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      value={recipeSearchQuery}
                      onChange={(e) => {
                        setRecipeSearchQuery(e.target.value)
                        setShowRecipeDropdown(true)
                      }}
                      onFocus={() => setShowRecipeDropdown(true)}
                      placeholder="Type to search for a recipe to link..."
                      className="pl-10 pr-10"
                    />
                    {(linkedRecipeId || recipeSearchQuery) && (
                      <button
                        type="button"
                        onClick={handleClearRecipeLink}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {showRecipeDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {isLoadingRecipes ? (
                        <div className="p-3 flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading recipes from Odoo...
                        </div>
                      ) : filteredOdooRecipes.length === 0 ? (
                        <div className="p-3 text-muted-foreground">
                          {recipeSearchQuery ? 'No recipes found matching your search' : 'No recipes available'}
                        </div>
                      ) : (
                        filteredOdooRecipes.map((r) => (
                          <button
                            key={r.item_id}
                            type="button"
                            onClick={() => handleSelectOdooRecipe(r)}
                            className={`w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between ${
                              linkedRecipeId === r.item_id ? 'bg-primary/10' : ''
                            }`}
                          >
                            <div>
                              <div className="font-medium">{r.item}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.category} • {r.product_group} • {r.ingredient_count} ingredients
                              </div>
                            </div>
                            {linkedRecipeId === r.item_id && (
                              <span className="text-primary text-xs">Linked</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {linkedRecipeId && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      Linked to recipe: {linkedRecipeName || linkedRecipeId}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const odooRecipe = odooRecipes.find(r => r.item_id === linkedRecipeId)
                        if (odooRecipe) {
                          const importData = await fetchAndTransformOdooRecipe(odooRecipe)
                          if (importData) {
                            setPendingImportData({
                              recipe: odooRecipe,
                              ...importData,
                            })
                            setShowImportConfirmDialog(true)
                          }
                        }
                      }}
                      className="gap-2"
                    >
                      <Download className="h-3 w-3" />
                      Re-sync Ingredients
                    </Button>
                  </div>
                )}
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
                <Label>Recipe Photos</Label>
                <ImageUpload
                  images={recipe.presentation.photos}
                  onImagesChange={(photos) => setRecipe(prev => ({ 
                    ...prev, 
                    presentation: { 
                      ...prev.presentation, 
                      photos 
                    } 
                  }))}
                  maxImages={10}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </>
  )
}
