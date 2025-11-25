'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Eye, Cookie, Utensils, Wind } from 'lucide-react'
import type { QualitySpecification } from '@/lib/data'

interface QualitySpecsEditorProps {
  qualitySpecs: QualitySpecification[]
  onChange: (qualitySpecs: QualitySpecification[]) => void
}

interface CategoryConfig {
  key: 'appearance' | 'texture' | 'tasteFlavorProfile' | 'aroma'
  label: string
  icon: React.ReactNode
  placeholder: string
  colorClass: string
  borderColor: string
}

const categories: CategoryConfig[] = [
  {
    key: 'appearance',
    label: 'Appearance',
    icon: <Eye className="h-4 w-4" />,
    placeholder: 'e.g. Golden brown crust; Even coating; Consistent size and shape',
    colorClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-400'
  },
  {
    key: 'texture',
    label: 'Texture',
    icon: <Cookie className="h-4 w-4" />,
    placeholder: 'e.g. Crispy exterior; Soft and moist inside; Not soggy',
    colorClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-400'
  },
  {
    key: 'tasteFlavorProfile',
    label: 'Taste / Flavor',
    icon: <Utensils className="h-4 w-4" />,
    placeholder: 'e.g. Well-seasoned; Balanced herbs; Not too salty or bland',
    colorClass: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-400'
  },
  {
    key: 'aroma',
    label: 'Aroma',
    icon: <Wind className="h-4 w-4" />,
    placeholder: 'e.g. Fresh herb scent; Pleasant roasted smell; No burnt odor',
    colorClass: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-400'
  }
]

/**
 * Extracts values from existing quality specs data (handles legacy formats)
 */
function extractValues(specs: QualitySpecification[]): Record<string, string> {
  const result: Record<string, string> = {
    appearance: '',
    texture: '',
    tasteFlavorProfile: '',
    aroma: ''
  }

  if (!specs || specs.length === 0) return result

  // Check for new simplified format first (single object with direct fields)
  const firstSpec = specs[0]
  if (firstSpec.appearance || firstSpec.texture || firstSpec.tasteFlavorProfile || firstSpec.aroma) {
    result.appearance = firstSpec.appearance || firstSpec.parameter || ''
    result.texture = firstSpec.texture || ''
    result.tasteFlavorProfile = firstSpec.tasteFlavorProfile || ''
    result.aroma = firstSpec.aroma || ''
    return result
  }

  // Handle legacy format - aggregate from multiple specs
  const appearance: string[] = []
  const texture: string[] = []
  const taste: string[] = []
  const aroma: string[] = []

  specs.forEach(spec => {
    // Legacy format with parameter/texture/tasteFlavorProfile/aroma fields
    if (spec.parameter) appearance.push(spec.parameter)
    if (spec.texture) texture.push(spec.texture)
    if (spec.tasteFlavorProfile) taste.push(spec.tasteFlavorProfile)
    if (spec.aroma) aroma.push(spec.aroma)

    // Legacy format with aspect/specification
    if (spec.aspect && spec.specification) {
      const aspectLower = spec.aspect.toLowerCase()
      const text = spec.specification
      
      if (aspectLower.includes('appearance') || aspectLower.includes('color') || aspectLower.includes('size')) {
        appearance.push(text)
      } else if (aspectLower.includes('texture')) {
        texture.push(text)
      } else if (aspectLower.includes('taste') || aspectLower.includes('flavor')) {
        taste.push(text)
      } else if (aspectLower.includes('aroma') || aspectLower.includes('smell')) {
        aroma.push(text)
      } else {
        appearance.push(text) // Default to appearance
      }
    }
  })

  result.appearance = appearance.join('; ')
  result.texture = texture.join('; ')
  result.tasteFlavorProfile = taste.join('; ')
  result.aroma = aroma.join('; ')

  return result
}

export function QualitySpecsEditor({ qualitySpecs, onChange }: QualitySpecsEditorProps) {
  const values = extractValues(qualitySpecs)

  const handleChange = (key: string, value: string) => {
    // Store as a single object with all 4 fields
    onChange([{
      appearance: key === 'appearance' ? value : values.appearance,
      texture: key === 'texture' ? value : values.texture,
      tasteFlavorProfile: key === 'tasteFlavorProfile' ? value : values.tasteFlavorProfile,
      aroma: key === 'aroma' ? value : values.aroma
    }])
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Define quality standards for your recipe. Use semicolons (;) to separate multiple points.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category) => (
          <Card 
            key={category.key} 
            className={`${category.colorClass} border-l-4 ${category.borderColor}`}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-current opacity-70">{category.icon}</span>
                <label className="font-semibold text-sm uppercase tracking-wide">
                  {category.label}
                </label>
              </div>
              <Textarea
                placeholder={category.placeholder}
                value={values[category.key] || ''}
                onChange={(e) => handleChange(category.key, e.target.value)}
                rows={3}
                className="bg-white dark:bg-gray-900 resize-none"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
