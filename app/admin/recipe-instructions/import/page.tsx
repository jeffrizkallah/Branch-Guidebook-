'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Flame, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle,
  Check,
  Loader2,
  Trash2,
  Sparkles,
  Brain,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Unlink
} from 'lucide-react'
import type { RecipeInstruction } from '@/lib/data'
import type { ParsedInstruction, ParsedComponent } from '@/lib/reheating-instructions-schema'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CATEGORIES = ['Main Course', 'Side', 'Appetizer', 'Dessert', 'Beverage']

interface AvailableRecipe {
  recipeId: string
  name: string
}

export default function ImportRecipeInstructionsPage() {
  const router = useRouter()
  const [rawData, setRawData] = useState('')
  const [parsedInstructions, setParsedInstructions] = useState<ParsedInstruction[]>([])
  const [selectedInstructions, setSelectedInstructions] = useState<Set<number>>(new Set())
  const [expandedInstructions, setExpandedInstructions] = useState<Set<number>>(new Set())
  const [daysMap, setDaysMap] = useState<Map<number, string[]>>(new Map())
  const [categoryMap, setCategoryMap] = useState<Map<number, string>>(new Map())
  const [linkedRecipeMap, setLinkedRecipeMap] = useState<Map<number, string>>(new Map())
  const [availableRecipes, setAvailableRecipes] = useState<AvailableRecipe[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState(0)
  const [parsingNotes, setParsingNotes] = useState<string>('')
  const [isAIConfigured, setIsAIConfigured] = useState<boolean | null>(null)

  // Check if AI is configured on mount
  useEffect(() => {
    async function checkAI() {
      try {
        const res = await fetch('/api/recipe-instructions/parse-ai')
        const data = await res.json()
        setIsAIConfigured(data.configured)
      } catch {
        setIsAIConfigured(false)
      }
    }
    checkAI()
  }, [])

  // Fetch available recipes for linking
  useEffect(() => {
    async function fetchRecipes() {
      try {
        const res = await fetch('/api/recipes')
        const data = await res.json()
        setAvailableRecipes(data.map((r: any) => ({ recipeId: r.recipeId, name: r.name })))
      } catch (error) {
        console.error('Failed to fetch recipes:', error)
      }
    }
    fetchRecipes()
  }, [])

  const parseWithAI = async () => {
    if (!rawData.trim()) {
      setError('Please paste some data from Excel first')
      return
    }

    setIsParsing(true)
    setError(null)
    setParsingNotes('')
    setParsedInstructions([])
    setSelectedInstructions(new Set())
    setExpandedInstructions(new Set())
    setDaysMap(new Map())
    setCategoryMap(new Map())
    setLinkedRecipeMap(new Map())

    try {
      const res = await fetch('/api/recipe-instructions/parse-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawData })
      })

      const data = await res.json()

      if (!res.ok) {
        // Include raw response preview if available
        let errorMessage = data.error || 'Failed to parse with AI'
        if (data.rawResponse && !errorMessage.includes('Response preview')) {
          const preview = data.rawResponse.substring(0, 300)
          errorMessage += `\n\nRaw AI response preview:\n${preview}${data.rawResponse.length > 300 ? '...' : ''}`
        }
        throw new Error(errorMessage)
      }

      if (!data.success || !data.data?.instructions) {
        throw new Error('No instructions parsed from the data')
      }

      const instructions = data.data.instructions as ParsedInstruction[]
      setParsedInstructions(instructions)
      
      // Build parsing notes including batch info
      let notes = ''
      if (data.batchInfo && data.batchInfo.total > 1) {
        notes = `Processed in ${data.batchInfo.total} batches. `
      }
      if (data.data.parsingNotes) {
        notes += data.data.parsingNotes
      }
      if (notes) {
        setParsingNotes(notes)
      }

      // Select all by default
      setSelectedInstructions(new Set(instructions.map((_, i) => i)))
      
      // Expand first instruction
      if (instructions.length > 0) {
        setExpandedInstructions(new Set([0]))
      }

      // Initialize days map (default to weekdays)
      const newDaysMap = new Map<number, string[]>()
      instructions.forEach((_, idx) => {
        newDaysMap.set(idx, ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'])
      })
      setDaysMap(newDaysMap)

      // Initialize category map from parsed data
      const newCategoryMap = new Map<number, string>()
      instructions.forEach((inst, idx) => {
        newCategoryMap.set(idx, inst.category || 'Main Course')
      })
      setCategoryMap(newCategoryMap)

      // Initialize linked recipe map from AI suggestions
      const newLinkedMap = new Map<number, string>()
      instructions.forEach((inst, idx) => {
        if (inst.suggestedRecipeId) {
          newLinkedMap.set(idx, inst.suggestedRecipeId)
        }
      })
      setLinkedRecipeMap(newLinkedMap)

    } catch (err: any) {
      setError(err.message || 'Failed to parse data with AI')
    } finally {
      setIsParsing(false)
    }
  }

  const toggleInstructionSelection = (idx: number) => {
    const newSet = new Set(selectedInstructions)
    if (newSet.has(idx)) {
      newSet.delete(idx)
    } else {
      newSet.add(idx)
    }
    setSelectedInstructions(newSet)
  }

  const toggleInstructionExpanded = (idx: number) => {
    const newSet = new Set(expandedInstructions)
    if (newSet.has(idx)) {
      newSet.delete(idx)
    } else {
      newSet.add(idx)
    }
    setExpandedInstructions(newSet)
  }

  const toggleDay = (idx: number, day: string) => {
    const currentDays = daysMap.get(idx) || []
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day]
    setDaysMap(new Map(daysMap).set(idx, newDays))
  }

  const selectAllInstructions = () => {
    setSelectedInstructions(new Set(parsedInstructions.map((_, i) => i)))
  }

  const deselectAllInstructions = () => {
    setSelectedInstructions(new Set())
  }

  const saveSelectedInstructions = async () => {
    if (selectedInstructions.size === 0) {
      setError('Please select at least one instruction to save')
      return
    }

    // Validate that all selected instructions have days
    for (const idx of selectedInstructions) {
      const days = daysMap.get(idx) || []
      if (days.length === 0) {
        setError(`Please select at least one day for "${parsedInstructions[idx].dishName}"`)
        return
      }
    }

    setIsSaving(true)
    setError(null)
    setSuccessCount(0)

    const instructionsToSave = Array.from(selectedInstructions).map(idx => {
      const parsed = parsedInstructions[idx]
      const instructionId = parsed.dishName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      const instruction: RecipeInstruction = {
        instructionId,
        dishName: parsed.dishName,
        linkedRecipeId: linkedRecipeMap.get(idx) || '',
        category: categoryMap.get(idx) || 'Main Course',
        daysAvailable: daysMap.get(idx) || [],
        components: parsed.components.map((c, cidx) => ({
          componentId: `${instructionId}-${cidx}`,
          subRecipeName: c.subRecipeName,
          servingPerPortion: c.servingPerPortion,
          unit: c.unit,
          reheatingSteps: c.reheatingSteps.length > 0 ? c.reheatingSteps : [''],
          quantityControlNotes: c.quantityControlNotes || '',
          presentationGuidelines: c.presentationGuidelines || ''
        })),
        visualPresentation: [`https://picsum.photos/seed/${instructionId}/800/600`],
        branchManagerFeedback: ''
      }
      return { idx, instruction }
    })

    let savedCount = 0
    const failedInstructions: string[] = []

    for (const { idx, instruction } of instructionsToSave) {
      try {
        const res = await fetch('/api/recipe-instructions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(instruction)
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save')
        }

        savedCount++
        setSuccessCount(savedCount)
      } catch (err: any) {
        failedInstructions.push(`${parsedInstructions[idx].dishName}: ${err.message}`)
      }
    }

    setIsSaving(false)

    if (failedInstructions.length > 0) {
      setError(`Failed to save ${failedInstructions.length} instruction(s):\n${failedInstructions.join('\n')}`)
    }

    if (savedCount > 0) {
      // Remove saved instructions from the list
      const newParsed = parsedInstructions.filter((_, idx) => !selectedInstructions.has(idx))
      setParsedInstructions(newParsed)
      setSelectedInstructions(new Set())
      
      if (newParsed.length === 0 && failedInstructions.length === 0) {
        // All saved successfully, redirect
        router.push('/admin/recipe-instructions')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-yellow-500" />
          AI-Powered Import
        </h1>
        <p className="text-muted-foreground">Import reheating instructions from Excel using AI parsing</p>
      </div>

      {/* AI Status Banner */}
      {isAIConfigured === false && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertCircle className="h-5 w-5" />
              <span>OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Paste Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Step 1: Paste Excel Data
          </CardTitle>
          <CardDescription>
            Copy cells from your reheating instructions Excel file and paste them here. 
            Include the header row for best results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Paste your Excel data here...

Example format:
Dish Name / Counter Price\tSub-recipes\tServing QTY\tUnit\tReheating Step 1\tReheating Step 2\tQuantity Control Notes\tPresentation Guidelines
Hm Oriental Chicken with Rice\tChicken Stuffed For Oriental Chicken 1 KG\t120\tGr\tPut the Vacuum bag of chicken in a hot pot\tWhen Heated take out the chicken...\tApply Oriental Sauce...\tSprinkle cinnamon powder...`}
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          
          <div className="flex items-center gap-4">
            <Button 
              onClick={parseWithAI} 
              disabled={!rawData.trim() || isParsing || isAIConfigured === false}
              className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing with AI... (may take a moment for large datasets)
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Parse with AI
                </>
              )}
            </Button>
            
            {rawData.trim() && (
              <span className="text-xs text-muted-foreground">
                ~{Math.ceil(rawData.length / 4).toLocaleString()} tokens
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-500 text-sm p-3 bg-red-50 dark:bg-red-950 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}

          {parsingNotes && (
            <div className="flex items-start gap-2 text-blue-600 dark:text-blue-400 text-sm p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
              <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{parsingNotes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Review & Select */}
      {parsedInstructions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Step 2: Review & Select Instructions
              </span>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {parsedInstructions.length} parsed
              </Badge>
            </CardTitle>
            <CardDescription>
              Review the AI-parsed instructions, configure days and categories, then save selected items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selection Controls */}
            <div className="flex items-center gap-2 pb-4 border-b">
              <Button variant="outline" size="sm" onClick={selectAllInstructions}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllInstructions}>
                Deselect All
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                {selectedInstructions.size} of {parsedInstructions.length} selected
              </span>
            </div>

            {/* Instructions List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {parsedInstructions.map((instruction, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg transition-all ${
                    selectedInstructions.has(idx) 
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  {/* Instruction Header */}
                  <div 
                    className="p-4 flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleInstructionExpanded(idx)}
                  >
                    <Checkbox
                      checked={selectedInstructions.has(idx)}
                      onCheckedChange={() => toggleInstructionSelection(idx)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{instruction.dishName}</h3>
                        <Badge variant="secondary" className="shrink-0">
                          {instruction.components.length} component{instruction.components.length !== 1 ? 's' : ''}
                        </Badge>
                        {linkedRecipeMap.get(idx) ? (
                          <Badge variant="default" className="shrink-0 bg-green-500">
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 text-muted-foreground">
                            <Unlink className="h-3 w-3 mr-1" />
                            Unlinked
                          </Badge>
                        )}
                      </div>
                    </div>

                    {expandedInstructions.has(idx) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Expanded Content */}
                  {expandedInstructions.has(idx) && (
                    <div className="px-4 pb-4 space-y-4 border-t pt-4">
                      {/* Category & Days */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <select
                            value={categoryMap.get(idx) || 'Main Course'}
                            onChange={(e) => setCategoryMap(new Map(categoryMap).set(idx, e.target.value))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Link to Recipe (optional)</Label>
                          <select
                            value={linkedRecipeMap.get(idx) || ''}
                            onChange={(e) => {
                              const newMap = new Map(linkedRecipeMap)
                              if (e.target.value) {
                                newMap.set(idx, e.target.value)
                              } else {
                                newMap.delete(idx)
                              }
                              setLinkedRecipeMap(newMap)
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">-- No link --</option>
                            {availableRecipes.map(recipe => (
                              <option key={recipe.recipeId} value={recipe.recipeId}>
                                {recipe.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Days Available *</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background">
                          {DAYS.map(day => (
                            <div key={day} className="flex items-center gap-1.5">
                              <Checkbox
                                id={`day-${idx}-${day}`}
                                checked={(daysMap.get(idx) || []).includes(day)}
                                onCheckedChange={() => toggleDay(idx, day)}
                              />
                              <label htmlFor={`day-${idx}-${day}`} className="text-sm cursor-pointer">
                                {day.slice(0, 3)}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Components */}
                      <div className="space-y-3">
                        <Label>Components</Label>
                        {instruction.components.map((comp, cidx) => (
                          <div key={cidx} className="p-3 border rounded-lg bg-background">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm flex items-center gap-2">
                                <Badge variant="outline">{cidx + 1}</Badge>
                                {comp.subRecipeName || 'Unnamed Component'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {comp.servingPerPortion} {comp.unit} / portion
                              </span>
                            </div>
                            
                            {comp.reheatingSteps.length > 0 && (
                              <div className="mb-2">
                                <span className="text-xs font-medium text-orange-600">Reheating Steps:</span>
                                <ol className="text-xs text-muted-foreground mt-1 space-y-1 ml-4">
                                  {comp.reheatingSteps.map((step, sidx) => (
                                    <li key={sidx} className="list-decimal">
                                      {step}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            
                            {comp.quantityControlNotes && (
                              <div className="text-xs mb-1">
                                <span className="font-medium text-yellow-600">Quality Notes:</span>
                                <span className="text-muted-foreground ml-1">{comp.quantityControlNotes}</span>
                              </div>
                            )}
                            
                            {comp.presentationGuidelines && (
                              <div className="text-xs">
                                <span className="font-medium text-green-600">Presentation:</span>
                                <span className="text-muted-foreground ml-1">{comp.presentationGuidelines}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button 
                onClick={saveSelectedInstructions}
                disabled={isSaving || selectedInstructions.size === 0}
                className="gap-2 bg-orange-500 hover:bg-orange-600"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving... ({successCount}/{selectedInstructions.size})
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save {selectedInstructions.size} Instruction{selectedInstructions.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setParsedInstructions([])
                  setSelectedInstructions(new Set())
                  setRawData('')
                  setError(null)
                }}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
