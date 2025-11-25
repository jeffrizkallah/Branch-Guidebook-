'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, AlertCircle, CheckCircle2, Edit2, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import type { Recipe, MainIngredient, SubRecipe, PreparationStep, MachineToolRequirement, QualitySpecification } from '@/lib/data'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CATEGORIES = ['Main Course', 'Appetizer', 'Dessert', 'Side Dish', 'Beverage', 'Snack']

interface ParsedRecipe extends Omit<Recipe, 'recipeId'> {
  recipeId?: string
}

export default function RecipeImportPage() {
  const [pastedData, setPastedData] = useState('')
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    mainIngredients: true,
    subRecipes: false,
    preparation: true,
    machines: false,
    quality: false,
    packing: false
  })
  const router = useRouter()

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const parseExcelData = () => {
    setError('')
    setParsedRecipe(null)

    try {
      const lines = pastedData.trim().split('\n')
      if (lines.length < 5) {
        setError('Please paste complete recipe data from Excel')
        return
      }

      const recipe: ParsedRecipe = {
        recipeId: '',
        name: '',
        category: 'Main Course',
        station: '',
        recipeCode: '',
        yield: '',
        daysAvailable: [],
        prepTime: '30 minutes',
        cookTime: '30 minutes',
        servings: '1 portion',
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

      let currentSection = ''
      let currentSubRecipe: SubRecipe | null = null
      let stepCounter = 1
      let isFinalRecipeSection = false

      // Helper function to extract step number from text
      const extractStepNumber = (text: string): { stepNum: number | null, instruction: string } => {
        // More flexible dash matching - use [\s\S] instead of . to match across newlines
        const stepMatch = text.match(/Step\s+(\d+)\s*[-–—‐−\s]+([\s\S]+)/i)
        if (stepMatch) {
          return {
            stepNum: parseInt(stepMatch[1]),
            instruction: stepMatch[2].trim().replace(/\s+/g, ' ')  // Normalize whitespace
          }
        }
        return { stepNum: null, instruction: text.trim() }
      }

      for (let i = 0; i < lines.length; i++) {
        const cells = lines[i].split('\t')
        if (cells.length === 0) continue

        const cellA = String(cells[0] || '').trim()
        const cellB = String(cells[1] || '').trim()
        const cellC = String(cells[2] || '').trim()
        const cellD = String(cells[3] || '').trim()

        // Recipe Information Section - try column B first, then C
        if (cellA === 'Recipe Name') {
          const value = cellB || cellC
          if (value) {
            recipe.name = value
            recipe.recipeId = value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          }
        } else if (cellA === 'Station') {
          recipe.station = cellB || cellC || ''
        } else if (cellA === 'Recipe Code') {
          recipe.recipeCode = cellB || cellC || ''
        } else if (cellA.toLowerCase().includes('yield')) {
          const value = cellB || cellC
          if (value) {
            recipe.yield = value
            recipe.servings = value
          }
        }

        // Detect Ingredients Section (flexible matching)
        else if (cellA.match(/^2[A-Za-z]?\.\s*Ingredients/i)) {
          currentSection = 'ingredients'
          
          // Check if this is a sub-recipe section (2B, 2C, etc. OR contains "Sub-Recipe")
          const isSubSection = cellA.match(/^2[B-Z]\./i) || cellA.includes('Sub-Recipe')
          
          if (isSubSection) {
            // Extract sub-recipe name
            let subRecipeName = 'Sub Recipe'
            const dashMatch = cellA.match(/[-–—]\s*(.+?)(?:\s*1\s*KG|\s*\(Sub[-\s]Recipe\))?$/i)
            if (dashMatch) {
              subRecipeName = dashMatch[1].trim()
            }
            
            console.log(`🔨 Creating sub-recipe: "${subRecipeName}" from header: "${cellA}"`)
            
            currentSubRecipe = {
              subRecipeId: subRecipeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: subRecipeName,
              yield: '1 KG',
              ingredients: [],
              preparation: [],
              requiredMachinesTools: [],
              qualitySpecifications: [],
              packingLabeling: {
                packingType: '',
                serviceItems: [],
                labelRequirements: '',
                storageCondition: '',
                shelfLife: ''
              }
            }
            recipe.subRecipes?.push(currentSubRecipe)
            console.log(`✅ Sub-recipe created and added to recipe.subRecipes`)
          } else {
            currentSubRecipe = null
          }
        } else if (currentSection === 'ingredients' && cellA && cellA !== 'Ingredient Name' && !cellA.match(/^[3-6]\./)) {
          if (cellA.match(/^[3-6]\./)) {
            currentSection = ''
            currentSubRecipe = null
          } else if (cellB || cellC) {
            const ingredient = {
              item: cellA,
              quantity: cellB || '0',
              unit: cellC || 'GM',
              notes: cellD || ''
            }

            if (currentSubRecipe) {
              currentSubRecipe.ingredients.push(ingredient)
            } else {
              // Main ingredients for the recipe
              recipe.mainIngredients?.push({
                name: cellA,
                quantity: parseFloat(cellB) || 0,
                unit: cellC || 'GM',
                specifications: cellD || ''
              })
            }
          }
        }

        // Machines & Tools Section
        else if (cellA.match(/^3\.\s*Required Machines/i)) {
          currentSection = 'machines'
          currentSubRecipe = null
          isFinalRecipeSection = false
        } else if (currentSection === 'machines' && cellA && cellA !== 'Machine/Tool' && !cellA.match(/^[4-6]\./)) {
          if (cellA.match(/^[4-6]\./)) {
            currentSection = ''
          } else {
            recipe.requiredMachinesTools?.push({
              name: cellA,
              setting: cellB || '',
              purpose: cellC || '',
              notes: cellD || ''
            })
          }
        }

        // Preparation Steps Section
        else if (cellA.match(/^4\.\s*Step[-\s]by[-\s]Step/i)) {
          currentSection = 'preparation'
          stepCounter = 1
          currentSubRecipe = null
          isFinalRecipeSection = false
        } else if (cellA.match(/^5\.\s*Quality/i) || cellA.match(/^6\.\s*Packing/i)) {
          // End preparation section when we hit Quality or Packing sections
          currentSection = cellA.match(/^5\./) ? 'quality' : 'packing'
          currentSubRecipe = null
          isFinalRecipeSection = false
        } else if (currentSection === 'preparation' && cellA !== 'Step Number') {
          // Check if this row has step content in either cellA or cellB
          const hasStepContent = cellA.match(/^Step\s+\d+/i) || cellB.match(/^Step\s+\d+/i)
          const hasSectionHeader = cellA.match(/^([A-Z])\.\s*.+/i)
          const hasContent = cellA.length > 10 || cellB.length > 10 || hasStepContent
          
          if (hasContent || hasSectionHeader) {
            // Handle sections like "A. Sub-Recipe: Apple Pie Filling", "D. Main Recipe: Pizza Apple Cinnamon"
            // OR standalone step lines from Excel multi-line cells that got split into separate rows
            const sectionMatch = cellA.match(/^([A-Z])\.\s*(.+)/i)
            
            if (sectionMatch) {
              // This is a section header with multi-line steps in cellB
              const sectionLetter = sectionMatch[1].trim()  // A, B, C, etc.
              const sectionTitle = sectionMatch[2].trim()
              
              // Check if this is a sub-recipe section (e.g., "Sub-Recipe: Apple Pie Filling")
              const subRecipeMatch = sectionTitle.match(/Sub[-\s]Recipe:\s*(.+)/i)  // Now captures name after "Sub-Recipe:"
              const isFinalRecipe = sectionTitle.match(/Main[-\s]Recipe|Final[-\s]Recipe|Assembly/i)
              
              let targetSubRecipe = null
              
              if (subRecipeMatch) {
                // Extract the sub-recipe name from the section header ONLY
                let subRecipeName = subRecipeMatch[1]?.trim() || ''
                
                console.log(`📝 Extracted sub-recipe name from header: "${subRecipeName}"`)
                
                // If no name in header, use section letter (A=1st, B=2nd, C=3rd sub-recipe)
                if (!subRecipeName && recipe.subRecipes && recipe.subRecipes.length > 0) {
                  const letterIndex = sectionLetter.charCodeAt(0) - 'A'.charCodeAt(0)
                  if (letterIndex >= 0 && letterIndex < recipe.subRecipes.length) {
                    targetSubRecipe = recipe.subRecipes[letterIndex]
                    console.log(`🔄 Using sub-recipe by position (${sectionLetter} = index ${letterIndex}): ${targetSubRecipe.name}`)
                  } else {
                    console.warn(`⚠️ Letter ${sectionLetter} (index ${letterIndex}) is out of range for ${recipe.subRecipes.length} sub-recipes`)
                  }
                } else if (subRecipeName) {
                  // Remove common suffixes for better matching
                  subRecipeName = subRecipeName
                    .replace(/\s*1\s*KG/gi, '')
                    .replace(/\s*\(Sub[-\s]Recipe\)/gi, '')
                    .trim()
                  
                  console.log('🔍 Looking for sub-recipe:', subRecipeName)
                  console.log('📋 Available sub-recipes:', recipe.subRecipes?.map(sr => sr.name))
                
                  // Find the matching sub-recipe with improved matching
                  targetSubRecipe = recipe.subRecipes?.find(sr => {
                    const srNameClean = sr.name
                      .toLowerCase()
                      .replace(/\s*1\s*kg/gi, '')
                      .replace(/\s*\(sub[-\s]recipe\)/gi, '')
                      .replace(/\s*\(\)/g, '')  // Remove empty parentheses
                      .trim()
                    const searchNameClean = subRecipeName.toLowerCase().trim()
                    
                    console.log(`  🔍 Comparing: "${srNameClean}" with "${searchNameClean}"`)
                    
                    // Split into words and check if all words from one exist in the other
                    // This handles word order differences like "Caramel Sauce" vs "Sauce Caramel"
                    const srWords = srNameClean.split(/\s+/).filter(w => w.length > 2)
                    const searchWords = searchNameClean.split(/\s+/).filter(w => w.length > 2)
                    
                    // Check if names match (contains, exact match, OR same words in different order)
                    const containsMatch = srNameClean.includes(searchNameClean) || searchNameClean.includes(srNameClean)
                    const wordMatch = srWords.length > 0 && searchWords.length > 0 && 
                      searchWords.every(word => srWords.some(srWord => srWord.includes(word) || word.includes(srWord)))
                    
                    const matches = containsMatch || wordMatch
                    console.log(`  ${matches ? '✅' : '❌'} Match result: ${matches} (contains: ${containsMatch}, words: ${wordMatch})`)
                    return matches
                  }) || null
                }
                
                if (targetSubRecipe) {
                  console.log('✅ Found matching sub-recipe:', targetSubRecipe.name)
                  currentSubRecipe = targetSubRecipe
                  isFinalRecipeSection = false
                } else {
                  console.warn('⚠️ No matching sub-recipe found for:', subRecipeName || 'unknown')
                  currentSubRecipe = null
                  isFinalRecipeSection = false
                }
              } else if (isFinalRecipe) {
                // This is the final/main recipe assembly section
                console.log('🎯 Starting MAIN RECIPE section')
                isFinalRecipeSection = true
                targetSubRecipe = null
                currentSubRecipe = null
              } else {
                // Check if it's a sub-preparation section
                const isSubPrep = sectionTitle.match(/Sub[-\s]Preparation/i)
                if (isSubPrep) {
                  console.log('⚠️ Sub-preparation section found (no specific sub-recipe)')
                  isFinalRecipeSection = false
                } else {
                  // Unknown section - treat as main recipe
                  console.log('⚠️ Unknown section, treating as main recipe:', sectionTitle)
                  isFinalRecipeSection = true
                  currentSubRecipe = null
                }
              }
              
              // Parse the multi-line description which contains multiple steps
              let description = cellB
                .replace(/^[""\u201C\u201D]|[""\u201C\u201D]$/g, '')  // Remove any quote characters
                .replace(/\r\n/g, '\n')  // Normalize Windows line endings
                .replace(/\r/g, '\n')    // Normalize old Mac line endings
                .trim()

              console.log('�� Raw description:', description.substring(0, 200))

              // Split by Step patterns - more flexible matching
              const stepMatches = description.split(/(?=Step\s+\d+\s*[-–—‐−])/gi)

              console.log(`📊 Split into ${stepMatches.length} parts:`, stepMatches.map(s => s.substring(0, 50)))

              if (stepMatches.length > 1) {
                // Multiple steps found in description
                stepMatches.forEach((stepText, idx) => {
                  const trimmed = stepText.trim()
                  console.log(`  🔸 Part ${idx}: "${trimmed.substring(0, 60)}..."`)
                  if (trimmed && trimmed.match(/Step\s+\d+/i)) {  // Only process if it looks like a step
                    const { stepNum, instruction } = extractStepNumber(trimmed)
                    console.log(`    → stepNum: ${stepNum}, instruction: "${instruction.substring(0, 40)}..."`)
                    
                    if (targetSubRecipe) {
                      // ✅ Add ONLY to SUB-RECIPE preparation
                      // Ensure preparation array exists
                      if (!targetSubRecipe.preparation) {
                        targetSubRecipe.preparation = []
                      }
                      const subStepNum = stepNum || targetSubRecipe.preparation.length + 1
                      targetSubRecipe.preparation.push({
                        step: subStepNum,
                        instruction: instruction,
                        time: cellC || '',
                        critical: false,
                        hint: cellD || ''
                      })
                      console.log(`  ➕ Added step ${subStepNum} to SUB-RECIPE: ${targetSubRecipe.name}`)
                    } else if (isFinalRecipeSection) {
                      // ✅ Add ONLY to MAIN RECIPE preparation
                      const mainStepNum = stepNum || stepCounter++
                      recipe.preparation.push({
                        step: mainStepNum,
                        instruction: instruction,
                        time: cellC || '',
                        critical: false,
                        hint: cellD || ''
                      })
                      console.log(`  ➕ Added step ${mainStepNum} to MAIN RECIPE`)
                    } else {
                      // ⚠️ Ambiguous section - skip to avoid duplicates
                      console.warn('  ⚠️ Skipping step (ambiguous section):', instruction.substring(0, 50))
                    }
                  }
                })
              } else {
                // Single instruction
                const { stepNum, instruction } = extractStepNumber(description)
                
                if (targetSubRecipe) {
                  // ✅ Add ONLY to SUB-RECIPE preparation
                  // Ensure preparation array exists
                  if (!targetSubRecipe.preparation) {
                    targetSubRecipe.preparation = []
                  }
                  const subStepNum = stepNum || targetSubRecipe.preparation.length + 1
                  targetSubRecipe.preparation.push({
                    step: subStepNum,
                    instruction: instruction,
                    time: cellC || '',
                    critical: false,
                    hint: cellD || ''
                  })
                  console.log(`  ➕ Added step ${subStepNum} to SUB-RECIPE: ${targetSubRecipe.name}`)
                } else if (isFinalRecipeSection) {
                  // ✅ Add ONLY to MAIN RECIPE preparation
                  const mainStepNum = stepNum || stepCounter++
                  recipe.preparation.push({
                    step: mainStepNum,
                    instruction: instruction,
                    time: cellC || '',
                    critical: false,
                    hint: cellD || ''
                  })
                  console.log(`  ➕ Added step ${mainStepNum} to MAIN RECIPE`)
                } else {
                  // ⚠️ Ambiguous section - skip
                  console.warn('  ⚠️ Skipping step (ambiguous section):', instruction.substring(0, 50))
                }
              }
            } else {
              // Regular step format (no section header) - continuation steps
              // Check both cellA and cellB for step content
              const rawInstruction = cellB || cellA
              
              // Skip empty or very short content
              if (!rawInstruction || rawInstruction.length < 5) {
                console.log(`  ⏭️ Skipping empty/short row: cellA="${cellA.substring(0, 30)}" cellB="${cellB.substring(0, 30)}"`)
              } else {
                // Clean up any quotes from the instruction
                const cleanedInstruction = rawInstruction
                  .replace(/^[""\u201C\u201D]|[""\u201C\u201D]$/g, '')
                  .trim()
                
                const { stepNum, instruction: extractedInstruction } = extractStepNumber(cleanedInstruction)
                
                console.log(`  📝 Processing continuation: "${cleanedInstruction.substring(0, 50)}..." -> step ${stepNum}`)
                
                // Only add to current context (sub-recipe or main recipe)
                if (currentSubRecipe) {
                  // We're in a sub-recipe context
                  if (!currentSubRecipe.preparation) {
                    currentSubRecipe.preparation = []
                  }
                  const subStepNum = stepNum || currentSubRecipe.preparation.length + 1
                  currentSubRecipe.preparation.push({
                    step: subStepNum,
                    instruction: extractedInstruction,
                    time: cellC || '',
                    critical: false,
                    hint: cellD || ''
                  })
                  console.log(`  ➕ Added continuation step ${subStepNum} to SUB-RECIPE: ${currentSubRecipe.name}`)
                } else if (isFinalRecipeSection) {
                  // We're in main recipe context
                  const mainStepNum = stepNum || stepCounter++
                  recipe.preparation.push({
                    step: mainStepNum,
                    instruction: extractedInstruction,
                    time: cellC || '',
                    critical: false,
                    hint: cellD || ''
                  })
                  console.log(`  ➕ Added continuation step ${mainStepNum} to MAIN RECIPE`)
                } else {
                  // First standalone step - assume it's main recipe
                  console.log(`  🎯 Auto-detecting as main recipe step`)
                  isFinalRecipeSection = true
                  const mainStepNum = stepNum || stepCounter++
                  recipe.preparation.push({
                    step: mainStepNum,
                    instruction: extractedInstruction,
                    time: cellC || '',
                    critical: false,
                    hint: cellD || ''
                  })
                  console.log(`  ➕ Added first step ${mainStepNum} to MAIN RECIPE (auto-detected)`)
                }
              }
            }
          }
        }

        // Quality Specifications Section (header is caught above to end preparation section)
        else if (currentSection === 'quality' && cellA && cellA !== 'Appearance / Parameter' && !cellA.match(/^6\./)) {
          recipe.qualitySpecifications?.push({
            aspect: cellA,
            specification: cellB || '',
            checkMethod: cellC || '',
            parameter: cellA,
            texture: cellB || '',
            tasteFlavorProfile: cellC || '',
            aroma: cellD || ''
          })
        }

        // Packing & Labeling Section (header is caught above to end preparation section)
        else if (currentSection === 'packing') {
          if (cellA === 'Packing Type') {
            recipe.packingLabeling!.packingType = cellB || cellC || ''
          } else if (cellA === 'Label Requirements') {
            recipe.packingLabeling!.labelRequirements = cellB || cellC || ''
          } else if (cellA === 'Storage Condition') {
            recipe.packingLabeling!.storageCondition = cellB || cellC || ''
          } else if (cellA === 'Shelf Life') {
            recipe.packingLabeling!.shelfLife = cellB || cellC || ''
          }
        }
      }

      // Renumber preparation steps sequentially to avoid gaps
      recipe.preparation.forEach((step, index) => {
        step.step = index + 1
      })
      
      // Renumber sub-recipe preparation steps
      console.log('\n📊 Final Sub-Recipe Preparation Summary:')
      recipe.subRecipes?.forEach(subRecipe => {
        console.log(`  📋 ${subRecipe.name}: ${subRecipe.preparation?.length || 0} steps`)
        if (subRecipe.preparation && subRecipe.preparation.length > 0) {
          subRecipe.preparation.forEach((step, index) => {
            step.step = index + 1
            console.log(`    Step ${step.step}: ${step.instruction.substring(0, 50)}...`)
          })
        } else {
          console.warn(`    ⚠️ No preparation steps found!`)
        }
      })

      // Set placeholder photos
      if (recipe.recipeId) {
        recipe.presentation.photos = [
          `https://picsum.photos/seed/${recipe.recipeId}-1/800/600`,
          `https://picsum.photos/seed/${recipe.recipeId}-2/800/600`,
          `https://picsum.photos/seed/${recipe.recipeId}-3/800/600`
        ]
      }

      setParsedRecipe(recipe)
      setError('')

    } catch (err) {
      setError('Error parsing data. Please check your Excel format.')
      console.error(err)
    }
  }

  const updateBasicInfo = (field: string, value: any) => {
    if (!parsedRecipe) return
    setParsedRecipe({ ...parsedRecipe, [field]: value })
  }

  const toggleDay = (day: string) => {
    if (!parsedRecipe) return
    const days = parsedRecipe.daysAvailable || []
    const newDays = days.includes(day) 
      ? days.filter(d => d !== day)
      : [...days, day]
    updateBasicInfo('daysAvailable', newDays)
  }

  const updateMainIngredient = (index: number, field: keyof MainIngredient, value: any) => {
    if (!parsedRecipe) return
    const ingredients = [...(parsedRecipe.mainIngredients || [])]
    ingredients[index] = { ...ingredients[index], [field]: value }
    setParsedRecipe({ ...parsedRecipe, mainIngredients: ingredients })
  }

  const deleteMainIngredient = (index: number) => {
    if (!parsedRecipe) return
    const ingredients = (parsedRecipe.mainIngredients || []).filter((_, i) => i !== index)
    setParsedRecipe({ ...parsedRecipe, mainIngredients: ingredients })
  }

  const addMainIngredient = () => {
    if (!parsedRecipe) return
    const newIngredient: MainIngredient = {
      name: '',
      quantity: 0,
      unit: 'GM',
      specifications: ''
    }
    setParsedRecipe({
      ...parsedRecipe,
      mainIngredients: [...(parsedRecipe.mainIngredients || []), newIngredient]
    })
  }

  const updatePreparationStep = (index: number, field: keyof PreparationStep, value: any) => {
    if (!parsedRecipe) return
    const steps = [...parsedRecipe.preparation]
    steps[index] = { ...steps[index], [field]: value }
    setParsedRecipe({ ...parsedRecipe, preparation: steps })
  }

  const deletePreparationStep = (index: number) => {
    if (!parsedRecipe) return
    const steps = parsedRecipe.preparation.filter((_, i) => i !== index)
    // Renumber steps
    steps.forEach((step, i) => step.step = i + 1)
    setParsedRecipe({ ...parsedRecipe, preparation: steps })
  }

  const addPreparationStep = () => {
    if (!parsedRecipe) return
    const newStep: PreparationStep = {
      step: parsedRecipe.preparation.length + 1,
      instruction: '',
      time: '',
      critical: false,
      hint: ''
    }
    setParsedRecipe({
      ...parsedRecipe,
      preparation: [...parsedRecipe.preparation, newStep]
    })
  }

  const saveRecipe = async () => {
    if (!parsedRecipe) return

    // Validate required fields
    if (!parsedRecipe.name) {
      setError('Recipe name is required')
      return
    }
    if (!parsedRecipe.daysAvailable || parsedRecipe.daysAvailable.length === 0) {
      setError('Please select at least one day')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedRecipe)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save recipe')
      }

      const savedRecipe = await response.json()
      setSuccess(true)
      setLoading(false)

      setTimeout(() => {
        router.push(`/admin/recipes/${savedRecipe.recipeId}`)
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Error saving recipe. Please try again.')
      setLoading(false)
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Import Recipe</h1>
        <p className="text-muted-foreground">Paste recipe data from Excel and import it to your collection</p>
      </div>

      {success ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Recipe Imported Successfully!</h2>
              <p className="text-muted-foreground mb-4">
                {parsedRecipe?.name} has been added to your collection
              </p>
              <p className="text-sm text-muted-foreground">Redirecting to recipe page...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Step 1: Paste Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Step 1: Paste Excel Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium mb-2">
                    Copy and paste your recipe from Excel (include all sections):
                  </Label>
                  <textarea
                    className="w-full h-64 p-3 border rounded-lg font-mono text-sm"
                    placeholder="Select all cells from your Excel recipe and paste here (Ctrl+C from Excel, then Ctrl+V here)...&#10;&#10;Include:&#10;- Recipe Information&#10;- Ingredients&#10;- Machines & Tools&#10;- Preparation Steps&#10;- Quality Specifications&#10;- Packing & Labeling"
                    value={pastedData}
                    onChange={(e) => setPastedData(e.target.value)}
                  />
                </div>

                <Button
                  onClick={parseExcelData}
                  disabled={!pastedData.trim()}
                  size="lg"
                >
                  Parse Recipe Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 & 3: Editable Preview */}
          {parsedRecipe && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Review & Edit Recipe</CardTitle>
                <p className="text-sm text-muted-foreground">Review the parsed data and make any necessary edits before saving</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="border rounded-lg">
                  <button
                    onClick={() => toggleSection('basic')}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <h3 className="font-semibold">Basic Information</h3>
                    {expandedSections.basic ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {expandedSections.basic && (
                    <div className="p-4 space-y-4 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Recipe Name *</Label>
                          <Input
                            value={parsedRecipe.name}
                            onChange={(e) => updateBasicInfo('name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Station</Label>
                          <Input
                            value={parsedRecipe.station || ''}
                            onChange={(e) => updateBasicInfo('station', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Recipe Code</Label>
                          <Input
                            value={parsedRecipe.recipeCode || ''}
                            onChange={(e) => updateBasicInfo('recipeCode', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Yield</Label>
                          <Input
                            value={parsedRecipe.yield || ''}
                            onChange={(e) => updateBasicInfo('yield', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Category *</Label>
                          <select
                            value={parsedRecipe.category}
                            onChange={(e) => updateBasicInfo('category', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Prep Time</Label>
                          <Input
                            value={parsedRecipe.prepTime}
                            onChange={(e) => updateBasicInfo('prepTime', e.target.value)}
                            placeholder="30 minutes"
                          />
                        </div>
                        <div>
                          <Label>Cook Time</Label>
                          <Input
                            value={parsedRecipe.cookTime}
                            onChange={(e) => updateBasicInfo('cookTime', e.target.value)}
                            placeholder="30 minutes"
                          />
                        </div>
                        <div>
                          <Label>Allergens</Label>
                          <Input
                            value={parsedRecipe.allergens.join(', ')}
                            onChange={(e) => updateBasicInfo('allergens', e.target.value.split(',').map(a => a.trim()))}
                            placeholder="Dairy, Gluten, Eggs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Days Available * (select at least one)</Label>
                        <div className="flex flex-wrap gap-3 mt-2">
                          {DAYS.map(day => (
                            <div key={day} className="flex items-center gap-2">
                              <Checkbox
                                id={`day-${day}`}
                                checked={parsedRecipe.daysAvailable?.includes(day) || false}
                                onCheckedChange={() => toggleDay(day)}
                              />
                              <label htmlFor={`day-${day}`} className="text-sm cursor-pointer">
                                {day}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Ingredients */}
                <div className="border rounded-lg">
                  <button
                    onClick={() => toggleSection('mainIngredients')}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <h3 className="font-semibold">Main Ingredients ({parsedRecipe.mainIngredients?.length || 0})</h3>
                    {expandedSections.mainIngredients ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {expandedSections.mainIngredients && (
                    <div className="p-4 space-y-3 border-t">
                      {parsedRecipe.mainIngredients?.map((ingredient, index) => (
                        <div key={index} className="flex gap-2 items-start p-3 bg-muted/30 rounded">
                          <div className="flex-1 grid grid-cols-4 gap-2">
                            <Input
                              placeholder="Name"
                              value={ingredient.name}
                              onChange={(e) => updateMainIngredient(index, 'name', e.target.value)}
                              className="col-span-2"
                            />
                            <Input
                              placeholder="Qty"
                              type="number"
                              value={ingredient.quantity}
                              onChange={(e) => updateMainIngredient(index, 'quantity', parseFloat(e.target.value))}
                            />
                            <Input
                              placeholder="Unit"
                              value={ingredient.unit}
                              onChange={(e) => updateMainIngredient(index, 'unit', e.target.value)}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMainIngredient(index)}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button onClick={addMainIngredient} variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" /> Add Ingredient
                      </Button>
                    </div>
                  )}
                </div>

                {/* Sub-Recipes */}
                {parsedRecipe.subRecipes && parsedRecipe.subRecipes.length > 0 && (
                  <div className="border rounded-lg">
                    <button
                      onClick={() => toggleSection('subRecipes')}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <h3 className="font-semibold">Sub-Recipes ({parsedRecipe.subRecipes.length})</h3>
                      {expandedSections.subRecipes ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    {expandedSections.subRecipes && (
                      <div className="p-4 space-y-3 border-t">
                        {parsedRecipe.subRecipes.map((subRecipe, index) => (
                          <div key={index} className="p-3 bg-muted/30 rounded">
                            <div className="font-medium mb-2">{subRecipe.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {subRecipe.ingredients.length} ingredients
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Preparation Steps */}
                <div className="border rounded-lg">
                  <button
                    onClick={() => toggleSection('preparation')}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <h3 className="font-semibold">Preparation Steps ({parsedRecipe.preparation.length})</h3>
                    {expandedSections.preparation ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {expandedSections.preparation && (
                    <div className="p-4 space-y-3 border-t">
                      {parsedRecipe.preparation.map((step, index) => (
                        <div key={index} className="p-3 bg-muted/30 rounded space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="font-semibold text-primary min-w-[60px]">Step {step.step}</div>
                            <div className="flex-1">
                              <textarea
                                className="w-full p-2 border rounded text-sm"
                                rows={3}
                                value={step.instruction}
                                onChange={(e) => updatePreparationStep(index, 'instruction', e.target.value)}
                              />
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <Input
                                  placeholder="Time"
                                  value={step.time}
                                  onChange={(e) => updatePreparationStep(index, 'time', e.target.value)}
                                  className="text-sm"
                                />
                                <Input
                                  placeholder="Hint/Note"
                                  value={step.hint || ''}
                                  onChange={(e) => updatePreparationStep(index, 'hint', e.target.value)}
                                  className="text-sm col-span-2"
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePreparationStep(index)}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button onClick={addPreparationStep} variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" /> Add Step
                      </Button>
                    </div>
                  )}
                </div>

                {/* Machines & Tools */}
                {parsedRecipe.requiredMachinesTools && parsedRecipe.requiredMachinesTools.length > 0 && (
                  <div className="border rounded-lg">
                    <button
                      onClick={() => toggleSection('machines')}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <h3 className="font-semibold">Machines & Tools ({parsedRecipe.requiredMachinesTools.length})</h3>
                      {expandedSections.machines ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    {expandedSections.machines && (
                      <div className="p-4 space-y-2 border-t">
                        {parsedRecipe.requiredMachinesTools.map((tool, index) => (
                          <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                            <div className="font-medium">{tool.name}</div>
                            {tool.purpose && <div className="text-muted-foreground">{tool.purpose}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quality Specifications */}
                {parsedRecipe.qualitySpecifications && parsedRecipe.qualitySpecifications.length > 0 && (
                  <div className="border rounded-lg">
                    <button
                      onClick={() => toggleSection('quality')}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <h3 className="font-semibold">Quality Specifications ({parsedRecipe.qualitySpecifications.length})</h3>
                      {expandedSections.quality ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    {expandedSections.quality && (
                      <div className="p-4 space-y-2 border-t">
                        {parsedRecipe.qualitySpecifications.map((spec, index) => (
                          <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                            <div className="font-medium">{spec.aspect || spec.parameter}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Packing & Labeling */}
                {parsedRecipe.packingLabeling && (
                  <div className="border rounded-lg">
                    <button
                      onClick={() => toggleSection('packing')}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <h3 className="font-semibold">Packing & Labeling</h3>
                      {expandedSections.packing ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    {expandedSections.packing && (
                      <div className="p-4 space-y-2 border-t text-sm">
                        <div><span className="font-medium">Type:</span> {parsedRecipe.packingLabeling.packingType}</div>
                        <div><span className="font-medium">Storage:</span> {parsedRecipe.packingLabeling.storageCondition}</div>
                        <div><span className="font-medium">Shelf Life:</span> {parsedRecipe.packingLabeling.shelfLife}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={saveRecipe}
                    size="lg"
                    disabled={loading || !parsedRecipe.name || !parsedRecipe.daysAvailable?.length}
                    className="flex-1"
                  >
                    {loading ? 'Saving...' : '✓ Save Recipe'}
                  </Button>
                  <Button
                    onClick={() => setParsedRecipe(null)}
                    variant="outline"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>

                {!parsedRecipe.daysAvailable?.length && (
                  <p className="text-sm text-amber-600">⚠️ Please select at least one day before saving</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-500">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 text-red-600">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <div className="font-semibold">Error</div>
                    <div className="text-sm">{error}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

