'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportMergedData } from '@/lib/data'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function EditMode() {
  const [copied, setCopied] = useState(false)

  const handleCopyJSON = async () => {
    const jsonData = await exportMergedData()
    navigator.clipboard.writeText(jsonData)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <CardHeader>
        <CardTitle className="text-yellow-800 dark:text-yellow-200">
          Edit Mode Active
        </CardTitle>
        <CardDescription className="text-yellow-700 dark:text-yellow-300">
          Changes made are stored locally in your browser. Export JSON to commit changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Any modifications you make to text fields will be saved to localStorage. To make
            these changes permanent, click the button below to copy the merged JSON, then send
            it to operations for commit.
          </p>
          <Button onClick={handleCopyJSON} variant="outline" className="w-full sm:w-auto">
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Merged JSON
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

