'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopNav } from '@/components/TopNav'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PinProtection } from '@/components/PinProtection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  Package,
  Clock,
  Printer,
  Download,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import type { Dispatch, BranchDispatch, DispatchItem } from '@/lib/data'

interface ReportPageProps {
  params: {
    id: string
  }
  searchParams: {
    print?: string
  }
}

export default function DispatchReportPage({ params, searchParams }: ReportPageProps) {
  const [dispatch, setDispatch] = useState<Dispatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterIssueType, setFilterIssueType] = useState<'all' | 'missing' | 'damaged' | 'partial'>('all')
  const router = useRouter()
  const isPrintMode = searchParams.print === '1'

  useEffect(() => {
    fetchDispatch()
  }, [params.id])

  const fetchDispatch = async () => {
    try {
      const response = await fetch('/api/dispatch')
      const dispatches = await response.json()
      const foundDispatch = dispatches.find((d: Dispatch) => d.id === params.id)
      setDispatch(foundDispatch || null)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dispatch:', error)
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    if (!dispatch) return
    
    // Create CSV export
    let csv = 'Branch Name,Item Name,Ordered Qty,Received Qty,Unit,Issue Type,Notes,Status,Received By\n'
    
    dispatch.branchDispatches.forEach(bd => {
      bd.items.forEach(item => {
        const shouldInclude = filterIssueType === 'all' 
          ? item.issue !== null 
          : item.issue === filterIssueType
        
        if (shouldInclude) {
          csv += `"${bd.branchName}","${item.name}",${item.orderedQty},${item.receivedQty || 0},"${item.unit}","${item.issue || 'none'}","${item.notes}","${bd.status}","${bd.receivedBy || ''}"\n`
        }
      })
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dispatch-report-${dispatch.deliveryDate}.csv`
    a.click()
  }

  if (loading) {
    return (
      <PinProtection>
        <div className="min-h-screen flex flex-col">
          <TopNav />
          <main className="flex-1 container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-pulse" />
              <p className="text-muted-foreground">Loading dispatch report...</p>
            </div>
          </main>
          <Footer />
        </div>
      </PinProtection>
    )
  }

  if (!dispatch) {
    return (
      <PinProtection>
        <div className="min-h-screen flex flex-col">
          <TopNav />
          <main className="flex-1 container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Dispatch not found</h3>
              <p className="text-muted-foreground mb-4">The requested dispatch could not be found</p>
              <Link href="/dispatch">
                <Button>Back to Dispatch Dashboard</Button>
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </PinProtection>
    )
  }

  // Calculate statistics
  const totalBranches = dispatch.branchDispatches.length
  const completedBranches = dispatch.branchDispatches.filter(bd => bd.status === 'completed').length
  const pendingBranches = dispatch.branchDispatches.filter(bd => bd.status === 'pending').length
  const inProgressBranches = dispatch.branchDispatches.filter(bd => bd.status === 'receiving').length

  // Issue statistics
  const allItems = dispatch.branchDispatches.flatMap(bd => 
    bd.items.map(item => ({ ...item, branchName: bd.branchName, branchSlug: bd.branchSlug }))
  )
  const itemsWithIssues = allItems.filter(item => item.issue !== null)
  const missingItems = itemsWithIssues.filter(item => item.issue === 'missing')
  const damagedItems = itemsWithIssues.filter(item => item.issue === 'damaged')
  const partialItems = itemsWithIssues.filter(item => item.issue === 'partial')
  const branchesWithIssues = dispatch.branchDispatches.filter(bd => 
    bd.items.some(item => item.issue !== null)
  )

  // Filtered items based on issue type
  const filteredBranchesWithIssues = dispatch.branchDispatches
    .map(bd => ({
      ...bd,
      items: bd.items.filter(item => 
        filterIssueType === 'all' 
          ? item.issue !== null 
          : item.issue === filterIssueType
      )
    }))
    .filter(bd => bd.items.length > 0)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getIssueTypeBadge = (issueType: 'missing' | 'damaged' | 'partial') => {
    const config = {
      missing: { color: 'bg-red-500', label: 'Missing', icon: XCircle },
      damaged: { color: 'bg-orange-500', label: 'Damaged', icon: AlertTriangle },
      partial: { color: 'bg-yellow-500', label: 'Partial', icon: TrendingDown }
    }
    const { color, label, icon: Icon } = config[issueType]
    return (
      <Badge className={`${color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string, label: string, icon: any }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending', icon: Clock },
      receiving: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'In Progress', icon: Package },
      completed: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Completed', icon: CheckCircle2 },
    }
    const config = variants[status] || variants.pending
    const Icon = config.icon
    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <PinProtection>
      <div className="min-h-screen flex flex-col">
        {!isPrintMode && <TopNav />}
        
        {/* Print Header */}
        {isPrintMode && (
          <div className="print-only bg-white p-6 border-b">
            <h1 className="text-2xl font-bold">Mikana - Dispatch Report</h1>
            <p className="text-sm text-muted-foreground">
              Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        )}
        
        <main className="flex-1 container mx-auto px-4 py-8">
          {!isPrintMode && (
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Dispatch', href: '/dispatch' },
                { label: 'Report' },
              ]}
            />
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">Dispatch Report</h1>
                <p className="text-lg text-muted-foreground">
                  Delivery Date: {formatDate(dispatch.deliveryDate)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Created: {formatDate(dispatch.createdDate)} by {dispatch.createdBy}
                </p>
              </div>
              {!isPrintMode && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Link href="/dispatch">
                    <Button variant="outline" className="flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-3xl font-bold">{totalBranches}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Branches</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {completedBranches} completed • {pendingBranches} pending
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <div className="text-3xl font-bold text-red-600">{itemsWithIssues.length}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Issues</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Across {branchesWithIssues.length} branches
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <div className="text-3xl font-bold text-red-500">{missingItems.length}</div>
                  <div className="text-sm text-muted-foreground mt-1">Missing Items</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Not received at all
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingDown className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <div className="text-3xl font-bold text-yellow-600">{partialItems.length}</div>
                  <div className="text-sm text-muted-foreground mt-1">Partial Deliveries</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {damagedItems.length} damaged items
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Issue Type Filter */}
          {itemsWithIssues.length > 0 && !isPrintMode && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Filter by Issue Type:</span>
                  <div className="flex gap-2">
                    <Button
                      variant={filterIssueType === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterIssueType('all')}
                    >
                      All Issues ({itemsWithIssues.length})
                    </Button>
                    <Button
                      variant={filterIssueType === 'missing' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterIssueType('missing')}
                    >
                      Missing ({missingItems.length})
                    </Button>
                    <Button
                      variant={filterIssueType === 'damaged' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterIssueType('damaged')}
                    >
                      Damaged ({damagedItems.length})
                    </Button>
                    <Button
                      variant={filterIssueType === 'partial' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterIssueType('partial')}
                    >
                      Partial ({partialItems.length})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Issues by Branch */}
          {itemsWithIssues.length > 0 ? (
            <div className="space-y-6 mb-6">
              <h2 className="text-2xl font-bold">Issues by Branch</h2>
              
              {filteredBranchesWithIssues.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        No {filterIssueType !== 'all' ? filterIssueType : ''} issues found
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredBranchesWithIssues.map(bd => (
                  <Card key={bd.branchSlug} className="border-l-4 border-l-red-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            {bd.branchName}
                            {getStatusBadge(bd.status)}
                          </CardTitle>
                          <div className="text-sm text-muted-foreground mt-2">
                            {bd.receivedBy && (
                              <>
                                Received by: <span className="font-medium">{bd.receivedBy}</span>
                                {bd.receivedAt && <> at {formatTime(bd.receivedAt)}</>}
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-lg px-4 py-2">
                          {bd.items.length} Issue{bd.items.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Issues Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3 font-medium">Item Name</th>
                              <th className="text-center p-3 font-medium">Ordered</th>
                              <th className="text-center p-3 font-medium">Received</th>
                              <th className="text-center p-3 font-medium">Unit</th>
                              <th className="text-center p-3 font-medium">Issue Type</th>
                              <th className="text-left p-3 font-medium">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bd.items.map(item => (
                              <tr key={item.id} className="border-t hover:bg-muted/50">
                                <td className="p-3 font-medium">{item.name}</td>
                                <td className="p-3 text-center">{item.orderedQty}</td>
                                <td className="p-3 text-center">
                                  <span className={item.receivedQty !== item.orderedQty ? 'text-red-600 font-semibold' : ''}>
                                    {item.receivedQty || 0}
                                  </span>
                                </td>
                                <td className="p-3 text-center text-sm text-muted-foreground">{item.unit}</td>
                                <td className="p-3 text-center">
                                  {item.issue && getIssueTypeBadge(item.issue)}
                                </td>
                                <td className="p-3 text-sm">
                                  {item.notes || <span className="text-muted-foreground italic">No notes</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Overall Branch Notes */}
                      {bd.overallNotes && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="font-medium text-sm mb-1">Overall Branch Notes:</div>
                          <div className="text-sm">{bd.overallNotes}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Issues Reported</h3>
                  <p className="text-muted-foreground">
                    All items were received successfully across all branches!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Branches Status */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">All Branches Status</h2>
            
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dispatch.branchDispatches.map(bd => {
                    const issueCount = bd.items.filter(item => item.issue !== null).length
                    return (
                      <div
                        key={bd.branchSlug}
                        className={`p-4 border rounded-lg ${
                          issueCount > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold">{bd.branchName}</div>
                          {getStatusBadge(bd.status)}
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="text-muted-foreground">
                            {bd.items.length} items total
                          </div>
                          {issueCount > 0 ? (
                            <div className="text-red-600 font-medium">
                              ⚠️ {issueCount} issue{issueCount > 1 ? 's' : ''}
                            </div>
                          ) : (
                            <div className="text-green-600 font-medium">
                              ✓ No issues
                            </div>
                          )}
                          {bd.receivedBy && (
                            <div className="text-xs text-muted-foreground mt-2">
                              By: {bd.receivedBy}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {!isPrintMode && <Footer />}
      </div>
    </PinProtection>
  )
}

