'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Save, ArrowLeft, Loader2, Link2, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { RecipeInstruction, InstructionComponent } from '@/lib/data'

const EMPTY_COMPONENT: InstructionComponent = {
  componentId: '',
  subRecipeName: '',
  servingPerPortion: 0,
  unit: 'Gr',
  reheatingSteps: [''],
  quantityControlNotes: '',
  presentationGuidelines: ''
}

const EMPTY_INSTRUCTION: RecipeInstruction = {
  instructionId: '',
  dishName: '',
  linkedRecipeId: undefined,
  category: 'Main Course',
  daysAvailable: [],
  components: [],
  visualPresentation: [],
  branchManagerFeedback: ''
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CATEGORIES = ['Main Course', 'Appetizer', 'Side', 'Dessert', 'Beverage', 'Snack']

export default function ReheatingInstructionEditorPage({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new'
  const router = useRouter()
  const [instruction, setInstruction] = useState<RecipeInstruction>(EMPTY_INSTRUCTION)
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  
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
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('')
  const [linkedRecipeName, setLinkedRecipeName] = useState('')
  const [showRecipeDropdown, setShowRecipeDropdown] = useState(false)
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Expanded components state
  const [expandedComponents, setExpandedComponents] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetchOdooRecipes()
    if (!isNew) {
      fetchInstruction()
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
      setOdooRecipes(data.recipes || [])
    } catch (error) {
      console.error('Failed to fetch Odoo recipes', error)
    } finally {
      setIsLoadingRecipes(false)
    }
  }

  const fetchInstruction = async () => {
    try {
      const res = await fetch(`/api/recipe-instructions/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setInstruction(data)
        // Set search query to linked recipe name if exists
        if (data.linkedRecipeId) {
          const odooRes = await fetch('/api/odoo-recipes')
          const odooData = await odooRes.json()
          const linkedRecipe = odooData.recipes?.find((r: OdooRecipe) => r.item_id === data.linkedRecipeId)
          if (linkedRecipe) {
            setRecipeSearchQuery(linkedRecipe.item)
            setLinkedRecipeName(linkedRecipe.item)
          } else {
            setRecipeSearchQuery(data.linkedRecipeId)
            setLinkedRecipeName(data.linkedRecipeId)
          }
        }
      } else {
        alert('Reheating instruction not found')
        router.push('/admin/reheating-instructions')
      }
    } catch (error) {
      console.error('Failed to fetch instruction', error)
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
      r.item_id.toLowerCase().includes(query) ||
      r.category?.toLowerCase().includes(query) ||
      r.product_group?.toLowerCase().includes(query)
    )
  }, [odooRecipes, recipeSearchQuery])

  const handleSelectOdooRecipe = (recipe: OdooRecipe) => {
    setInstruction(prev => ({ ...prev, linkedRecipeId: recipe.item_id }))
    setRecipeSearchQuery(recipe.item)
    setLinkedRecipeName(recipe.item)
    setShowRecipeDropdown(false)
  }

  const handleClearRecipeLink = () => {
    setInstruction(prev => ({ ...prev, linkedRecipeId: undefined }))
    setRecipeSearchQuery('')
    setLinkedRecipeName('')
  }

  const saveInstruction = async () => {
    setIsSaving(true)
    try {
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? '/api/recipe-instructions' : `/api/recipe-instructions/${params.id}`
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instruction)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      router.push('/admin/reheating-instructions')
      router.refresh()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: keyof RecipeInstruction, value: any) => {
    setInstruction(prev => ({ ...prev, [field]: value }))
  }

  const toggleDay = (day: string) => {
    setInstruction(prev => {
      const days = prev.daysAvailable.includes(day)
        ? prev.daysAvailable.filter(d => d !== day)
        : [...prev.daysAvailable, day]
      return { ...prev, daysAvailable: days }
    })
  }

  // Component management
  const addComponent = () => {
    const newComponent = {
      ...EMPTY_COMPONENT,
      componentId: `component-${Date.now()}`
    }
    setInstruction(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }))
    // Expand the new component
    setExpandedComponents(prev => ({
      ...prev,
      [instruction.components.length]: true
    }))
  }

  const updateComponent = (index: number, field: keyof InstructionComponent, value: any) => {
    const newComponents = [...instruction.components]
    newComponents[index] = { ...newComponents[index], [field]: value }
    setInstruction(prev => ({ ...prev, components: newComponents }))
  }

  const removeComponent = (index: number) => {
    setInstruction(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }))
  }

  const toggleComponentExpanded = (index: number) => {
    setExpandedComponents(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  // Reheating steps management
  const addReheatingStep = (componentIndex: number) => {
    const newComponents = [...instruction.components]
    newComponents[componentIndex].reheatingSteps.push('')
    setInstruction(prev => ({ ...prev, components: newComponents }))
  }

  const updateReheatingStep = (componentIndex: number, stepIndex: number, value: string) => {
    const newComponents = [...instruction.components]
    newComponents[componentIndex].reheatingSteps[stepIndex] = value
    setInstruction(prev => ({ ...prev, components: newComponents }))
  }

  const removeReheatingStep = (componentIndex: number, stepIndex: number) => {
    const newComponents = [...instruction.components]
    newComponents[componentIndex].reheatingSteps = newComponents[componentIndex].reheatingSteps.filter((_, i) => i !== stepIndex)
    setInstruction(prev => ({ ...prev, components: newComponents }))
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
          <h1 className="text-2xl font-bold">{isNew ? 'Create Reheating Instructions' : `Edit: ${instruction.dishName}`}</h1>
        </div>
        <Button onClick={saveInstruction} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Instructions
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dish Name *</Label>
              <Input 
                value={instruction.dishName} 
                onChange={e => updateField('dishName', e.target.value)} 
                placeholder="e.g. Hm Oriental Chicken with Rice"
              />
            </div>
            <div className="space-y-2">
              <Label>Instruction ID (Slug) *</Label>
              <Input 
                value={instruction.instructionId} 
                onChange={e => updateField('instructionId', e.target.value)} 
                placeholder="e.g. hm-oriental-chicken-rice"
                disabled={!isNew}
              />
            </div>
          </div>

          {/* Searchable Recipe Linker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link to Recipe (Searchable)
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
                  placeholder="Type to search for a recipe..."
                  className="pl-10 pr-10"
                />
                {(instruction.linkedRecipeId || recipeSearchQuery) && (
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
                    filteredOdooRecipes.map((recipe) => (
                      <button
                        key={recipe.item_id}
                        type="button"
                        onClick={() => handleSelectOdooRecipe(recipe)}
                        className={`w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between ${
                          instruction.linkedRecipeId === recipe.item_id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium">{recipe.item}</div>
                          <div className="text-xs text-muted-foreground">
                            {recipe.category} • {recipe.product_group} • {recipe.ingredient_count} ingredients
                          </div>
                        </div>
                        {instruction.linkedRecipeId === recipe.item_id && (
                          <span className="text-primary text-xs">Linked</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {instruction.linkedRecipeId && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Linked to recipe: {linkedRecipeName || instruction.linkedRecipeId}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={instruction.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Branch Manager Feedback</Label>
              <Input 
                value={instruction.branchManagerFeedback} 
                onChange={e => updateField('branchManagerFeedback', e.target.value)} 
                placeholder="Any feedback from branch managers"
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
                    checked={instruction.daysAvailable.includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <label htmlFor={`day-${day}`} className="text-sm cursor-pointer">{day}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Visual Presentation URLs (One per line)</Label>
            <Textarea 
              value={instruction.visualPresentation.join('\n')}
              onChange={e => updateField('visualPresentation', e.target.value.split('\n').filter(l => l.trim()))}
              placeholder="https://example.com/image1.jpg"
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Components Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Components</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add the components that make up this dish with their reheating instructions
            </p>
          </div>
          <Button size="sm" onClick={addComponent}><Plus className="h-4 w-4 mr-2" />Add Component</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {instruction.components.map((component, compIndex) => (
            <div key={component.componentId || compIndex} className="border rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer"
                onClick={() => toggleComponentExpanded(compIndex)}
              >
                <div className="flex items-center gap-3">
                  {expandedComponents[compIndex] ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">
                    {component.subRecipeName || `Component ${compIndex + 1}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {component.servingPerPortion} {component.unit}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeComponent(compIndex)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              {expandedComponents[compIndex] && (
                <div className="p-4 space-y-4 border-t">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Sub-Recipe Name</Label>
                      <Input 
                        value={component.subRecipeName}
                        onChange={e => updateComponent(compIndex, 'subRecipeName', e.target.value)}
                        placeholder="e.g. Chicken Stuffed 1 KG"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Serving Per Portion</Label>
                      <Input 
                        type="number"
                        value={component.servingPerPortion}
                        onChange={e => updateComponent(compIndex, 'servingPerPortion', parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 120"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Input 
                        value={component.unit}
                        onChange={e => updateComponent(compIndex, 'unit', e.target.value)}
                        placeholder="e.g. Gr, Unit, ML"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Reheating Steps</Label>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        onClick={() => addReheatingStep(compIndex)}
                      >
                        <Plus className="h-3 w-3 mr-1" />Add Step
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {component.reheatingSteps.map((step, stepIndex) => (
                        <div key={stepIndex} className="flex gap-2 items-start">
                          <span className="text-sm text-muted-foreground pt-2 w-6">{stepIndex + 1}.</span>
                          <Input 
                            value={step}
                            onChange={e => updateReheatingStep(compIndex, stepIndex, e.target.value)}
                            placeholder={`Step ${stepIndex + 1}`}
                            className="flex-1"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-600 shrink-0"
                            onClick={() => removeReheatingStep(compIndex, stepIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity Control Notes</Label>
                    <Textarea 
                      value={component.quantityControlNotes}
                      onChange={e => updateComponent(compIndex, 'quantityControlNotes', e.target.value)}
                      placeholder="Notes about portion control and quantity"
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Presentation Guidelines</Label>
                    <Textarea 
                      value={component.presentationGuidelines}
                      onChange={e => updateComponent(compIndex, 'presentationGuidelines', e.target.value)}
                      placeholder="How to present this component"
                      className="min-h-[60px]"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {instruction.components.length === 0 && (
            <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
              No components added yet. Click "Add Component" to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
