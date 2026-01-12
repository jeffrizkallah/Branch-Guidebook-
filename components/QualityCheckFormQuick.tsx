'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImageUpload } from '@/components/ImageUpload'
import { 
  Star, 
  CheckCircle2,
  Coffee,
  Sun,
  Loader2,
  AlertCircle,
  Zap,
  ClipboardCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QualityCheckFormQuickProps {
  branchSlug: string
  branchName: string
  onSuccess?: () => void
}

interface ItemDefaults {
  portion: string
  temp: string
  section: string
}

interface FormItem {
  product: string
  section: string
  taste: number
  appearance: number
  tasteNotes: string
  appearanceNotes: string
  portion: string
  temp: string
  photos: string[]
  remarks: string
  correctiveAction: boolean
  correctiveNotes: string
}

// Smart defaults for common products
const productDefaults: Record<string, ItemDefaults> = {
  'Chicken Biryani': { portion: '250', temp: '65', section: 'Hot' },
  'Vegetable Biryani': { portion: '250', temp: '65', section: 'Hot' },
  'Pasta': { portion: '200', temp: '70', section: 'Hot' },
  'Grilled Chicken': { portion: '180', temp: '75', section: 'Hot' },
  'Rice': { portion: '200', temp: '65', section: 'Hot' },
  'Salad': { portion: '150', temp: '4', section: 'Cold' },
  'Coleslaw': { portion: '100', temp: '4', section: 'Cold' },
  'Sandwich': { portion: '200', temp: '8', section: 'Cold' },
  'Croissant': { portion: '80', temp: '22', section: 'Bakery' },
  'Pizza': { portion: '250', temp: '70', section: 'Bakery' },
}

const commonProducts = {
  'Hot': ['Chicken Biryani', 'Vegetable Biryani', 'Pasta', 'Grilled Chicken', 'Rice', 'Curry', 'Fried Rice'],
  'Cold': ['Salad', 'Coleslaw', 'Sandwich', 'Wrap', 'Hummus'],
  'Bakery': ['Croissant', 'Pizza', 'Bread', 'Muffin', 'Pastry'],
  'Beverages': ['Juice', 'Milk', 'Smoothie', 'Lemonade']
}

export function QualityCheckFormQuick({ branchSlug, branchName, onSuccess }: QualityCheckFormQuickProps) {
  const [mealService, setMealService] = useState<'breakfast' | 'lunch'>('lunch')
  const [submittedToday, setSubmittedToday] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customProductName, setCustomProductName] = useState('')
  
  const [currentItem, setCurrentItem] = useState<FormItem>({
    product: '',
    section: 'Hot',
    taste: 0,
    appearance: 0,
    tasteNotes: '',
    appearanceNotes: '',
    portion: '',
    temp: '',
    photos: [],
    remarks: '',
    correctiveAction: false,
    correctiveNotes: ''
  })

  // Auto-detect meal service based on time
  useEffect(() => {
    const hour = new Date().getHours()
    setMealService(hour < 11 ? 'breakfast' : 'lunch')
  }, [])

  // Load today's submissions from localStorage
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const key = `qc-submitted-${branchSlug}-${today}`
    const saved = localStorage.getItem(key)
    if (saved) {
      setSubmittedToday(JSON.parse(saved))
    }
  }, [branchSlug])

  const selectProduct = (product: string) => {
    const defaults = productDefaults[product] || { portion: '', temp: '', section: currentItem.section }
    
    setCurrentItem({
      product,
      section: defaults.section,
      taste: 0, // Start at 0 - user must select rating
      appearance: 0,
      tasteNotes: '',
      appearanceNotes: '',
      portion: '', // Empty - user must fill
      temp: '', // Empty - user must fill
      photos: [],
      remarks: '',
      correctiveAction: false,
      correctiveNotes: ''
    })
    setShowCustomInput(false)
    setCustomProductName('')
  }
  
  // Get placeholder values for display
  const getPlaceholder = (product: string, field: 'portion' | 'temp') => {
    const defaults = productDefaults[product]
    if (defaults) {
      return field === 'portion' ? defaults.portion : defaults.temp
    }
    return field === 'portion' ? '250' : '65'
  }

  const handleCustomProduct = () => {
    if (customProductName.trim()) {
      selectProduct(customProductName.trim())
    }
  }

  const handleSubmit = async () => {
    setError(null)
    
    // Validation
    if (!currentItem.product) {
      setError('Please select a product')
      return
    }
    if (currentItem.taste === 0) {
      setError('Please rate the taste (select stars)')
      return
    }
    if (currentItem.appearance === 0) {
      setError('Please rate the appearance (select stars)')
      return
    }
    if (!currentItem.tasteNotes.trim()) {
      setError('Please add notes about taste and appearance')
      return
    }
    if (!currentItem.portion) {
      setError('Please enter portion weight')
      return
    }
    if (!currentItem.temp) {
      setError('Please enter temperature')
      return
    }
    if (currentItem.photos.length === 0) {
      setError('Please add at least one photo')
      return
    }

    setIsSubmitting(true)

    try {
      console.log('Submitting quality check with meal service:', mealService)
      const response = await fetch('/api/quality-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchSlug,
          mealService,
          productName: currentItem.product,
          section: currentItem.section,
          tasteScore: currentItem.taste,
          appearanceScore: currentItem.appearance,
          tasteNotes: currentItem.tasteNotes || null,
          appearanceNotes: currentItem.appearanceNotes || null,
          portionQtyGm: parseFloat(currentItem.portion),
          tempCelsius: parseFloat(currentItem.temp),
          remarks: currentItem.remarks || null,
          correctiveActionTaken: currentItem.correctiveAction,
          correctiveActionNotes: currentItem.correctiveNotes || null,
          photos: currentItem.photos,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit')
      }

      console.log('✅ Quality check submitted successfully:', data)
      console.log('Submission details:', {
        product: currentItem.product,
        mealService: mealService,
        branchSlug: branchSlug,
        submissionId: data.id
      })

      // Save to submitted list
      const today = new Date().toISOString().split('T')[0]
      const key = `qc-submitted-${branchSlug}-${today}`
      const newSubmitted = [...submittedToday, currentItem.product]
      setSubmittedToday(newSubmitted)
      localStorage.setItem(key, JSON.stringify(newSubmitted))

      // Save last used values for this product
      const lastUsedKey = `qc-last-${branchSlug}-${currentItem.product}`
      localStorage.setItem(lastUsedKey, JSON.stringify({
        section: currentItem.section,
        portion: currentItem.portion,
        temp: currentItem.temp
      }))

      setSuccessMessage(`✓ ${currentItem.product} submitted!`)
      
      // Reset form for next item, keeping section and meal service
      const savedSection = currentItem.section
      setCurrentItem({
        product: '',
        section: savedSection,
        taste: 0,
        appearance: 0,
        tasteNotes: '',
        appearanceNotes: '',
        portion: '',
        temp: '',
        photos: [],
        remarks: '',
        correctiveAction: false,
        correctiveNotes: ''
      })

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)

      // Call the success callback to refresh parent
      if (onSuccess) {
        console.log('📞 Calling onSuccess callback to refresh parent page')
        onSuccess()
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quality check')
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableProducts = commonProducts[currentItem.section as keyof typeof commonProducts] || []

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <Badge variant="secondary" className="px-3 py-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {submittedToday.length} checked today
            </Badge>
          </div>
          
          {/* Meal Service - Auto-selected but changeable */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMealService('breakfast')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all relative",
                mealService === 'breakfast'
                  ? "border-orange-500 bg-orange-100 text-orange-700 font-semibold shadow-md"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              )}
            >
              <Coffee className="h-4 w-4" />
              Breakfast
              {mealService === 'breakfast' && (
                <CheckCircle2 className="h-4 w-4 absolute right-2 top-2 text-orange-600" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMealService('lunch')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all relative",
                mealService === 'lunch'
                  ? "border-orange-500 bg-orange-100 text-orange-700 font-semibold shadow-md"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              )}
            >
              <Sun className="h-4 w-4" />
              Lunch
              {mealService === 'lunch' && (
                <CheckCircle2 className="h-4 w-4 absolute right-2 top-2 text-orange-600" />
              )}
            </button>
          </div>

        </CardContent>
      </Card>

      {/* Main Quick Entry Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-green-600" />
            Quality Check Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          
          {/* Section Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Food Section</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.keys(commonProducts).map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => {
                    setCurrentItem(prev => ({ ...prev, section, product: '' }))
                  }}
                  className={cn(
                    "py-2.5 rounded-lg text-sm font-medium transition-all",
                    currentItem.section === section
                      ? "bg-primary text-white shadow-md"
                      : "bg-gray-100 hover:bg-gray-200"
                  )}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>

          {/* Product Quick Select Chips */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Product</label>
            <div className="flex flex-wrap gap-2">
              {availableProducts.map((product) => (
                <button
                  key={product}
                  type="button"
                  onClick={() => selectProduct(product)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all relative",
                    currentItem.product === product && !showCustomInput
                      ? "bg-primary text-white shadow-md scale-105"
                      : "bg-gray-100 hover:bg-gray-200",
                    submittedToday.includes(product) && "ring-2 ring-green-500 ring-offset-2"
                  )}
                >
                  {product}
                  {submittedToday.includes(product) && (
                    <CheckCircle2 className="inline h-3 w-3 ml-1 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
                  )}
                </button>
              ))}
              <button 
                type="button"
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  showCustomInput 
                    ? "bg-primary text-white shadow-md" 
                    : "bg-gray-100 hover:bg-gray-200"
                )}
                onClick={() => {
                  setShowCustomInput(true)
                  setCurrentItem(prev => ({ ...prev, product: '' }))
                }}
              >
                + Other
              </button>
            </div>

            {/* Custom Product Input */}
            {showCustomInput && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomProduct()
                    }
                  }}
                  placeholder="Enter product name..."
                  className="flex-1 p-3 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  autoFocus
                />
                <Button 
                  type="button"
                  onClick={handleCustomProduct}
                  disabled={!customProductName.trim()}
                  size="lg"
                >
                  Add
                </Button>
                <Button 
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomProductName('')
                  }}
                  variant="outline"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Only show rest of form when product selected */}
          {currentItem.product && (
            <>
              {/* Ratings - Improved Stars */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Taste
                  </label>
                  <div className="flex gap-1 sm:gap-2 justify-center p-4 bg-gray-50 rounded-lg">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCurrentItem(prev => ({ ...prev, taste: star }))}
                        className="transition-transform hover:scale-110 flex-shrink-0"
                      >
                        <Star 
                          className={cn(
                            "h-6 w-6 sm:h-8 sm:w-8 transition-colors",
                            currentItem.taste >= star
                              ? "fill-yellow-400 text-yellow-500 drop-shadow-sm"
                              : "fill-gray-200 text-gray-300"
                          )} 
                        />
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-xl font-bold mt-2 text-yellow-600">
                    {currentItem.taste}/5
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Appearance
                  </label>
                  <div className="flex gap-1 sm:gap-2 justify-center p-4 bg-gray-50 rounded-lg">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCurrentItem(prev => ({ ...prev, appearance: star }))}
                        className="transition-transform hover:scale-110 flex-shrink-0"
                      >
                        <Star 
                          className={cn(
                            "h-6 w-6 sm:h-8 sm:w-8 transition-colors",
                            currentItem.appearance >= star
                              ? "fill-blue-400 text-blue-500 drop-shadow-sm"
                              : "fill-gray-200 text-gray-300"
                          )} 
                        />
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-xl font-bold mt-2 text-blue-600">
                    {currentItem.appearance}/5
                  </div>
                </div>
              </div>

              {/* Combined Notes Section for Taste & Appearance */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Notes (Taste & Appearance) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={currentItem.tasteNotes}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, tasteNotes: e.target.value, appearanceNotes: e.target.value }))}
                  placeholder="Describe the taste and appearance of the product..."
                  className={cn(
                    "w-full p-3 border rounded-lg min-h-[80px] resize-none",
                    !currentItem.tasteNotes && "border-red-300"
                  )}
                  required
                />
              </div>

              {/* Measurements - User must fill */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Portion (grams) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={currentItem.portion}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, portion: e.target.value }))}
                    className="w-full p-4 text-2xl font-semibold text-center border-2 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder={getPlaceholder(currentItem.product, 'portion')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Temp (°C) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={currentItem.temp}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, temp: e.target.value }))}
                    className="w-full p-4 text-2xl font-semibold text-center border-2 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder={getPlaceholder(currentItem.product, 'temp')}
                  />
                </div>
              </div>

              {/* Remarks - Always visible */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Overall Remarks (optional)
                </label>
                <textarea
                  value={currentItem.remarks}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Any additional comments or observations..."
                  className="w-full p-3 border rounded-lg min-h-[80px] resize-none"
                />
              </div>

              {/* Corrective Action - Show if low score */}
              {(currentItem.taste < 4 || currentItem.appearance < 4) && (
                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl space-y-3">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={currentItem.correctiveAction}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, correctiveAction: e.target.checked }))}
                      className="w-4 h-4 rounded" 
                    />
                    <span className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Corrective action taken
                    </span>
                  </label>
                  {currentItem.correctiveAction && (
                    <input
                      type="text"
                      value={currentItem.correctiveNotes}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, correctiveNotes: e.target.value }))}
                      placeholder="Describe the action taken..."
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  )}
                </div>
              )}

              {/* Photo Upload */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Photo <span className="text-red-500">*</span>
                </label>
                <ImageUpload 
                  images={currentItem.photos} 
                  onImagesChange={(photos) => setCurrentItem(prev => ({ ...prev, photos }))}
                  maxImages={3}
                />
              </div>

              {/* Submit Button - Large and Prominent */}
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !currentItem.photos.length}
                className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Submit & Next Item
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Form will reset automatically for next item
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {submittedToday.length > 0 && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Progress</p>
                <p className="text-2xl font-bold text-green-600">
                  {submittedToday.length} items completed
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Checked</p>
                <div className="flex flex-wrap gap-1 justify-end mt-1">
                  {submittedToday.slice(0, 5).map((product, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {product}
                    </Badge>
                  ))}
                  {submittedToday.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{submittedToday.length - 5}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

