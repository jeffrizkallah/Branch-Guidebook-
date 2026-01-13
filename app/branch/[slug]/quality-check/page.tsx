'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { QualityCheckFormQuick } from '@/components/QualityCheckFormQuick'
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
    allowedRoles: ['admin', 'operations_lead', 'branch_manager', 'branch_staff', 'central_kitchen'] 
  })
  
  const [branch, setBranch] = useState<Branch | null>(null)
  const [todayChecks, setTodayChecks] = useState<QualityCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, slug, showForm])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch branch info
      const branchRes = await fetch(`/api/branches/${slug}`, {
        cache: 'no-store'
      })
      if (branchRes.ok) {
        const branchData = await branchRes.json()
        setBranch(branchData)
      }

      // Fetch today's quality checks for this branch
      const today = new Date().toISOString().split('T')[0]
      const apiUrl = `/api/quality-checks?branch=${slug}&startDate=${today}&endDate=${today}`
      console.log('Fetching quality checks from:', apiUrl)
      console.log('Today date:', today)
      
      const checksRes = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      console.log('Response status:', checksRes.status)
      
      if (checksRes.ok) {
        const checksData = await checksRes.json()
        console.log('Fetched quality checks:', checksData)
        console.log('Number of checks:', checksData.length)
        setTodayChecks(checksData)
      } else {
        const errorData = await checksRes.json()
        console.error('Error fetching quality checks:', errorData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = () => {
    console.log('🔄 Form submitted successfully, refreshing data...')
    setShowForm(false)
    // Force immediate refresh
    setTimeout(() => {
      console.log('🔄 Triggering fetchData...')
      fetchData()
    }, 100)
  }

  const breakfastChecks = todayChecks.filter(c => c.mealService === 'breakfast')
  const lunchChecks = todayChecks.filter(c => c.mealService === 'lunch')
  const hasBreakfastCheck = breakfastChecks.length > 0
  const hasLunchCheck = lunchChecks.length > 0

  console.log('Today checks:', todayChecks)
  console.log('Breakfast checks:', breakfastChecks.length, 'Lunch checks:', lunchChecks.length)

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

      <main className="flex-1 flex flex-col pt-14 xs:pt-16 md:pt-0">
        <div className="flex-1 container mx-auto px-3 xs:px-4 py-4 xs:py-6 md:py-8 max-w-4xl">
          <Breadcrumbs
            items={[
              { label: branch?.name || 'Branch', href: `/branch/${slug}` },
              { label: 'Quality Check' },
            ]}
          />

          {/* Header */}
          <div className="mb-4 xs:mb-6">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 xs:gap-2">
              <div className="flex items-center gap-2 xs:gap-3">
                <div className="p-1.5 xs:p-2 rounded-lg xs:rounded-xl bg-green-100 shrink-0">
                  <ClipboardCheck className="h-4 w-4 xs:h-5 xs:w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg xs:text-xl sm:text-2xl font-bold text-foreground">Quality Check</h1>
                  <p className="text-xs xs:text-sm text-muted-foreground truncate">{branch?.name}</p>
                </div>
              </div>
              {!showForm && (
                <div className="flex gap-1.5 xs:gap-2 w-full xs:w-auto shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fetchData()}
                    disabled={loading}
                    className="h-8 xs:h-9 text-xs xs:text-sm px-2 xs:px-3 flex-1 xs:flex-none"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                  <Button 
                    onClick={() => router.push(`/branch/${slug}`)}
                    className="h-8 xs:h-9 text-xs xs:text-sm px-2 xs:px-3 flex-1 xs:flex-none"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 xs:h-4 xs:w-4 mr-1 xs:mr-2" />
                    Back
                  </Button>
                </div>
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
                Back
              </Button>

              <QualityCheckFormQuick 
                branchSlug={slug}
                branchName={branch?.name || slug}
                onSuccess={handleFormSuccess}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="py-4 xs:py-6 px-3 xs:px-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs xs:text-sm text-muted-foreground mb-0.5 xs:mb-1">Total Today</p>
                      <p className="text-2xl xs:text-3xl sm:text-4xl font-bold text-blue-600">{todayChecks.length}</p>
                    </div>
                    <div className="flex gap-3 xs:gap-4 sm:gap-6">
                      <div className="text-center">
                        <div className={cn(
                          "w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-1 xs:mb-2 mx-auto",
                          hasBreakfastCheck ? "bg-green-100" : "bg-gray-100"
                        )}>
                          <Coffee className={cn(
                            "h-5 w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7",
                            hasBreakfastCheck ? "text-green-600" : "text-gray-400"
                          )} />
                        </div>
                        <p className="text-[10px] xs:text-xs font-medium text-muted-foreground">Breakfast</p>
                        <p className="text-sm xs:text-base sm:text-lg font-bold">{breakfastChecks.length}</p>
                      </div>
                      <div className="text-center">
                        <div className={cn(
                          "w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-1 xs:mb-2 mx-auto",
                          hasLunchCheck ? "bg-green-100" : "bg-gray-100"
                        )}>
                          <Sun className={cn(
                            "h-5 w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7",
                            hasLunchCheck ? "text-green-600" : "text-gray-400"
                          )} />
                        </div>
                        <p className="text-[10px] xs:text-xs font-medium text-muted-foreground">Lunch</p>
                        <p className="text-sm xs:text-base sm:text-lg font-bold">{lunchChecks.length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Today's Submissions */}
              {todayChecks.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Today&apos;s Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 xs:space-y-3 mb-4">
                      {todayChecks.map((check) => (
                        <div 
                          key={check.id}
                          className="flex flex-col xs:flex-row xs:items-center justify-between p-2.5 xs:p-3 gap-2 xs:gap-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                            {check.mealService === 'breakfast' ? (
                              <Coffee className="h-4 w-4 xs:h-5 xs:w-5 text-amber-600 shrink-0" />
                            ) : (
                              <Sun className="h-4 w-4 xs:h-5 xs:w-5 text-orange-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm xs:text-base truncate">{check.productName}</p>
                              <p className="text-xs xs:text-sm text-muted-foreground">
                                {check.section} • {new Date(check.submissionDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 xs:gap-2 ml-6 xs:ml-0 shrink-0">
                            <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 text-[10px] xs:text-xs px-1.5 xs:px-2">
                              Taste: {check.tasteScore}/5
                            </Badge>
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-[10px] xs:text-xs px-1.5 xs:px-2">
                              Look: {check.appearanceScore}/5
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <ClipboardCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-muted-foreground">No quality checks submitted yet today</p>
                    <p className="text-sm text-muted-foreground mt-1">Click below to start your first check</p>
                  </CardContent>
                </Card>
              )}

              {/* Start Quality Check Button */}
              <Button 
                onClick={() => setShowForm(true)}
                className="w-full bg-green-600 hover:bg-green-700 h-11 xs:h-12 sm:h-14 text-sm xs:text-base"
                size="lg"
              >
                <ClipboardCheck className="h-4 w-4 xs:h-5 xs:w-5 mr-2" />
                Start Quality Check
              </Button>
            </div>
          )}
        </div>
        <Footer />
      </main>
    </div>
  )
}

