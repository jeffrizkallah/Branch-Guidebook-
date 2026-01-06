'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardCheck,
  Calendar,
  Filter,
  Download,
  Eye,
  Star,
  Coffee,
  Sun,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Thermometer,
  Scale,
  Building2,
  TrendingUp,
  BarChart3,
  Users,
  X,
  Image as ImageIcon,
  Settings2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface QualityCheck {
  id: number
  branchSlug: string
  branchName: string
  submitterName: string
  submissionDate: string
  mealService: string
  productName: string
  section: string
  tasteScore: number
  appearanceScore: number
  portionQtyGm: number
  tempCelsius: number
  tasteNotes: string | null
  portionNotes: string | null
  appearanceNotes: string | null
  remarks: string | null
  correctiveActionTaken: boolean
  correctiveActionNotes: string | null
  photos: string[]
  customFields: Record<string, { value: any; notes: string | null }> | null
  status: string
  adminNotes: string | null
}

interface FieldConfig {
  id: number
  fieldKey: string
  label: string
  fieldType: string
  isRequired: boolean
  isActive: boolean
  sortOrder: number
  section: 'core' | 'custom'
}

interface QualitySummary {
  totalSubmissions: number
  complianceRate: number
  completedBranches: any[]
  pendingBranches: any[]
  todayCompliance: any[]
  averageScores: {
    taste: number
    appearance: number
  }
  bySection: any[]
  recentSubmissions: any[]
  lowScores: any[]
}

