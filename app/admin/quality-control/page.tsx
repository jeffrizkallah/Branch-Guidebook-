'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
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
  Settings2,
  MessageSquare,
  Send,
  Loader2,
  CheckCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { QualityImportModal } from '@/components/QualityImportModal'
import { QualityAnalytics } from '@/components/QualityAnalytics'
import { QualityCheckDetailModal } from '@/components/QualityCheckDetailModal'
import { FeedbackTrackingWidget } from '@/components/FeedbackTrackingWidget'

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
  todayCompliance: {
    branchSlug: string
    branchName: string
    breakfastSubmitted: boolean
    lunchSubmitted: boolean
    breakfastCount: number
    lunchCount: number
    totalSubmissions: number
  }[]
  averageScores: {
    taste: number
    appearance: number
  }
  bySection: any[]
  recentSubmissions: any[]
  lowScores: any[]
}

interface Feedback {
  id: number
  qualityCheckId: number
  feedbackText: string
  feedbackBy: number
  feedbackByName: string
  feedbackByRole: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export default function QualityControlPage() {
  const { data: session } = useSession()
  const [summary, setSummary] = useState<QualitySummary | null>(null)
  const [submissions, setSubmissions] = useState<QualityCheck[]>([])
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'analytics'>('overview')
  const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const [sortField, setSortField] = useState<'date' | 'branch' | 'product' | 'section' | 'taste' | 'appearance' | 'status'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState({
    branch: '',
    section: '',
    mealService: '',
    period: 'today',
    search: '',
    date: '',
    product: ''
  })
  const [activeColumnFilter, setActiveColumnFilter] = useState<'date' | 'branch' | 'product' | null>(null)
  
  // Feedback state
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const userRole = session?.user?.role
  const canGiveFeedback = ['admin', 'regional_manager', 'operations_lead'].includes(userRole || '')

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

      // Fetch summary (this uses period filter for overview stats)
      const summaryRes = await fetch(`/api/quality-checks/summary?period=${filters.period}`)
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setSummary(summaryData)
      }

