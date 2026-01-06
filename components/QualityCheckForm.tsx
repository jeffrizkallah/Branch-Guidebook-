'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImageUpload } from '@/components/ImageUpload'
import { 
  Star, 
  Coffee, 
  Sun, 
  Check, 
  ChevronRight,
  Loader2,
  Camera,
  Thermometer,
  Scale,
  MessageSquare,
  Utensils,
  AlertCircle,
  ChefHat,
  Eye,
  Hash,
  Type,
  CheckSquare,
  List,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QualityCheckFormProps {
  branchSlug: string
  branchName: string
  onSuccess?: () => void
}

interface FieldConfig {
  id: number
  fieldKey: string
  label: string
  fieldType: 'rating' | 'number' | 'text' | 'textarea' | 'checkbox' | 'select'
  isRequired: boolean
  isActive: boolean
  sortOrder: number
  options: { options: string[] } | null
  minValue: number | null
  maxValue: number | null
  placeholder: string | null
  notesEnabled: boolean
  section: 'core' | 'custom'
  icon: string | null
}

// Icon mapping
const iconMap: Record<string, any> = {
  Star,
  Eye,
  Scale,
  Thermometer,
  Hash,
  Type,
  CheckSquare,
  List,
  FileText,
  MessageSquare
}

// Common products by section for quick selection
const commonProducts: Record<string, string[]> = {
  'Hot': [
    'Chicken Biryani', 'Vegetable Biryani', 'Pasta', 'Grilled Chicken',
    'Rice', 'Curry', 'Soup', 'Fried Rice', 'Noodles'
  ],
  'Cold': [
    'Salad', 'Coleslaw', 'Fruit Salad', 'Sandwich', 'Wrap',
    'Hummus', 'Yogurt', 'Cold Pasta'
  ],
  'Bakery': [
    'Croissant', 'Pizza', 'Bread', 'Muffin', 'Cookie',
    'Cake', 'Pastry', 'Donut', 'Brownie'
  ],
  'Beverages': [
    'Juice', 'Milk', 'Water', 'Smoothie', 'Lemonade'
  ]
}

const sections = ['Hot', 'Cold', 'Bakery', 'Beverages']

export function QualityCheckForm({ branchSlug, branchName, onSuccess }: QualityCheckFormProps) {
  const [step, setStep] = useState(1) // 1: Meal & Product, 2: Ratings, 3: Details, 4: Review
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Form data - core fields
  const [mealService, setMealService] = useState<'breakfast' | 'lunch' | null>(null)
  const [section, setSection] = useState<string>('')
  const [productName, setProductName] = useState('')
  const [customProduct, setCustomProduct] = useState('')
  const [remarks, setRemarks] = useState('')
  const [correctiveActionTaken, setCorrectiveActionTaken] = useState(false)
  const [correctiveActionNotes, setCorrectiveActionNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  // Dynamic field values - store all configurable fields here
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({})
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({})

  // Fetch field configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/quality-checks/fields?activeOnly=true')
        if (res.ok) {
          const data = await res.json()
          setFieldConfigs(data)
          
          // Initialize default values
          const defaultValues: Record<string, any> = {}
          data.forEach((field: FieldConfig) => {
            if (field.fieldType === 'checkbox') {
              defaultValues[field.fieldKey] = false
            } else if (field.fieldType === 'rating') {
              defaultValues[field.fieldKey] = 0
            } else {
              defaultValues[field.fieldKey] = ''
            }
          })
          setFieldValues(defaultValues)
        }
      } catch (error) {
        console.error('Error fetching field config:', error)
      } finally {
        setLoadingConfig(false)
      }
    }
    fetchConfig()
  }, [])

  // Auto-detect meal service based on time
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 11) {
      setMealService('breakfast')
    } else {
      setMealService('lunch')
    }
  }, [])

  // Get final product name
  const finalProductName = productName === 'custom' ? customProduct : productName

  // Separate fields into rating fields (step 2) and measurement/other fields (step 3)
  const ratingFields = fieldConfigs.filter(f => f.fieldType === 'rating')
  const measurementFields = fieldConfigs.filter(f => f.fieldType !== 'rating')

  // Check if step is complete
  const isStep1Complete = mealService && section && (productName === 'custom' ? customProduct : productName)
  
  const isStep2Complete = ratingFields.every(field => {
    if (!field.isRequired) return true
    const value = fieldValues[field.fieldKey]
    return value !== undefined && value !== 0 && value !== ''
  })

  const isStep3Complete = measurementFields.every(field => {
    if (!field.isRequired) return true
    const value = fieldValues[field.fieldKey]
    return value !== undefined && value !== '' && value !== null
  })

  const updateFieldValue = (key: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [key]: value }))
  }

  const updateFieldNotes = (key: string, value: string) => {
    setFieldNotes(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    // Validate all required fields
    const missingFields: string[] = []
    
    if (!mealService) missingFields.push('Meal Service')
    if (!section) missingFields.push('Section')
    if (!finalProductName) missingFields.push('Product Name')
    if (photos.length === 0) missingFields.push('Photo')
    
    fieldConfigs.forEach(field => {
      if (field.isRequired) {
        const value = fieldValues[field.fieldKey]
        if (value === undefined || value === '' || value === 0 || value === null) {
          missingFields.push(field.label)
        }
      }
    })

    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.join(', ')}`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare core field values
      const coreFields: Record<string, any> = {}
      const customFields: Record<string, any> = {}

      fieldConfigs.forEach(field => {
        const value = fieldValues[field.fieldKey]
        const notes = fieldNotes[field.fieldKey]
        
        if (field.section === 'core') {
          // Core fields go directly to the main columns
          coreFields[field.fieldKey] = value
          if (notes) {
            coreFields[`${field.fieldKey.replace('_score', '')}_notes`] = notes
          }
        } else {
          // Custom fields go to custom_fields JSON
          customFields[field.fieldKey] = {
            value,
            notes: notes || null
          }
        }
      })

      const response = await fetch('/api/quality-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchSlug,
          mealService,
          productName: finalProductName,
          section,
          // Core fields
          tasteScore: coreFields.taste_score || fieldValues.taste_score,
          appearanceScore: coreFields.appearance_score || fieldValues.appearance_score,
          portionQtyGm: parseFloat(coreFields.portion_qty_gm || fieldValues.portion_qty_gm),
          tempCelsius: parseFloat(coreFields.temp_celsius || fieldValues.temp_celsius),
          tasteNotes: coreFields.taste_notes || fieldNotes.taste_score || null,
          portionNotes: coreFields.portion_notes || fieldNotes.portion_qty_gm || null,
          appearanceNotes: coreFields.appearance_notes || fieldNotes.appearance_score || null,
          // Other fields
          remarks: remarks || null,
          correctiveActionTaken,
          correctiveActionNotes: correctiveActionNotes || null,
          photos,
          // Custom fields
          customFields: Object.keys(customFields).length > 0 ? customFields : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit')
      }

      setSuccess(true)
      if (onSuccess) {
        setTimeout(onSuccess, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quality check')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form for another entry
  const resetForm = () => {
    setStep(1)
    setProductName('')
    setCustomProduct('')
    setRemarks('')
    setCorrectiveActionTaken(false)
    setCorrectiveActionNotes('')
    setPhotos([])
    setSuccess(false)
    setError(null)
    
    // Reset dynamic fields
    const defaultValues: Record<string, any> = {}
    fieldConfigs.forEach((field: FieldConfig) => {
      if (field.fieldType === 'checkbox') {
        defaultValues[field.fieldKey] = false
      } else if (field.fieldType === 'rating') {
        defaultValues[field.fieldKey] = 0
      } else {
        defaultValues[field.fieldKey] = ''
      }
    })
    setFieldValues(defaultValues)
    setFieldNotes({})
  }

  // Render a dynamic field based on its configuration
  const renderField = (field: FieldConfig) => {
    const Icon = field.icon ? iconMap[field.icon] : Star
    const value = fieldValues[field.fieldKey]
    const notes = fieldNotes[field.fieldKey] || ''

    switch (field.fieldType) {
      case 'rating':
        const min = field.minValue ?? 1
        const max = field.maxValue ?? 5
        const stars = Array.from({ length: max - min + 1 }, (_, i) => i + min)
        
        return (
          <div key={field.id} className="space-y-2">
            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4" />}
              {field.label}
              {field.isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="flex justify-center gap-2">
              {stars.map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => updateFieldValue(field.fieldKey, score)}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                    (value ?? 0) >= score
                      ? field.fieldKey.includes('appearance') 
                        ? "bg-blue-500 text-white"
                        : "bg-yellow-400 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  )}
                >
                  <Star className={cn("h-6 w-6", (value ?? 0) >= score && "fill-current")} />
                </button>
              ))}
            </div>
            {field.notesEnabled && (
              <input
                type="text"
                value={notes}
                onChange={(e) => updateFieldNotes(field.fieldKey, e.target.value)}
                placeholder={`Notes about ${field.label.toLowerCase()} (optional)`}
                className="w-full mt-3 p-2 text-sm border rounded-lg"
              />
            )}
          </div>
        )

      case 'number':
        return (
          <div key={field.id}>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4" />}
              {field.label}
              {field.isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => updateFieldValue(field.fieldKey, e.target.value)}
              placeholder={field.placeholder || ''}
              min={field.minValue ?? undefined}
              max={field.maxValue ?? undefined}
              className="w-full p-3 text-lg border rounded-lg focus:ring-2 focus:ring-primary"
              inputMode="decimal"
            />
            {field.notesEnabled && (
              <input
                type="text"
                value={notes}
                onChange={(e) => updateFieldNotes(field.fieldKey, e.target.value)}
                placeholder={`Notes about ${field.label.toLowerCase()} (optional)`}
                className="w-full mt-2 p-2 text-sm border rounded-lg"
              />
            )}
          </div>
        )

      case 'text':
        return (
          <div key={field.id}>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4" />}
              {field.label}
              {field.isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => updateFieldValue(field.fieldKey, e.target.value)}
              placeholder={field.placeholder || ''}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
        )

      case 'textarea':
        return (
          <div key={field.id}>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4" />}
              {field.label}
              {field.isRequired && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={value || ''}
              onChange={(e) => updateFieldValue(field.fieldKey, e.target.value)}
              placeholder={field.placeholder || ''}
              className="w-full p-3 border rounded-lg min-h-[80px] resize-none"
            />
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.id} className="p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value ?? false}
                onChange={(e) => updateFieldValue(field.fieldKey, e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="font-medium">{field.label}</span>
            </label>
            {field.notesEnabled && value && (
              <input
                type="text"
                value={notes}
                onChange={(e) => updateFieldNotes(field.fieldKey, e.target.value)}
                placeholder="Add notes..."
                className="w-full mt-3 p-2 border rounded-lg text-sm"
              />
            )}
          </div>
        )

      case 'select':
        const options = field.options?.options || []
        return (
          <div key={field.id}>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4" />}
              {field.label}
              {field.isRequired && <span className="text-red-500">*</span>}
            </label>
            <select
              value={value || ''}
              onChange={(e) => updateFieldValue(field.fieldKey, e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="">Select...</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )

      default:
        return null
    }
  }

  // Loading state
  if (loadingConfig) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading form...</p>
        </CardContent>
      </Card>
    )
  }

  // Success screen
  if (success) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-700 mb-2">Quality Check Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            {finalProductName} - {mealService === 'breakfast' ? 'Breakfast' : 'Lunch'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={resetForm} variant="outline">
              Add Another Item
            </Button>
            <Button onClick={onSuccess}>
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between px-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step >= s 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {s}
            </div>
            {s < 4 && (
              <div className={cn(
                "w-12 sm:w-16 h-1 mx-1 rounded",
                step > s ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Item</span>
        <span>Ratings</span>
        <span>Details</span>
        <span>Review</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Meal Service & Product Selection */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              What are you checking?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Meal Service Selection */}
            <div>
              <label className="text-sm font-medium mb-3 block">Meal Service</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMealService('breakfast')}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                    mealService === 'breakfast'
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <Coffee className="h-5 w-5" />
                  <span className="font-medium">Breakfast</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMealService('lunch')}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                    mealService === 'lunch'
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <Sun className="h-5 w-5" />
                  <span className="font-medium">Lunch</span>
                </button>
              </div>
            </div>

            {/* Section Selection */}
            <div>
              <label className="text-sm font-medium mb-3 block">Food Section</label>
              <div className="grid grid-cols-2 gap-2">
                {sections.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSection(s)
                      setProductName('')
                    }}
                    className={cn(
                      "p-3 rounded-lg border-2 text-sm font-medium transition-all",
                      section === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Selection */}
            {section && (
              <div>
                <label className="text-sm font-medium mb-3 block">Product</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {commonProducts[section]?.map((product) => (
                    <button
                      key={product}
                      type="button"
                      onClick={() => setProductName(product)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-all",
                        productName === product
                          ? "bg-primary text-white"
                          : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      {product}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setProductName('custom')}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm transition-all",
                      productName === 'custom'
                        ? "bg-primary text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    + Other
                  </button>
                </div>
                
                {productName === 'custom' && (
                  <input
                    type="text"
                    value={customProduct}
                    onChange={(e) => setCustomProduct(e.target.value)}
                    placeholder="Enter product name..."
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    autoFocus
                  />
                )}
              </div>
            )}

            <Button 
              onClick={() => setStep(2)} 
              disabled={!isStep1Complete}
              className="w-full"
              size="lg"
            >
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Ratings */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5" />
              Rate the Quality
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {finalProductName} ({section})
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {ratingFields.map(renderField)}

            <div className="flex gap-3">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!isStep2Complete}
                className="flex-1"
              >
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Measurements & Details */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Measurements & Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {measurementFields.map(renderField)}

            {/* Remarks */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Remarks (optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional comments..."
                className="w-full p-3 border rounded-lg min-h-[80px] resize-none"
              />
            </div>

            {/* Corrective Action */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={correctiveActionTaken}
                  onChange={(e) => setCorrectiveActionTaken(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="font-medium">Corrective action taken</span>
              </label>
              {correctiveActionTaken && (
                <input
                  type="text"
                  value={correctiveActionNotes}
                  onChange={(e) => setCorrectiveActionNotes(e.target.value)}
                  placeholder="Describe the action taken..."
                  className="w-full mt-3 p-2 border rounded-lg text-sm"
                />
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => setStep(4)} 
                disabled={!isStep3Complete}
                className="flex-1"
              >
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Photo & Review */}
      {step === 4 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Add Photo & Submit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo Upload */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Photo <span className="text-red-500">*</span>
              </label>
              <ImageUpload 
                images={photos} 
                onImagesChange={setPhotos}
                maxImages={3}
              />
              {photos.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Please add at least one photo to submit
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                Summary
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Branch:</span>
                  <p className="font-medium">{branchName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Meal:</span>
                  <p className="font-medium capitalize">{mealService}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Product:</span>
                  <p className="font-medium">{finalProductName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Section:</span>
                  <p className="font-medium">{section}</p>
                </div>
                
                {/* Dynamic field summaries */}
                {fieldConfigs.map(field => {
                  const value = fieldValues[field.fieldKey]
                  if (value === undefined || value === '' || value === 0 || value === null) return null
                  
                  return (
                    <div key={field.id}>
                      <span className="text-muted-foreground">{field.label}:</span>
                      <p className="font-medium flex items-center gap-1">
                        {field.fieldType === 'rating' ? (
                          <>
                            {value}/{field.maxValue || 5} <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          </>
                        ) : field.fieldType === 'checkbox' ? (
                          value ? 'Yes' : 'No'
                        ) : field.fieldKey === 'portion_qty_gm' ? (
                          `${value}g`
                        ) : field.fieldKey === 'temp_celsius' ? (
                          `${value}°C`
                        ) : (
                          value
                        )}
                      </p>
                    </div>
                  )
                })}
              </div>
              {remarks && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm">Remarks:</span>
                  <p className="text-sm">{remarks}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep(3)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
