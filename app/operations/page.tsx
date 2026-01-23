'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QualityCheckDetailModal } from '@/components/QualityCheckDetailModal'
import {
  ChefHat,
  Flame,
  Factory,
  Building2,
  BarChart3,
  Package,
  ArrowRight,
  Clock,
  Users,
  LogOut,
  Bell,
  Settings,
  FileText,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Settings2,
  Eye,
  Star,
  Coffee,
  Sun,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'

interface DashboardStats {
  recipes: number
  instructions: number
  schedules: number
  branches: number
}

interface QualitySummary {
  totalSubmissions: number
  complianceRate: number
  todayCompliance: {
    branchSlug: string
    branchName: string
    breakfastSubmitted: boolean
    lunchSubmitted: boolean
    breakfastCount: number
    lunchCount: number
    totalSubmissions: number
  }[]
  lowScores: {
    id: number
    productName: string
    branchName: string
    tasteScore: number
    appearanceScore: number
  }[]
}

export default function OperationsDashboardPage() {
  const { user, loading: authLoading, canAccess } = useAuth({ 
    required: true, 
    allowedRoles: ['admin', 'operations_lead'] 
  })
  const [stats, setStats] = useState<DashboardStats>({
    recipes: 0,
    instructions: 0,
    schedules: 0,
    branches: 0
  })
  const [qualitySummary, setQualitySummary] = useState<QualitySummary | null>(null)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchQualitySummary()
  }, [])

  const fetchQualitySummary = async () => {
    try {
      const response = await fetch('/api/quality-checks/summary?period=today')
      if (response.ok) {
        const data = await response.json()
        setQualitySummary(data)
      }
    } catch (error) {
      console.error('Failed to fetch quality summary:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const [recipesRes, instructionsRes, branchesRes] = await Promise.all([
        fetch('/api/recipes'),
        fetch('/api/recipe-instructions'),
        fetch('/api/branches')
      ])

      const recipes = await recipesRes.json()
      const instructions = await instructionsRes.json()
      const branches = await branchesRes.json()

      setStats({
        recipes: Array.isArray(recipes) ? recipes.length : 0,
        instructions: Array.isArray(instructions) ? instructions.length : 0,
        schedules: 0, // Will be updated when we have schedules API
        branches: Array.isArray(branches) ? branches.filter((b: any) => b.branchType !== 'production').length : 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <RoleSidebar />

      <main className="flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0">
        <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.firstName}!
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Recipe Instructions</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.recipes}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600">
                    <ChefHat className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reheating Instructions</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.instructions}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                    <Flame className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Schedules</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.schedules}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Branches</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.branches}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quality Control Live Widget */}
          {qualitySummary && (
            <Card className="border-l-4 border-l-green-500 mb-8">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-green-600" />
                    Quality Control Today
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Link href="/admin/quality-control/fields">
                      <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                        <Settings2 className="h-3 w-3" />
                        Fields
                      </Button>
                    </Link>
                    <Link href="/admin/quality-control">
                      <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                        View All
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">{qualitySummary.totalSubmissions}</p>
                    <p className="text-xs text-green-600">Submissions</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700">{qualitySummary.complianceRate}%</p>
                    <p className="text-xs text-blue-600">Compliance</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-700">
                      {qualitySummary.todayCompliance.filter(b => b.breakfastSubmitted || b.lunchSubmitted).length}
                    </p>
                    <p className="text-xs text-emerald-600">Branches Done</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-700">
                      {qualitySummary.todayCompliance.filter(b => !b.breakfastSubmitted && !b.lunchSubmitted).length}
                    </p>
                    <p className="text-xs text-amber-600">Pending</p>
                  </div>
                </div>

                {/* Branch compliance grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {qualitySummary.todayCompliance.slice(0, 12).map((branch) => (
                    <div 
                      key={branch.branchSlug}
                      className={`
                        flex flex-col p-2 rounded-lg text-xs
                        ${branch.breakfastSubmitted && branch.lunchSubmitted
                          ? 'bg-green-50 border border-green-200'
                          : branch.breakfastSubmitted || branch.lunchSubmitted
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-amber-50 border border-amber-200'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate flex-1">{branch.branchName}</span>
                        {branch.totalSubmissions > 0 && (
                          <span className="text-xs font-bold text-primary ml-1">
                            {branch.totalSubmissions}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded ${branch.breakfastSubmitted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          <Coffee className="h-3 w-3" />
                          {branch.breakfastSubmitted && <span className="text-[10px]">{branch.breakfastCount}</span>}
                        </div>
                        <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded ${branch.lunchSubmitted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          <Sun className="h-3 w-3" />
                          {branch.lunchSubmitted && <span className="text-[10px]">{branch.lunchCount}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Low scores alert */}
                {qualitySummary.lowScores.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-700 flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Low Score Alerts ({qualitySummary.lowScores.length})
                    </p>
                    <div className="space-y-1">
                      {qualitySummary.lowScores.slice(0, 3).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedSubmissionId(item.id)}
                          className="w-full text-left text-xs text-red-600 hover:text-red-800 hover:bg-red-100 p-1 rounded transition-colors"
                        >
                          {item.productName} at {item.branchName} - Taste: {item.tasteScore}/5, Look: {item.appearanceScore}/5
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Management Section */}
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Content Management
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Recipe Instructions */}
              <Link href="/admin/recipe-instructions">
                <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500/10 to-teal-500/5 text-teal-600 group-hover:scale-110 transition-transform duration-300">
                        <ChefHat className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">Recipe Instructions</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Full recipes for Central Kitchen with cooking instructions
                        </p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {stats.recipes} recipes
                        </Badge>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Reheating Instructions */}
              <Link href="/admin/reheating-instructions">
                <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                        <Flame className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">Reheating Instructions</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Reheating & assembly instructions for branches
                        </p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {stats.instructions} instructions
                        </Badge>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Production Schedules */}
              <Link href="/admin/production-schedules">
                <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 text-orange-600 group-hover:scale-110 transition-transform duration-300">
                        <Factory className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">Production Schedules</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Weekly production plans for Central Kitchen
                        </p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Weekly plans
                        </Badge>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Quick Access Section */}
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Quick Access
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* All Branches */}
              <Link href="/">
                <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 text-cyan-600 group-hover:scale-110 transition-transform duration-300">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">All Branches</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          View all branch information and details
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Future: Branch Orders Section */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-dashed">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Branch Orders</h3>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review and approve weekly orders from branches. Generate production schedules automatically.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Footer />
      </main>

      {/* Quality Check Detail Modal */}
      <QualityCheckDetailModal
        submissionId={selectedSubmissionId}
        onClose={() => setSelectedSubmissionId(null)}
      />
    </div>
  )
}

