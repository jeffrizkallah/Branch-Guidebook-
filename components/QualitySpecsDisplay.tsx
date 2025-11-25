'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Eye, Utensils, Cookie, Wind } from 'lucide-react'
import type { QualitySpecification } from '@/lib/data'

interface QualitySpecsDisplayProps {
  qualitySpecifications: QualitySpecification[]
  showHeader?: boolean
  compact?: boolean
}

interface CategoryData {
  label: string
  icon: React.ReactNode
  items: string[]
  colorClass: string
}

/**
 * Extracts and groups quality specifications by category.
 * Handles multiple data formats:
 * - Format 1 (legacy): { aspect, specification, checkMethod }
 * - Format 2 (legacy): { parameter, texture, tasteFlavorProfile, aroma }
 * - Format 3 (new): { appearance, texture, tasteFlavorProfile, aroma }
 */
function groupByCategory(specs: QualitySpecification[]): CategoryData[] {
  const appearance: string[] = []
  const texture: string[] = []
  const tasteFlavor: string[] = []
  const aroma: string[] = []

  specs.forEach(spec => {
    // Handle new simplified format with appearance field
    if (spec.appearance) {
      const items = spec.appearance.split(/[.;]/).map(s => s.trim()).filter(s => s)
      appearance.push(...items)
    }
    // Handle legacy format with parameter (maps to appearance)
    if (spec.parameter) {
      const items = spec.parameter.split(/[.;]/).map(s => s.trim()).filter(s => s)
      appearance.push(...items)
    }
    if (spec.texture) {
      const items = spec.texture.split(/[.;]/).map(s => s.trim()).filter(s => s)
      texture.push(...items)
    }
    if (spec.tasteFlavorProfile) {
      const items = spec.tasteFlavorProfile.split(/[.;]/).map(s => s.trim()).filter(s => s)
      tasteFlavor.push(...items)
    }
    if (spec.aroma) {
      const items = spec.aroma.split(/[.;]/).map(s => s.trim()).filter(s => s)
      aroma.push(...items)
    }
    
    // Handle legacy format with aspect/specification/checkMethod
    if (spec.aspect && spec.specification) {
      const aspectLower = spec.aspect.toLowerCase()
      const text = spec.checkMethod 
        ? `${spec.specification} (${spec.checkMethod})`
        : spec.specification

      if (aspectLower.includes('appearance') || aspectLower.includes('color') || aspectLower.includes('size') || aspectLower.includes('coating')) {
        appearance.push(text)
      } else if (aspectLower.includes('texture')) {
        texture.push(text)
      } else if (aspectLower.includes('taste') || aspectLower.includes('flavor') || aspectLower.includes('seasoning')) {
        tasteFlavor.push(text)
      } else if (aspectLower.includes('aroma') || aspectLower.includes('smell')) {
        aroma.push(text)
      } else if (aspectLower.includes('temperature') || aspectLower.includes('consistency')) {
        appearance.push(text)
      } else {
        appearance.push(text)
      }
    }
  })

  const categories: CategoryData[] = []

  if (appearance.length > 0) {
    categories.push({
      label: 'Appearance',
      icon: <Eye className="h-4 w-4" />,
      items: appearance,
      colorClass: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
    })
  }

  if (texture.length > 0) {
    categories.push({
      label: 'Texture',
      icon: <Cookie className="h-4 w-4" />,
      items: texture,
      colorClass: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
    })
  }

  if (tasteFlavor.length > 0) {
    categories.push({
      label: 'Taste / Flavor',
      icon: <Utensils className="h-4 w-4" />,
      items: tasteFlavor,
      colorClass: 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
    })
  }

  if (aroma.length > 0) {
    categories.push({
      label: 'Aroma',
      icon: <Wind className="h-4 w-4" />,
      items: aroma,
      colorClass: 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-200'
    })
  }

  return categories
}

export function QualitySpecsDisplay({ 
  qualitySpecifications, 
  showHeader = true,
  compact = false 
}: QualitySpecsDisplayProps) {
  if (!qualitySpecifications || qualitySpecifications.length === 0) {
    return null
  }

  const categories = groupByCategory(qualitySpecifications)

  if (categories.length === 0) {
    return null
  }

  const content = (
    <div className={`grid grid-cols-1 ${categories.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
      {categories.map((category, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-lg border ${category.colorClass}`}
        >
          <div className="flex items-center gap-2 mb-3">
            {category.icon}
            <h4 className="font-semibold text-sm uppercase tracking-wide">
              {category.label}
            </h4>
          </div>
          <ul className="space-y-2">
            {category.items.map((item, itemIdx) => (
              <li key={itemIdx} className="flex items-baseline gap-2 text-sm">
                <span className="text-current opacity-60">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )

  if (!showHeader) {
    return content
  }

  if (compact) {
    return (
      <div>
        <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Quality Specifications
        </h4>
        {content}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Quality Specifications
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Standards for appearance, texture, taste, and aroma
        </p>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}

