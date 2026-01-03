'use client'

import { useState, useEffect } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Flame, 
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Utensils,
  Scale,
  ChefHat,
  Sparkles,
  MessageSquare
} from 'lucide-react'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PrintHeader } from '@/components/PrintHeader'
import { isCentralKitchen } from '@/lib/data'
import type { RecipeInstruction, Branch } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface RecipeInstructionPageProps {
  params: {
    slug: string
    instructionId: string
  }
}

export default function RecipeInstructionPage({ params }: RecipeInstructionPageProps) {
  const searchParams = useSearchParams()
  const [branch, setBranch] = useState<Branch | null | undefined>(undefined)
  const [instruction, setInstruction] = useState<RecipeInstruction | null | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  const isPrintMode = searchParams.get('print') === '1'

  // Load branch data from API
  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        const found = data.find((b: Branch) => b.slug === params.slug)
        setBranch(found || null)
      })
      .catch(() => setBranch(null))
  }, [params.slug])

  // Redirect Central Kitchen to recipes page
  useEffect(() => {
    if (branch && isCentralKitchen(branch)) {
      window.location.href = `/branch/${branch.slug}/recipes`
    }
  }, [branch])

  // Fetch instruction from API
  useEffect(() => {
    async function fetchInstruction() {
      try {
        const res = await fetch(`/api/recipe-instructions/${params.instructionId}`)
        if (res.ok) {
          const data = await res.json()
          setInstruction(data)
          setFeedback(data.branchManagerFeedback || '')
        } else {
          setInstruction(null)
        }
      } catch (error) {
        console.error('Failed to fetch instruction:', error)
        setInstruction(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchInstruction()
  }, [params.instructionId])

  const handleSubmitFeedback = async () => {
    if (!instruction) return
    
    try {
      const res = await fetch(`/api/recipe-instructions/${instruction.instructionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchManagerFeedback: feedback })
      })
      
      if (res.ok) {
        setFeedbackSubmitted(true)
        setTimeout(() => setFeedbackSubmitted(false), 3000)
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  // Show loading state
  if (branch === undefined || instruction === undefined || isLoading) {
    return (
      <div className={isPrintMode ? "min-h-screen flex flex-col" : "flex min-h-screen"}>
        {!isPrintMode && <RoleSidebar />}
        <main className={isPrintMode ? "flex-1 flex items-center justify-center" : "flex-1 flex flex-col pt-16 md:pt-0 items-center justify-center"}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        {isPrintMode && <Footer />}
      </div>
    )
  }

  // Handle not found
  if (!branch || !instruction) {
    notFound()
  }

  return (
    <div className={isPrintMode ? "min-h-screen flex flex-col" : "flex min-h-screen"}>
      {!isPrintMode && <RoleSidebar />}
      <PrintHeader branchName={`${branch.name} - ${instruction.dishName}`} />

      <main className={isPrintMode ? "flex-1 container mx-auto px-4 py-8" : "flex-1 flex flex-col pt-16 md:pt-0"}>
        <div className={isPrintMode ? "" : "flex-1 container mx-auto px-4 py-8"}>
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: branch.name, href: `/branch/${branch.slug}` },
            { label: 'Recipe Instructions', href: `/branch/${branch.slug}/recipe-instructions` },
            { label: instruction.dishName },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="h-8 w-8 text-orange-500" />
            <h1 className="text-4xl font-bold">{instruction.dishName}</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-4">{instruction.category}</p>
          
          {/* Days Available */}
          <div className="flex items-center flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Available on:</span>
            {instruction.daysAvailable.map((day, index) => (
              <Badge key={index} variant="secondary">
                {day}
              </Badge>
            ))}
          </div>

          {/* Component count badge */}
          <Badge className="bg-orange-500 text-white">
            <Utensils className="h-3 w-3 mr-1" />
            {instruction.components.length} component{instruction.components.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Visual Reference */}
        {instruction.visualPresentation.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Final Presentation Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {instruction.visualPresentation.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`${instruction.dishName} presentation ${index + 1}`}
                    className="w-full aspect-video object-cover rounded-lg border"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Components / Reheating Instructions */}
        <div className="space-y-6 mb-8">
          {instruction.components.map((component, componentIndex) => (
            <Card key={component.componentId} className="overflow-hidden">
              <CardHeader className="bg-secondary border-b border-orange-200/60">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-sm">
                      {componentIndex + 1}
                    </div>
                    <span>{component.subRecipeName}</span>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    <Scale className="h-3 w-3 mr-1" />
                    {component.servingPerPortion} {component.unit} / portion
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Reheating Steps */}
                {component.reheatingSteps.some(step => step.trim()) && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      Reheating / Preparation Steps
                    </h4>
                    <div className="space-y-3">
                      {component.reheatingSteps
                        .filter(step => step.trim())
                        .map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-start gap-3 p-4 rounded-lg bg-secondary border border-orange-200/60">
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-medium text-sm shrink-0">
                              {stepIndex + 1}
                            </div>
                            <p className="text-sm leading-relaxed pt-1">{step}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Quality Control Notes */}
                {component.quantityControlNotes && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      Quality Control Notes
                    </h4>
                    <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                      <p className="text-sm">
                        {component.quantityControlNotes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Presentation Guidelines */}
                {component.presentationGuidelines && (
                  <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Presentation Guidelines
                    </h4>
                    <div className="p-4 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40">
                      <p className="text-sm">
                        {component.presentationGuidelines}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Branch Manager Feedback Section */}
        {!isPrintMode && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Branch Manager Feedback
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Share feedback about these instructions (e.g., steps that need clarification, improvements, etc.)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter your feedback here..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center gap-3">
                  <Button onClick={handleSubmitFeedback}>
                    Submit Feedback
                  </Button>
                  {feedbackSubmitted && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Feedback saved!
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Print Button */}
        {!isPrintMode && (
          <div className="flex justify-center gap-4">
            <Link href={`/branch/${branch.slug}/recipe-instructions/${instruction.instructionId}?print=1`} target="_blank">
              <Button variant="outline" size="lg">
                <Printer className="h-4 w-4 mr-2" />
                Print Instruction Card
              </Button>
            </Link>
          </div>
        )}
        </div>
        {!isPrintMode && <Footer />}
      </main>
      {isPrintMode && <Footer />}
    </div>
  )
}