export default function QualityControlPage() {
  const [summary, setSummary] = useState<QualitySummary | null>(null)
  const [submissions, setSubmissions] = useState<QualityCheck[]>([])
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'analytics'>('overview')
  const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null)
  const [filters, setFilters] = useState({
    branch: '',
    section: '',
    mealService: '',
    period: 'today',
    search: ''
  })

  useEffect(() => {
    fetchData()
  }, [filters.period])

  const fetchData = async () => {
    try {
      // Fetch field configs
      const fieldsRes = await fetch('/api/quality-checks/fields?activeOnly=false')
      if (fieldsRes.ok) {
        const fieldsData = await fieldsRes.json()
        setFieldConfigs(fieldsData)
      }

      // Fetch summary
      const summaryRes = await fetch(`/api/quality-checks/summary?period=${filters.period}`)
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setSummary(summaryData)
      }

      // Fetch all submissions
      const today = new Date()
      let startDate = new Date()
      if (filters.period === 'today') {
        startDate = new Date(today.setHours(0, 0, 0, 0))
      } else if (filters.period === 'week') {
        startDate.setDate(startDate.getDate() - 7)
      } else {
        startDate.setDate(startDate.getDate() - 30)
      }

      const submissionsRes = await fetch(
        `/api/quality-checks?startDate=${startDate.toISOString()}&limit=100`
      )
      if (submissionsRes.ok) {
        const data = await submissionsRes.json()
        setSubmissions(data)
      }
    } catch (error) {
      console.error('Error fetching quality data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (id: number, status: string, adminNotes?: string) => {
    try {
      await fetch(`/api/quality-checks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes })
      })
      fetchData()
      setSelectedCheck(null)
    } catch (error) {
      console.error('Error updating quality check:', error)
    }
  }

  const filteredSubmissions = submissions.filter(s => {
    if (filters.branch && s.branchSlug !== filters.branch) return false
    if (filters.section && s.section !== filters.section) return false
    if (filters.mealService && s.mealService !== filters.mealService) return false
    if (filters.search && !s.productName.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const exportToCSV = () => {
    const headers = ['Date', 'Branch', 'Meal', 'Product', 'Section', 'Taste', 'Appearance', 'Portion(g)', 'Temp(°C)', 'Remarks']
    const rows = filteredSubmissions.map(s => [
      new Date(s.submissionDate).toLocaleString(),
      s.branchName,
      s.mealService,
      s.productName,
      s.section,
      s.tasteScore,
      s.appearanceScore,
      s.portionQtyGm,
      s.tempCelsius,
      s.remarks || ''
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quality-checks-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading quality control data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-100">
              <ClipboardCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Quality Control</h1>
              <p className="text-sm text-muted-foreground">Monitor and manage food quality checks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
            <Link href="/admin/quality-control/fields">
              <Button variant="outline">
                <Settings2 className="h-4 w-4 mr-2" />
                Form Fields
              </Button>
            </Link>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b">
          {(['overview', 'submissions', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && summary && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Total Checks</span>
                  </div>
                  <p className="text-2xl font-bold">{summary.totalSubmissions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-muted-foreground">Compliance</span>
                  </div>
                  <p className="text-2xl font-bold">{summary.complianceRate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">Avg Taste</span>
                  </div>
                  <p className="text-2xl font-bold">{summary.averageScores.taste}/5</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Avg Appearance</span>
                  </div>
                  <p className="text-2xl font-bold">{summary.averageScores.appearance}/5</p>
                </CardContent>
              </Card>
            </div>

            {/* Today's Compliance Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Branch Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {summary.todayCompliance.map((branch: any) => (
                    <div 
                      key={branch.branchSlug}
                      className={cn(
                        "p-3 rounded-lg border flex items-center justify-between",
                        branch.breakfastSubmitted && branch.lunchSubmitted
                          ? "bg-green-50 border-green-200"
                          : branch.breakfastSubmitted || branch.lunchSubmitted
                          ? "bg-blue-50 border-blue-200"
                          : "bg-amber-50 border-amber-200"
                      )}
                    >
                      <div>
                        <p className="font-medium text-sm">{branch.branchName}</p>
                        <div className="flex gap-2 mt-1">
                          <span className={cn(
                            "text-xs flex items-center gap-1",
                            branch.breakfastSubmitted ? "text-green-600" : "text-gray-400"
                          )}>
                            <Coffee className="h-3 w-3" />
                            {branch.breakfastSubmitted ? '✓' : '-'}
                          </span>
                          <span className={cn(
                            "text-xs flex items-center gap-1",
                            branch.lunchSubmitted ? "text-green-600" : "text-gray-400"
                          )}>
                            <Sun className="h-3 w-3" />
                            {branch.lunchSubmitted ? '✓' : '-'}
                          </span>
                        </div>
                      </div>
                      {branch.breakfastSubmitted && branch.lunchSubmitted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Low Scores Alert */}
            {summary.lowScores.length > 0 && (
              <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Low Score Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary.lowScores.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">{item.branchName}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            Taste: {item.tasteScore}/5
                          </Badge>
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            Look: {item.appearanceScore}/5
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* By Section */}
            {summary.bySection.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    By Section
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {summary.bySection.map((section: any) => (
                      <div key={section.section} className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="font-medium">{section.section}</p>
                        <p className="text-2xl font-bold">{section.count}</p>
                        <p className="text-xs text-muted-foreground">
                          Taste: {section.avgTaste} | Look: {section.avgAppearance}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-40"
                />
              </div>
              <select
                value={filters.section}
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All Sections</option>
                <option value="Hot">Hot</option>
                <option value="Cold">Cold</option>
                <option value="Bakery">Bakery</option>
                <option value="Beverages">Beverages</option>
              </select>
              <select
                value={filters.mealService}
                onChange={(e) => setFilters({ ...filters, mealService: e.target.value })}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All Meals</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
              </select>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Date/Time</th>
                    <th className="text-left p-3 text-sm font-medium">Branch</th>
                    <th className="text-left p-3 text-sm font-medium">Product</th>
                    <th className="text-left p-3 text-sm font-medium">Section</th>
                    <th className="text-center p-3 text-sm font-medium">Taste</th>
                    <th className="text-center p-3 text-sm font-medium">Appearance</th>
                    <th className="text-center p-3 text-sm font-medium">Status</th>
                    <th className="text-center p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((check) => (
                    <tr key={check.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 text-sm">
                        <div>{new Date(check.submissionDate).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(check.submissionDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div>{check.branchName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {check.mealService === 'breakfast' ? (
                            <Coffee className="h-3 w-3" />
                          ) : (
                            <Sun className="h-3 w-3" />
                          )}
                          {check.mealService}
                        </div>
                      </td>
                      <td className="p-3 text-sm font-medium">{check.productName}</td>
                      <td className="p-3 text-sm">{check.section}</td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                          check.tasteScore <= 2 ? "bg-red-100 text-red-700" :
                          check.tasteScore <= 3 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        )}>
                          <Star className="h-3 w-3" /> {check.tasteScore}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                          check.appearanceScore <= 2 ? "bg-red-100 text-red-700" :
                          check.appearanceScore <= 3 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        )}>
                          <Eye className="h-3 w-3" /> {check.appearanceScore}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={
                          check.status === 'reviewed' ? 'default' :
                          check.status === 'flagged' ? 'destructive' : 'secondary'
                        } className="text-xs">
                          {check.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedCheck(check)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSubmissions.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No quality checks found for the selected filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Analytics charts coming soon</p>
            <p className="text-sm">Trends, comparisons, and insights</p>
          </div>
        )}

        {/* Detail Modal */}
        {selectedCheck && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
                <h2 className="font-semibold text-lg">Quality Check Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCheck(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 space-y-4">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="font-medium">{selectedCheck.branchName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted By</p>
                    <p className="font-medium">{selectedCheck.submitterName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {new Date(selectedCheck.submissionDate).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Meal Service</p>
                    <p className="font-medium capitalize flex items-center gap-1">
                      {selectedCheck.mealService === 'breakfast' ? (
                        <Coffee className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                      {selectedCheck.mealService}
                    </p>
                  </div>
                </div>

                {/* Product */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="text-xl font-bold">{selectedCheck.productName}</p>
                  <Badge variant="outline" className="mt-1">{selectedCheck.section}</Badge>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Taste Score</span>
                    </div>
                    <p className="text-3xl font-bold text-yellow-700">{selectedCheck.tasteScore}/5</p>
                    {selectedCheck.tasteNotes && (
                      <p className="text-sm mt-2 text-yellow-800">{selectedCheck.tasteNotes}</p>
                    )}
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Appearance Score</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-700">{selectedCheck.appearanceScore}/5</p>
                    {selectedCheck.appearanceNotes && (
                      <p className="text-sm mt-2 text-blue-800">{selectedCheck.appearanceNotes}</p>
                    )}
                  </div>
                </div>

                {/* Measurements */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Scale className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Portion</p>
                      <p className="font-medium">{selectedCheck.portionQtyGm}g</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Thermometer className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Temperature</p>
                      <p className="font-medium">{selectedCheck.tempCelsius}°C</p>
                    </div>
                  </div>
                </div>

                {/* Custom Fields */}
                {selectedCheck.customFields && Object.keys(selectedCheck.customFields).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Additional Fields</p>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedCheck.customFields).map(([key, field]) => {
                        const config = fieldConfigs.find(f => f.fieldKey === key)
                        if (!config) return null
                        
                        return (
                          <div key={key} className="flex items-center gap-3 p-3 border rounded-lg">
                            <Star className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">{config.label}</p>
                              <p className="font-medium">
                                {config.fieldType === 'rating' ? `${field.value}/5` : 
                                 config.fieldType === 'checkbox' ? (field.value ? 'Yes' : 'No') :
                                 field.value}
                              </p>
                              {field.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{field.notes}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                {selectedCheck.remarks && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Remarks</p>
                    <p className="text-sm">{selectedCheck.remarks}</p>
                  </div>
                )}

                {/* Corrective Action */}
                {selectedCheck.correctiveActionTaken && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium mb-1 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Corrective Action Taken
                    </p>
                    {selectedCheck.correctiveActionNotes && (
                      <p className="text-sm">{selectedCheck.correctiveActionNotes}</p>
                    )}
                  </div>
                )}

                {/* Photos */}
                {selectedCheck.photos && selectedCheck.photos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Photos
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedCheck.photos.map((photo, i) => (
                        <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={photo} 
                            alt={`Photo ${i + 1}`}
                            className="w-full h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleReview(selectedCheck.id, 'reviewed')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Reviewed
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReview(selectedCheck.id, 'flagged')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Flag for Review
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}

