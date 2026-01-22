'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Check, AlertCircle } from 'lucide-react'

export default function FixRecipeIdsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFix = async () => {
    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/recipes/fix-ids', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fix recipe IDs')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-primary">Fix Recipe IDs</h1>
        <p className="text-muted-foreground">
          This tool will fix any recipes that have incorrect or mismatched Recipe IDs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recipe ID Fixer</CardTitle>
          <CardDescription>
            Click the button below to automatically fix all recipe IDs. This will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Generate proper slugs from recipe names</li>
              <li>Update the database with correct IDs</li>
              <li>Make all recipes accessible from the recipe list</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleFix}
            disabled={isLoading}
            className="gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fixing Recipe IDs...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Fix Recipe IDs
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg flex items-start gap-2 text-red-800">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-start gap-2 text-green-800 mb-3">
                <Check className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Success!</p>
                  <p className="text-sm">
                    Fixed {result.fixed} recipe(s), {result.skipped} already correct
                  </p>
                </div>
              </div>

              {result.details.fixed.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold text-sm mb-2">Fixed Recipes:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {result.details.fixed.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-sm text-green-800">
                  ✓ You can now access your recipes from the Recipe Instructions page
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
