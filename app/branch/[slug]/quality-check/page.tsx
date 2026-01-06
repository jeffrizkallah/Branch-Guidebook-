'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { QualityCheckForm } from '@/components/QualityCheckForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { 
  ClipboardCheck, 
  History, 
  CheckCircle2, 
  XCircle,
  Clock,
  ArrowLeft,
  Coffee,
  Sun
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Branch {
  id: string
  slug: string
  name: string
}

interface QualityCheck {
  id: number
  submissionDate: string
  mealService: string
  productName: string
  section: string
  tasteScore: number
  appearanceScore: number
}

export default function QualityCheckPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const { user, loading: authLoading } = useAuth({ 
    required: true, 
    allowedRoles: ['admin', 'operations_lead', 'branch_manager'] 
  })
  
  const [branch, setBranch] = useState<Branch | null>(null)
  const [todayChecks, setTodayChecks] = useState<QualityCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, slug])

  const fetchData = async () => {
    try {
      // Fetch branch info
      const branchRes = await fetch(`/api/branches/${slug}`)
      if (branchRes.ok) {
        const branchData = await branchRes.json()
        setBranch(branchData)
      }

      // Fetch today's quality checks for this branch
      const today = new Date().toISOString().split('T')[0]
      const checksRes = await fetch(`/api/quality-checks?branch=${slug}&startDate=${today}&endDate=${today}`)
      if (checksRes.ok) {
        const checksData = await checksRes.json()
        setTodayChecks(checksData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    fetchData() // Refresh the list
  }

  const hasBreakfastCheck = todayChecks.some(c => c.mealService === 'breakfast')
  const hasLunchCheck = todayChecks.some(c => c.mealService === 'lunch')

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <RoleSidebar />

      <main className="flex-1 flex flex-col pt-16 md:pt-0">
        <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: branch?.name || 'Branch', href: `/branch/${slug}` },
              { label: 'Quality Check' },
            ]}
          />

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-100">
                  <ClipboardCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Quality Check</h1>
                  <p className="text-sm text-muted-foreground">{branch?.name}</p>
                </div>
              </div>
              {!showForm && (
                <Button onClick={() => router.push(`/branch/${slug}`)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
          </div>

          {showForm ? (
            <div>
              <Button 
                variant="ghost" 
                onClick={() => setShowForm(false)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <QualityCheckForm 
                branchSlug={slug}
                branchName={branch?.name || slug}
                onSuccess={handleFormSuccess}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Today's Status */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Today&apos;s Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn(
                      "p-4 rounded-lg flex items-center gap-3",
                      hasBreakfastCheck ? "bg-green-50" : "bg-amber-50"
                    )}>
                      <div className={cn(
                        "p-2 rounded-full",
                        hasBreakfastCheck ? "bg-green-100" : "bg-amber-100"
                      )}>
                        <Coffee className={cn(
                          "h-5 w-5",
                          hasBreakfastCheck ? "text-green-600" : "text-amber-600"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium">Breakfast</p>
                        <p className={cn(
                          "text-sm",
                          hasBreakfastCheck ? "text-green-600" : "text-amber-600"
                        )}>
                          {hasBreakfastCheck ? 'Completed' : 'Pending'}
                        </p>
                      </div>
                      {hasBreakfastCheck ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-amber-500 ml-auto" />
                      )}
                    </div>

                    <div className={cn(
                      "p-4 rounded-lg flex items-center gap-3",
                      hasLunchCheck ? "bg-green-50" : "bg-amber-50"
                    )}>
                      <div className={cn(
                        "p-2 rounded-full",
                        hasLunchCheck ? "bg-green-100" : "bg-amber-100"
                      )}>
                        <Sun className={cn(
                          "h-5 w-5",
                          hasLunchCheck ? "text-green-600" : "text-amber-600"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium">Lunch</p>
                        <p className={cn(
                          "text-sm",
                          hasLunchCheck ? "text-green-600" : "text-amber-600"
                        )}>
                          {hasLunchCheck ? 'Completed' : 'Pending'}
                        </p>
                      </div>
                      {hasLunchCheck ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-amber-500 ml-auto" />
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={() => setShowForm(true)}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Start Quality Check
                  </Button>
                </CardContent>
              </Card>

              {/* Today's Submissions */}
              {todayChecks.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Today&apos;s Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {todayChecks.map((check) => (
                        <div 
                          key={check.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {check.mealService === 'breakfast' ? (
                              <Coffee className="h-4 w-4 text-amber-600" />
                            ) : (
                              <Sun className="h-4 w-4 text-orange-500" />
                            )}
                            <div>
                              <p className="font-medium">{check.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                {check.section} • {new Date(check.submissionDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                              Taste: {check.tasteScore}/5
                            </Badge>
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                              Look: {check.appearanceScore}/5
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
        <Footer />
      </main>
    </div>
  )
}

