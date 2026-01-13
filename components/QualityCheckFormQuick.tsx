'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
  ClipboardCheck,
  Search,
  Clock,
  X,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QualityCheckFormQuickProps {
  branchSlug: string
  branchName: string
  onSuccess?: () => void
}

interface Product {
  name: string
  category: string
  revenue?: number
}

interface ProductsByCategory {
  [category: string]: Array<{
    name: string
    revenue: number
    quantity: number
    timesSold: number
  }>
}

interface CategoryInfo {
  name: string
  count: number
  topProducts: string[]
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

// Category icons
const categoryIcons: Record<string, string> = {
  'Recent': '🕐',
  'Breakfast': '🍳',
  'Beverages': '☕',
  'Hot Meals': '🔥',
  'Sandwiches': '🥪',
  'Pizza': '🍕',
  'Desserts': '🍰',
  'Salads': '🥗',
  'Appetizers': '🍟',
  'Burgers': '🍔',
  'Mezza': '🧆',
  'Subscriptions': '📦',
  'Special Events': '🎉',
  'OBB': '📋',
  'Soups': '🍲',
}

// Default portion/temp by category
const categoryDefaults: Record<string, { portion: string, temp: string }> = {
  'Hot Meals': { portion: '250', temp: '65' },
  'Breakfast': { portion: '150', temp: '70' },
  'Pizza': { portion: '250', temp: '70' },
  'Sandwiches': { portion: '200', temp: '8' },
  'Salads': { portion: '150', temp: '4' },
  'Desserts': { portion: '100', temp: '8' },
  'Beverages': { portion: '330', temp: '4' },
  'Appetizers': { portion: '100', temp: '65' },
  'Burgers': { portion: '250', temp: '70' },
  'Soups': { portion: '300', temp: '70' },
  'Mezza': { portion: '150', temp: '22' },
}

export function QualityCheckFormQuick({ branchSlug, branchName, onSuccess }: QualityCheckFormQuickProps) {
  const isCentralKitchen = branchSlug === 'central-kitchen'
  
  // Product data
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [productsByCategory, setProductsByCategory] = useState<ProductsByCategory>({})
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  
  // UI state
  const [selectedCategory, setSelectedCategory] = useState<string>('Recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [modalCategory, setModalCategory] = useState<string>('')
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Form state
  const [mealService, setMealService] = useState<'breakfast' | 'lunch'>('lunch')
  const [submittedToday, setSubmittedToday] = useState<string[]>([])
  const [recentProducts, setRecentProducts] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const [currentItem, setCurrentItem] = useState<FormItem>({
    product: '',
    section: '',
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

  // Auto-detect meal service
  useEffect(() => {
    const hour = new Date().getHours()
    setMealService(hour < 11 ? 'breakfast' : 'lunch')
  }, [])

  // Load products
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/quality-checks/products')
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
          setProductsByCategory(data.productsByCategory || {})
        }
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setIsLoadingProducts(false)
      }
    }
    loadProducts()
  }, [])

  // Load localStorage data
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const submittedKey = `qc-submitted-${branchSlug}-${today}`
    const savedSubmitted = localStorage.getItem(submittedKey)
    if (savedSubmitted) setSubmittedToday(JSON.parse(savedSubmitted))
    
    const recentKey = `qc-recent-${branchSlug}`
    const savedRecent = localStorage.getItem(recentKey)
    if (savedRecent) setRecentProducts(JSON.parse(savedRecent))
  }, [branchSlug])

  // Search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    setIsSearching(true)

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/quality-checks/products?search=${encodeURIComponent(searchQuery)}&limit=20`)
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.searchResults || [])
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery])

  // Get products for category (limited for initial view)
  const getDisplayProducts = (category: string, limit: number = 6) => {
    if (category === 'Recent') {
      return recentProducts.slice(0, limit).map(name => {
        for (const [cat, products] of Object.entries(productsByCategory)) {
          const found = products.find(p => p.name === name)
          if (found) return { name, category: cat }
        }
        return { name, category: '' }
      })
    }
    const products = productsByCategory[category] || []
    return products.slice(0, limit).map(p => ({ name: p.name, category }))
  }

  // Filter modal products by search
  const filteredModalProducts = useMemo(() => {
    const products = productsByCategory[modalCategory] || []
    if (!modalSearchQuery) return products
    const query = modalSearchQuery.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(query))
  }, [modalCategory, modalSearchQuery, productsByCategory])

  const selectProduct = (productName: string, category: string) => {
    setCurrentItem({
      product: productName,
      section: category,
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
    
    setSearchQuery('')
    setIsSearchFocused(false)
    setShowCategoryModal(false)
    
    const updatedRecent = [productName, ...recentProducts.filter(p => p !== productName)].slice(0, 20)
    setRecentProducts(updatedRecent)
    localStorage.setItem(`qc-recent-${branchSlug}`, JSON.stringify(updatedRecent))
  }

  const openCategoryModal = (category: string) => {
    setModalCategory(category)
    setModalSearchQuery('')
    setShowCategoryModal(true)
  }

  const getPlaceholder = (field: 'portion' | 'temp') => {
    const defaults = categoryDefaults[currentItem.section] || { portion: '250', temp: '65' }
    return field === 'portion' ? defaults.portion : defaults.temp
  }

  const handleSubmit = async () => {
    setError(null)
    
    if (!currentItem.product) { setError('Please select a product'); return }
    if (currentItem.taste === 0) { setError('Please rate the taste'); return }
    if (currentItem.appearance === 0) { setError('Please rate the appearance'); return }
    if (!currentItem.tasteNotes.trim()) { setError('Please add notes'); return }
    if (!currentItem.portion) { setError('Please enter portion weight'); return }
    if (!currentItem.temp) { setError('Please enter temperature'); return }
    if (currentItem.photos.length === 0) { setError('Please add at least one photo'); return }

    setIsSubmitting(true)

    try {
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
      if (!response.ok) throw new Error(data.error || 'Failed to submit')

      const today = new Date().toISOString().split('T')[0]
      const key = `qc-submitted-${branchSlug}-${today}`
      const newSubmitted = [...submittedToday, currentItem.product]
      setSubmittedToday(newSubmitted)
      localStorage.setItem(key, JSON.stringify(newSubmitted))

      setSuccessMessage(`✓ ${currentItem.product} submitted!`)
      
      setCurrentItem({
        product: '',
        section: '',
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

      setTimeout(() => setSuccessMessage(null), 3000)
      if (onSuccess) onSuccess()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setIsSubmitting(false)
    }
  }

  const visibleCategories = useMemo(() => {
    return ['Recent', ...categories.map(c => c.name)].slice(0, 10)
  }, [categories])

  const showSearchOverlay = isSearchFocused && searchQuery.length >= 2

  return (
    <div className="max-w-2xl mx-auto">
      {/* Sticky Header with Search */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm pb-2 -mx-4 px-4 pt-2">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-2 bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-2 bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search products..."
            className="w-full pl-11 pr-11 py-3.5 border-2 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setIsSearchFocused(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Overlay */}
      {showSearchOverlay && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="sticky top-0 bg-background border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-11 pr-11 py-3.5 border-2 rounded-xl text-base"
              />
              <button
                onClick={() => { setSearchQuery(''); setIsSearchFocused(false) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto h-[calc(100vh-70px)]">
            {isSearching ? (
              <div className="p-8 text-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="divide-y">
                {searchResults.map((product, index) => (
                  <button
                    key={index}
                    onClick={() => selectProduct(product.name, product.category)}
                    className={cn(
                      "w-full px-4 py-4 text-left flex items-center justify-between active:bg-gray-100",
                      submittedToday.includes(product.name) && "bg-green-50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.category}</p>
                    </div>
                    {submittedToday.includes(product.name) && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 ml-2" />
                    )}
                  </button>
                ))}
                {/* Add custom product option at the bottom of results */}
                <button
                  onClick={() => selectProduct(searchQuery.trim(), 'Other')}
                  className="w-full px-4 py-4 text-left flex items-center gap-3 active:bg-blue-50 bg-blue-50/50 border-t-2 border-blue-100"
                >
                  <div className="p-2 bg-blue-100 rounded-full">
                    <span className="text-lg">✏️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-blue-700">Add &quot;{searchQuery.trim()}&quot;</p>
                    <p className="text-sm text-blue-600">Use custom product name</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-blue-400" />
                </button>
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="text-gray-500 mb-4">
                  No products found for &quot;{searchQuery}&quot;
                </div>
                <button
                  onClick={() => selectProduct(searchQuery.trim(), 'Other')}
                  className="w-full p-4 text-left flex items-center gap-3 active:bg-blue-100 bg-blue-50 rounded-xl border-2 border-blue-200"
                >
                  <div className="p-2 bg-blue-100 rounded-full">
                    <span className="text-lg">✏️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-blue-700">Add &quot;{searchQuery.trim()}&quot;</p>
                    <p className="text-sm text-blue-600">Use this as custom product name</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-blue-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="sticky top-0 bg-background border-b p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>{categoryIcons[modalCategory] || '📦'}</span>
                {modalCategory}
              </h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                placeholder={`Filter ${modalCategory}...`}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto h-[calc(100vh-120px)] p-2">
            <div className="grid grid-cols-2 gap-2">
              {filteredModalProducts.map((product, index) => (
                <button
                  key={index}
                  onClick={() => selectProduct(product.name, modalCategory)}
                  className={cn(
                    "p-3 rounded-lg text-left text-sm font-medium border-2 active:scale-95 transition-transform",
                    submittedToday.includes(product.name) 
                      ? "border-green-500 bg-green-50" 
                      : "border-gray-100 bg-gray-50 active:bg-gray-100"
                  )}
                >
                  <span className="line-clamp-2">{product.name}</span>
                  {submittedToday.includes(product.name) && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-1" />
                  )}
                </button>
              ))}
            </div>
            {filteredModalProducts.length === 0 && (
              <p className="text-center text-gray-500 py-8">No products found</p>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-3 pb-4">
        
        {/* Meal Service - Compact */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMealService('breakfast')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
              mealService === 'breakfast'
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-gray-200 bg-white"
            )}
          >
            <Coffee className="h-4 w-4" />
            Breakfast
            {mealService === 'breakfast' && <CheckCircle2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMealService('lunch')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
              mealService === 'lunch'
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-gray-200 bg-white"
            )}
          >
            <Sun className="h-4 w-4" />
            Lunch
            {mealService === 'lunch' && <CheckCircle2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Category Pills - Compact Horizontal Scroll */}
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <div className="flex gap-1.5 min-w-max">
            {visibleCategories.map((cat) => {
              const count = cat === 'Recent' ? recentProducts.length : categories.find(c => c.name === cat)?.count || 0
              const isSelected = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                    isSelected
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 active:bg-gray-200"
                  )}
                >
                  <span>{categoryIcons[cat] || '📦'}</span>
                  <span>{cat}</span>
                  {count > 0 && <span className="opacity-70">({count})</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Product Grid - Compact */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            {isLoadingProducts ? (
              <div className="py-6 text-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : selectedCategory === 'Recent' && recentProducts.length === 0 ? (
              <div className="py-6 text-center text-gray-500">
                <Clock className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p className="text-sm">No recent products</p>
                <p className="text-xs">Search or select a category</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {getDisplayProducts(selectedCategory, 6).map((product, index) => (
                  <button
                    key={index}
                    onClick={() => selectProduct(product.name, product.category || selectedCategory)}
                    className={cn(
                      "relative p-2.5 rounded-lg text-left text-sm font-medium border-2 active:scale-95 transition-transform",
                      currentItem.product === product.name
                        ? "border-primary bg-primary/10"
                        : submittedToday.includes(product.name)
                        ? "border-green-400 bg-green-50"
                        : "border-gray-100 bg-gray-50 active:bg-gray-100"
                    )}
                  >
                    <span className="line-clamp-2 text-xs leading-tight">{product.name}</span>
                    {submittedToday.includes(product.name) && (
                      <CheckCircle2 className="absolute top-1 right-1 h-3.5 w-3.5 text-green-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Product Indicator */}
        {currentItem.product && (
          <div className="flex items-center gap-2 p-2.5 bg-primary/10 rounded-lg border-2 border-primary">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary text-sm truncate">{currentItem.product}</p>
              <p className="text-xs text-gray-600">{currentItem.section}</p>
            </div>
            <button 
              onClick={() => setCurrentItem(prev => ({ ...prev, product: '', section: '' }))}
              className="p-1 hover:bg-white/50 rounded"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Quality Form - Compact */}
        {currentItem.product && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-green-600" />
                Rate Quality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-3 pt-0">
              
              {/* Star Ratings - Compact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <label className="text-xs font-semibold block mb-1">Taste</label>
                  <div className="flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCurrentItem(prev => ({ ...prev, taste: star }))}
                        className="p-0.5"
                      >
                        <Star className={cn(
                          "h-7 w-7",
                          currentItem.taste >= star
                            ? "fill-yellow-400 text-yellow-500"
                            : "fill-gray-200 text-gray-300"
                        )} />
                      </button>
                    ))}
                  </div>
                  <span className="text-lg font-bold text-yellow-600">{currentItem.taste}/5</span>
                </div>

                <div className="text-center">
                  <label className="text-xs font-semibold block mb-1">Appearance</label>
                  <div className="flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCurrentItem(prev => ({ ...prev, appearance: star }))}
                        className="p-0.5"
                      >
                        <Star className={cn(
                          "h-7 w-7",
                          currentItem.appearance >= star
                            ? "fill-blue-400 text-blue-500"
                            : "fill-gray-200 text-gray-300"
                        )} />
                      </button>
                    ))}
                  </div>
                  <span className="text-lg font-bold text-blue-600">{currentItem.appearance}/5</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium mb-1 block">
                  Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={currentItem.tasteNotes}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, tasteNotes: e.target.value, appearanceNotes: e.target.value }))}
                  placeholder="Describe taste and appearance..."
                  className="w-full p-2.5 border rounded-lg min-h-[60px] resize-none text-sm"
                />
              </div>

              {/* Measurements - Side by Side */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    {isCentralKitchen ? 'Portion (KG)' : 'Portion (g)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={currentItem.portion}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, portion: e.target.value }))}
                    className="w-full p-3 text-xl font-bold text-center border-2 rounded-lg"
                    placeholder={getPlaceholder('portion')}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Temp (°C) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={currentItem.temp}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, temp: e.target.value }))}
                    className="w-full p-3 text-xl font-bold text-center border-2 rounded-lg"
                    placeholder={getPlaceholder('temp')}
                  />
                </div>
              </div>

              {/* Corrective Action - Compact */}
              {(currentItem.taste < 4 || currentItem.appearance < 4) && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={currentItem.correctiveAction}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, correctiveAction: e.target.checked }))}
                      className="w-4 h-4 rounded" 
                    />
                    <span className="text-xs font-semibold text-amber-900">
                      Corrective action taken
                    </span>
                  </label>
                  {currentItem.correctiveAction && (
                    <input
                      type="text"
                      value={currentItem.correctiveNotes}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, correctiveNotes: e.target.value }))}
                      placeholder="Describe action..."
                      className="w-full mt-2 p-2 border rounded text-sm"
                    />
                  )}
                </div>
              )}

              {/* Photo Upload */}
              <div>
                <label className="text-xs font-medium mb-1 block">
                  Photo <span className="text-red-500">*</span>
                </label>
                <ImageUpload 
                  images={currentItem.photos} 
                  onImagesChange={(photos) => setCurrentItem(prev => ({ ...prev, photos }))}
                  maxImages={3}
                />
              </div>

              {/* Submit Button - Large Touch Target */}
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !currentItem.photos.length}
                className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-transform"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle2 className="h-5 w-5 mr-2" /> Submit & Next</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Today's Progress - Compact */}
        {submittedToday.length > 0 && !currentItem.product && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Today</p>
                <p className="text-lg font-bold text-green-600">{submittedToday.length} checked</p>
              </div>
              <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                {submittedToday.slice(0, 3).map((product, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs truncate max-w-[100px]">
                    {product}
                  </Badge>
                ))}
                {submittedToday.length > 3 && (
                  <Badge variant="outline" className="text-xs">+{submittedToday.length - 3}</Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
