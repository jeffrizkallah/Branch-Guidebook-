'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SubRecipe } from '@/lib/data'

interface SubRecipeAccordionProps {
  subRecipe: SubRecipe
}

export function SubRecipeAccordion({ subRecipe }: SubRecipeAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{subRecipe.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Yield: {subRecipe.yield} • {subRecipe.ingredients.length} ingredients
            </p>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="border-t pt-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Ingredients:</h4>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">Item</th>
                    <th className="text-right p-2 font-medium">Quantity</th>
                    <th className="text-left p-2 font-medium">Unit</th>
                    <th className="text-left p-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {subRecipe.ingredients.map((ing, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{ing.item}</td>
                      <td className="p-2 text-right font-mono">{ing.quantity}</td>
                      <td className="p-2">{ing.unit || '—'}</td>
                      <td className="p-2 text-muted-foreground text-xs">{ing.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {subRecipe.notes && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">Notes: </span>
                  {subRecipe.notes}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