      // Fetch all submissions without date restriction
      // This ensures all dates appear in the filter dropdown
      // Users can then filter by specific dates using the column header filter
      const submissionsRes = await fetch(
        `/api/quality-checks?limit=1000`
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

  // Feedback functions
  const fetchFeedback = useCallback(async (qualityCheckId: number) => {
    setFeedbackLoading(true)
    try {
      const response = await fetch(`/api/quality-checks/${qualityCheckId}/feedback`)
      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback || [])
      }
    } catch (err) {
      console.error('Error fetching feedback:', err)
    } finally {
      setFeedbackLoading(false)
    }
  }, [])

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || !selectedCheck) return

    setSendingFeedback(true)
    try {
      const response = await fetch(`/api/quality-checks/${selectedCheck.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackText: feedbackText.trim() })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send feedback')
      }

      setFeedbackText('')
      setFeedbackSuccess(true)
      setTimeout(() => setFeedbackSuccess(false), 3000)
      
      // Refresh feedback list
      await fetchFeedback(selectedCheck.id)
    } catch (err) {
      console.error('Error sending feedback:', err)
      alert(err instanceof Error ? err.message : 'Failed to send feedback')
    } finally {
      setSendingFeedback(false)
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(dateString).toLocaleDateString()
  }

  // Fetch feedback when selectedCheck changes
  useEffect(() => {
    if (selectedCheck) {
      fetchFeedback(selectedCheck.id)
      setShowFeedbackPanel(false)
      setFeedbackText('')
    } else {
      setFeedback([])
    }
  }, [selectedCheck, fetchFeedback])

  // Get unique values for column filters
  const uniqueBranches = Array.from(new Set(submissions.map(s => s.branchSlug)))
    .map(slug => {
      const sub = submissions.find(s => s.branchSlug === slug)
      return { slug, name: sub?.branchName || slug }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const uniqueProducts = Array.from(new Set(submissions.map(s => s.productName)))
    .sort((a, b) => a.localeCompare(b))

  const uniqueDates = Array.from(new Set(submissions.map(s => 
    new Date(s.submissionDate).toLocaleDateString()
  ))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  const filteredSubmissions = submissions.filter(s => {
    if (filters.branch && s.branchSlug !== filters.branch) return false
    if (filters.section && s.section !== filters.section) return false
    if (filters.mealService && s.mealService !== filters.mealService) return false
    if (filters.search && !s.productName.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.date && new Date(s.submissionDate).toLocaleDateString() !== filters.date) return false
    if (filters.product && s.productName !== filters.product) return false
    return true
  })

  // Sorting logic
  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    let aValue: any, bValue: any

    switch (sortField) {
      case 'date':
        aValue = new Date(a.submissionDate).getTime()
        bValue = new Date(b.submissionDate).getTime()
        break
      case 'branch':
        aValue = a.branchName.toLowerCase()
        bValue = b.branchName.toLowerCase()
        break
      case 'product':
        aValue = a.productName.toLowerCase()
        bValue = b.productName.toLowerCase()
        break
      case 'section':
        aValue = a.section.toLowerCase()
        bValue = b.section.toLowerCase()
        break
      case 'taste':
        aValue = a.tasteScore
        bValue = b.tasteScore
        break
      case 'appearance':
        aValue = a.appearanceScore
        bValue = b.appearanceScore
        break
      case 'status':
        aValue = a.status.toLowerCase()
        bValue = b.status.toLowerCase()
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Pagination calculations
  const totalPages = Math.ceil(sortedSubmissions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSubmissions = sortedSubmissions.slice(startIndex, endIndex)

  // Handle sort column click
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to descending
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  // Sort indicator component
  const SortIndicator = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  // Column filter header component
  const ColumnFilterHeader = ({ 
    field, 
    label, 
    filterKey, 
    options,
    currentValue
  }: { 
    field: typeof sortField
    label: string
    filterKey: 'date' | 'branch' | 'product'
    options: { value: string; label: string }[]
    currentValue: string
  }) => {
    const isActive = activeColumnFilter === filterKey
    const hasFilter = currentValue !== ''
    
    return (
      <th className="text-left p-2 md:p-3 text-xs md:text-sm font-medium relative whitespace-nowrap">
        <div className="flex items-center gap-1">
          <button
            className="column-filter-trigger flex items-center gap-1 hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setActiveColumnFilter(isActive ? null : filterKey)
            }}
          >
            {label}
            <Filter className={cn(
              "h-3 w-3 transition-colors flex-shrink-0",
              hasFilter ? "text-primary fill-primary" : "text-muted-foreground"
            )} />
          </button>
        </div>
        
        {/* Dropdown */}
        {isActive && (
          <div className="column-filter-dropdown absolute top-full left-0 mt-1 z-50 bg-background border rounded-lg shadow-lg min-w-[200px] max-h-[300px] overflow-y-auto">
            <div className="p-2 border-b">
              <button
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors flex items-center justify-between"
                onClick={() => {
                  setFilters({ ...filters, [filterKey]: '' })
                  setActiveColumnFilter(null)
                }}
              >
                <span>All {label}s</span>
                {!hasFilter && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            </div>
            <div className="p-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors flex items-center justify-between"
                  onClick={() => {
                    setFilters({ ...filters, [filterKey]: option.value })
                    setActiveColumnFilter(null)
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {currentValue === option.value && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </th>
    )
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters.branch, filters.section, filters.mealService, filters.search, filters.period, filters.date, filters.product])

  // Close column filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.column-filter-dropdown') && !target.closest('.column-filter-trigger')) {
        setActiveColumnFilter(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-100">
              <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Quality Control</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Monitor and manage food quality checks</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              className="border rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-background"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
            <Link href="/admin/quality-control/fields">
              <Button variant="outline" size="sm" className="text-xs md:text-sm">
                <Settings2 className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden md:inline">Form Fields</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => setShowImportModal(true)}>
              <Download className="h-3.5 w-3.5 md:h-4 md:w-4 rotate-180 md:mr-2" />
              <span className="hidden md:inline">Import</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={exportToCSV}>
              <Download className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden md:inline">Export</span>
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
                  {summary.todayCompliance.map((branch) => (
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
                      <div className="flex-1">
                        <p className="font-medium text-sm">{branch.branchName}</p>
                        <div className="flex gap-2 mt-1">
                          <span className={cn(
                            "text-xs flex items-center gap-1",
                            branch.breakfastSubmitted ? "text-green-600" : "text-gray-400"
                          )}>
                            <Coffee className="h-3 w-3" />
                            {branch.breakfastSubmitted ? `✓ (${branch.breakfastCount})` : '-'}
                          </span>
                          <span className={cn(
                            "text-xs flex items-center gap-1",
                            branch.lunchSubmitted ? "text-green-600" : "text-gray-400"
                          )}>
                            <Sun className="h-3 w-3" />
                            {branch.lunchSubmitted ? `✓ (${branch.lunchCount})` : '-'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {branch.breakfastSubmitted && branch.lunchSubmitted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-amber-500" />
                        )}
                        {branch.totalSubmissions > 0 && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {branch.totalSubmissions} total
                          </span>
                        )}
                      </div>
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
                      <button
                        key={item.id}
                        onClick={() => setSelectedSubmissionId(item.id)}
                        className="w-full flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <div className="text-left">
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
                      </button>
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

            {/* Feedback Tracking Widget */}
            {canGiveFeedback && (
              <FeedbackTrackingWidget 
                onViewQualityCheck={(id) => setSelectedSubmissionId(id)}
              />
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            {/* Stats Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50 rounded-lg">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <span className="font-medium text-blue-900">
                  {sortedSubmissions.length === 0 
                    ? 'Showing 0 of 0 submissions'
                    : `Showing ${startIndex + 1}-${Math.min(endIndex, sortedSubmissions.length)} of ${sortedSubmissions.length} submissions`
                  }
                </span>
                {sortedSubmissions.length !== submissions.length && (
                  <span className="text-blue-600">
                    (filtered from {submissions.length} total)
                  </span>
                )}
                <span className="text-muted-foreground hidden md:inline">
                  Sorted by: {sortField} {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 md:gap-3 p-3 md:p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 flex-1 min-w-[150px] max-w-[200px]">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="border rounded px-2 py-1 text-xs md:text-sm w-full"
                />
              </div>
              <select
                value={filters.section}
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                className="border rounded px-2 py-1 text-xs md:text-sm bg-background"
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
                className="border rounded px-2 py-1 text-xs md:text-sm bg-background"
              >
                <option value="">All Meals</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
              </select>
            </div>

            {/* Active Filters */}
            {(filters.date || filters.branch || filters.product) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {filters.date && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Date: {filters.date}
                    <button 
                      onClick={() => setFilters({ ...filters, date: '' })}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.branch && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Branch: {uniqueBranches.find(b => b.slug === filters.branch)?.name || filters.branch}
                    <button 
                      onClick={() => setFilters({ ...filters, branch: '' })}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.product && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Product: {filters.product}
                    <button 
                      onClick={() => setFilters({ ...filters, product: '' })}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={() => setFilters({ ...filters, date: '', branch: '', product: '' })}
                  className="text-sm text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Table */}
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-muted/50">
                  <tr>
                    <ColumnFilterHeader
                      field="date"
                      label="Date/Time"
                      filterKey="date"
                      options={uniqueDates.map(d => ({ value: d, label: d }))}
                      currentValue={filters.date}
                    />
                    <ColumnFilterHeader
                      field="branch"
                      label="Branch"
                      filterKey="branch"
                      options={uniqueBranches.map(b => ({ value: b.slug, label: b.name }))}
                      currentValue={filters.branch}
                    />
                    <ColumnFilterHeader
                      field="product"
                      label="Product"
                      filterKey="product"
                      options={uniqueProducts.map(p => ({ value: p, label: p }))}
                      currentValue={filters.product}
                    />
                    <th 
                      className="text-left p-2 md:p-3 text-xs md:text-sm font-medium cursor-pointer hover:bg-muted transition-colors select-none whitespace-nowrap"
                      onClick={() => handleSort('section')}
                    >
                      Section <SortIndicator field="section" />
                    </th>
                    <th 
                      className="text-center p-2 md:p-3 text-xs md:text-sm font-medium cursor-pointer hover:bg-muted transition-colors select-none whitespace-nowrap"
                      onClick={() => handleSort('taste')}
                    >
                      Taste <SortIndicator field="taste" />
                    </th>
                    <th 
                      className="text-center p-2 md:p-3 text-xs md:text-sm font-medium cursor-pointer hover:bg-muted transition-colors select-none whitespace-nowrap"
                      onClick={() => handleSort('appearance')}
                    >
                      Appearance <SortIndicator field="appearance" />
                    </th>
                    <th className="text-center p-2 md:p-3 text-xs md:text-sm font-medium whitespace-nowrap">
                      Photo
                    </th>
                    <th 
                      className="text-center p-2 md:p-3 text-xs md:text-sm font-medium cursor-pointer hover:bg-muted transition-colors select-none whitespace-nowrap"
                      onClick={() => handleSort('status')}
                    >
                      Status <SortIndicator field="status" />
                    </th>
                    <th className="text-center p-2 md:p-3 text-xs md:text-sm font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubmissions.map((check) => (
                    <tr key={check.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">
                        <div>{new Date(check.submissionDate).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(check.submissionDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="p-2 md:p-3 text-xs md:text-sm">
                        <div className="max-w-[120px] md:max-w-none truncate">{check.branchName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {check.mealService === 'breakfast' ? (
                            <Coffee className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <Sun className="h-3 w-3 flex-shrink-0" />
                          )}
                          {check.mealService}
                        </div>
                      </td>
                      <td className="p-2 md:p-3 text-xs md:text-sm font-medium max-w-[120px] md:max-w-none truncate">{check.productName}</td>
                      <td className="p-2 md:p-3 text-xs md:text-sm whitespace-nowrap">{check.section}</td>
                      <td className="p-2 md:p-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
                          check.tasteScore <= 2 ? "bg-red-100 text-red-700" :
                          check.tasteScore <= 3 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        )}>
                          <Star className="h-3 w-3" /> {check.tasteScore}
                        </span>
                      </td>
                      <td className="p-2 md:p-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
                          check.appearanceScore <= 2 ? "bg-red-100 text-red-700" :
                          check.appearanceScore <= 3 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        )}>
                          <Eye className="h-3 w-3" /> {check.appearanceScore}
                        </span>
                      </td>
                      <td className="p-2 md:p-3 text-center">
                        {check.photos && check.photos.length > 0 ? (
                          <button
                            onClick={() => setSelectedCheck(check)}
                            className="relative group"
                          >
                            <img 
                              src={check.photos[0]} 
                              alt={check.productName}
                              className="w-12 h-12 md:w-20 md:h-20 rounded-lg object-cover border hover:ring-2 hover:ring-primary transition-all"
                            />
                            {check.photos.length > 1 && (
                              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                {check.photos.length}
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">
                            <ImageIcon className="h-4 w-4 mx-auto opacity-30" />
                          </span>
                        )}
                      </td>
                      <td className="p-2 md:p-3 text-center">
                        <Badge variant={
                          check.status === 'reviewed' ? 'default' :
                          check.status === 'flagged' ? 'destructive' : 'secondary'
                        } className="text-xs whitespace-nowrap">
                          {check.status}
                        </Badge>
                      </td>
                      <td className="p-2 md:p-3 text-center">
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
              {sortedSubmissions.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No quality checks found for the selected filters.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 p-3 md:p-4 bg-muted/50 rounded-lg">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs md:text-sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Previous</span>
                </Button>

                <div className="flex items-center gap-1 md:gap-2">
                  {/* Show page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "w-8 h-8 md:w-10 md:h-10 rounded-lg text-xs md:text-sm font-medium transition-colors",
                          currentPage === pageNum
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted"
                        )}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs md:text-sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <QualityAnalytics 
            startDate={(() => {
              const today = new Date()
              let start = new Date()
              if (filters.period === 'today') {
                start = new Date(today.setHours(0, 0, 0, 0))
              } else if (filters.period === 'week') {
                start.setDate(start.getDate() - 7)
              } else {
                start.setDate(start.getDate() - 30)
              }
              return start.toISOString()
            })()}
            endDate={new Date().toISOString()}
            period={filters.period}
          />
        )}

        {/* Import Modal */}
        {showImportModal && (
          <QualityImportModal 
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              setShowImportModal(false)
              fetchData() // Refresh data after import
            }}
          />
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
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Photos
                    </p>
                    <div className="space-y-3">
                      {selectedCheck.photos.map((photo, i) => (
                        <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={photo} 
                            alt={`Photo ${i + 1}`}
                            className="w-full rounded-lg border hover:opacity-90 hover:ring-2 hover:ring-primary transition-all"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback Section */}
                {canGiveFeedback && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-orange-500" />
                        Feedback to Submitter
                      </p>
                      <Button
                        variant={showFeedbackPanel ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setShowFeedbackPanel(!showFeedbackPanel)}
                      >
                        {showFeedbackPanel ? 'Hide' : 'Give Feedback'}
                      </Button>
                    </div>

                    {/* Previous Feedback */}
                    {feedbackLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                      </div>
                    ) : feedback.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {feedback.map((fb) => (
                          <div 
                            key={fb.id} 
                            className="p-3 bg-orange-50 rounded-lg border border-orange-200"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                                {fb.feedbackByName.charAt(0)}
                              </div>
                              <span className="text-xs font-medium">{fb.feedbackByName}</span>
                              <span className="text-xs text-muted-foreground">• {formatRelativeTime(fb.createdAt)}</span>
                              {fb.isRead && (
                                <CheckCheck className="h-3.5 w-3.5 text-green-500 ml-auto" />
                              )}
                            </div>
                            <p className="text-sm text-gray-700">{fb.feedbackText}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Feedback Input Panel */}
                    {showFeedbackPanel && (
                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-3">
                        {feedbackSuccess && (
                          <div className="p-2 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Feedback sent to {selectedCheck.submitterName}!
                          </div>
                        )}
                        <p className="text-xs text-orange-700">
                          Send improvement suggestions to <strong>{selectedCheck.submitterName}</strong>
                        </p>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Share how this could be improved..."
                          className="w-full p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          rows={3}
                          maxLength={2000}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {feedbackText.length}/2000
                          </span>
                          <Button
                            onClick={handleSendFeedback}
                            disabled={!feedbackText.trim() || sendingFeedback}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {sendingFeedback ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            Send Feedback
                          </Button>
                        </div>
                      </div>
                    )}
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

        {/* Quality Check Detail Modal */}
        <QualityCheckDetailModal
          submissionId={selectedSubmissionId}
          onClose={() => setSelectedSubmissionId(null)}
        />
      </div>
  )
}

