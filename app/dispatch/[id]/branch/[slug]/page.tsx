'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  Save,
  XCircle
} from 'lucide-react'
import type { BranchDispatch, DispatchItem, Branch } from '@/lib/data'

interface ReceivingPageProps {
  params: {
    id: string
    slug: string
  }
}

export default function ReceivingChecklistPage({ params }: ReceivingPageProps) {
  const [branchDispatch, setBranchDispatch] = useState<BranchDispatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [receivedBy, setReceivedBy] = useState('')
  const [packedBy, setPackedBy] = useState('')
  const [overallNotes, setOverallNotes] = useState('')
  const router = useRouter()
  
  // Determine mode based on status
  const mode = branchDispatch?.status === 'pending' || branchDispatch?.status === 'packing' 
    ? 'packing' 
    : 'receiving'

  const [branch, setBranch] = useState<Branch | null>(null)

  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        const found = data.find((b: Branch) => b.slug === params.slug)
        setBranch(found || null)
      })
      .catch(console.error)
  }, [params.slug])

  useEffect(() => {
    fetchDispatch()
  }, [params.id, params.slug])

  const fetchDispatch = async () => {
    try {
      const response = await fetch('/api/dispatch')
      const dispatches = await response.json()
      
      const dispatch = dispatches.find((d: any) => d.id === params.id)
      if (dispatch) {
        const bd = dispatch.branchDispatches.find((bd: any) => bd.branchSlug === params.slug)
        if (bd) {
          setBranchDispatch(bd)
          setPackedBy(bd.packedBy || '')
          setReceivedBy(bd.receivedBy || '')
          setOverallNotes(bd.overallNotes || '')
        }
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dispatch:', error)
      setLoading(false)
    }
  }

  const handleItemCheck = (itemId: string, checked: boolean) => {
    if (!branchDispatch) return

    const updatedItems = branchDispatch.items.map(item => {
      if (item.id === itemId) {
        if (mode === 'packing') {
          return {
            ...item,
            packedChecked: checked,
            // Keep existing packedQty if set (e.g., partial), otherwise use orderedQty when checked
            packedQty: checked ? (item.packedQty ?? item.orderedQty) : null,
            // Don't clear issue - allow packing with issues (e.g., partial pack but still packed)
            issue: item.issue
          }
        } else {
          return {
            ...item,
            receivedChecked: checked,
            // Keep existing receivedQty if set (e.g., partial), otherwise use packedQty/orderedQty when checked
            receivedQty: checked ? (item.receivedQty ?? item.packedQty ?? item.orderedQty) : null,
            // Don't clear issue - allow receiving with issues (e.g., received but damaged)
            issue: item.issue
          }
        }
      }
      return item
    })

    setBranchDispatch({
      ...branchDispatch,
      items: updatedItems
    })
  }

  const handleIssue = (itemId: string, issue: 'missing' | 'damaged' | 'partial' | 'shortage' | null) => {
    if (!branchDispatch) return

    const updatedItems = branchDispatch.items.map(item => {
      if (item.id === itemId) {
        if (mode === 'packing') {
          return {
            ...item,
            issue,
            // Reset expectedVariance when issue is cleared or changed to non-partial
            expectedVariance: issue === 'partial' ? item.expectedVariance : undefined,
            // Keep packedChecked state independent - don't auto-uncheck when issue is set
            packedChecked: item.packedChecked,
            // Only auto-set quantity for missing (0) or when clearing issue (full qty)
            packedQty: issue === 'missing' ? 0 : (issue === null ? item.orderedQty : item.packedQty)
          }
        } else {
          return {
            ...item,
            issue,
            // Reset expectedVariance when issue is cleared or changed to non-partial
            expectedVariance: issue === 'partial' ? item.expectedVariance : undefined,
            // Keep receivedChecked state independent - don't auto-uncheck when issue is set
            receivedChecked: item.receivedChecked,
            // Only auto-set quantity for missing (0) or when clearing issue (full qty)
            receivedQty: issue === 'missing' ? 0 : (issue === null ? (item.packedQty || item.orderedQty) : item.receivedQty)
          }
        }
      }
      return item
    })

    setBranchDispatch({
      ...branchDispatch,
      items: updatedItems
    })
  }

  const handleQuantityChange = (itemId: string, qty: string) => {
    if (!branchDispatch) return

    const numQty = parseFloat(qty) || 0

    const updatedItems = branchDispatch.items.map(item => {
      if (item.id === itemId) {
        if (mode === 'packing') {
          return {
            ...item,
            packedQty: numQty
          }
        } else {
          return {
            ...item,
            receivedQty: numQty
          }
        }
      }
      return item
    })

    setBranchDispatch({
      ...branchDispatch,
      items: updatedItems
    })
  }

  const handleNotes = (itemId: string, notes: string) => {
    if (!branchDispatch) return

    const updatedItems = branchDispatch.items.map(item => {
      if (item.id === itemId) {
        return { ...item, notes }
      }
      return item
    })

    setBranchDispatch({
      ...branchDispatch,
      items: updatedItems
    })
  }

  const handleExpectedVariance = (itemId: string, isExpected: boolean) => {
    if (!branchDispatch) return

    const updatedItems = branchDispatch.items.map(item => {
      if (item.id === itemId) {
        return { ...item, expectedVariance: isExpected }
      }
      return item
    })

    setBranchDispatch({
      ...branchDispatch,
      items: updatedItems
    })
  }

  const saveProgress = async () => {
    if (!branchDispatch) return

    setSaving(true)
    
    try {
      const updateData: any = {
        branchSlug: params.slug,
        items: branchDispatch.items,
        overallNotes,
      }
      
      if (mode === 'packing') {
        updateData.status = 'packing'
        if (!branchDispatch.packingStartedAt) {
          updateData.packingStartedAt = new Date().toISOString()
        }
      } else {
        updateData.status = 'receiving'
        if (!branchDispatch.receivingStartedAt) {
          updateData.receivingStartedAt = new Date().toISOString()
        }
      }
      
      await fetch(`/api/dispatch/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      alert('✓ Progress saved successfully!')
      setSaving(false)
    } catch (error) {
      alert('Error saving progress. Please try again.')
      setSaving(false)
    }
  }

  const completeDispatch = async () => {
    if (!branchDispatch) return
    
    if (mode === 'packing') {
      // Completing packing
      if (!packedBy.trim()) {
        alert('Please enter the name of the person packing this dispatch')
        return
      }

      const uncheckedItems = branchDispatch.items.filter(item => !item.packedChecked)
      if (uncheckedItems.length > 0) {
        const confirm = window.confirm(
          `${uncheckedItems.length} items are not checked yet. Do you want to complete packing anyway?`
        )
        if (!confirm) return
      }

      setSaving(true)
      
      try {
        await fetch(`/api/dispatch/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchSlug: params.slug,
            items: branchDispatch.items,
            packedBy,
            packingStartedAt: branchDispatch.packingStartedAt || new Date().toISOString(),
            packingCompletedAt: new Date().toISOString(),
            overallNotes,
            status: 'dispatched'
          })
        })
        
        alert('✅ Packing completed! Dispatch is now ready for delivery.')
        router.push(`/branch/${params.slug}`)
      } catch (error) {
        alert('Error completing packing. Please try again.')
        setSaving(false)
      }
    } else {
      // Completing receiving
      if (!receivedBy.trim()) {
        alert('Please enter the name of the person receiving this dispatch')
        return
      }

      const uncheckedItems = branchDispatch.items.filter(item => !item.receivedChecked && item.issue === null)
      if (uncheckedItems.length > 0) {
        const confirm = window.confirm(
          `${uncheckedItems.length} items are not checked yet. Do you want to complete anyway?`
        )
        if (!confirm) return
      }

      setSaving(true)
      
      try {
        await fetch(`/api/dispatch/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchSlug: params.slug,
            items: branchDispatch.items,
            receivedBy,
            receivingStartedAt: branchDispatch.receivingStartedAt || new Date().toISOString(),
            receivedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            overallNotes,
            status: 'completed'
          })
        })
        
        alert('✅ Dispatch completed successfully!')
        router.push(`/branch/${params.slug}`)
      } catch (error) {
        alert('Error completing dispatch. Please try again.')
        setSaving(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <div>Loading dispatch...</div>
        </div>
      </div>
    )
  }

  if (!branchDispatch || !branch) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <div className="text-xl font-semibold mb-2">Dispatch not found</div>
          <Link href={`/branch/${params.slug}`}>
            <Button>Return to Branch</Button>
          </Link>
        </div>
      </div>
    )
  }

  const checkedCount = mode === 'packing' 
    ? branchDispatch.items.filter(item => item.packedChecked).length
    : branchDispatch.items.filter(item => item.receivedChecked).length
  const totalCount = branchDispatch.items.length
  const progressPercent = Math.round((checkedCount / totalCount) * 100)
  const issuesCount = branchDispatch.items.filter(item => item.issue !== null).length

  const isCompleted = branchDispatch.status === 'completed'

  return (
    <div className="flex min-h-screen">
      <RoleSidebar />
      
      <main className="flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0">
        <div className="flex-1 container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-4xl">
          <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: branch.name, href: `/branch/${params.slug}` },
            { label: 'Receiving Checklist' },
          ]}
        />

        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Link href={`/branch/${params.slug}`}>
            <Button variant="ghost" size="sm" className="mb-3 md:mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Branch
            </Button>
          </Link>
          
          <div className="flex items-start justify-between gap-3 mb-3 md:mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">
                {mode === 'packing' ? '📋 Packing Checklist' : '📦 Receiving Checklist'}
              </h1>
              <p className="text-sm md:text-lg text-muted-foreground truncate">{branch.name}</p>
              {mode === 'receiving' && branchDispatch.packedBy && (
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                  Packed by: {branchDispatch.packedBy}
                </p>
              )}
            </div>
            {isCompleted && (
              <Badge className="flex items-center gap-1 md:gap-2 text-xs md:text-base px-2 py-1 md:px-4 md:py-2 shrink-0">
                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden md:inline">Completed</span>
                <span className="md:hidden">✓</span>
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-3 md:mb-4">
            <div className="flex items-center justify-between text-xs md:text-sm mb-1.5 md:mb-2">
              <span className="font-medium">
                Progress: {checkedCount}/{totalCount} items
              </span>
              <span className="text-muted-foreground">{progressPercent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 md:h-3">
              <div 
                className="bg-primary rounded-full h-2 md:h-3 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {issuesCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 md:p-3 flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
              <span className="text-xs md:text-sm font-medium">
                {issuesCount} item{issuesCount > 1 ? 's have' : ' has'} issues
              </span>
            </div>
          )}
        </div>

        {/* Items Checklist */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-xl">
              {mode === 'packing' ? 'Items to Pack' : 'Items to Receive'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:space-y-4">
              {branchDispatch.items.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`border rounded-lg p-2 md:p-4 ${
                    (mode === 'packing' ? item.packedChecked : item.receivedChecked) ? 'bg-green-50 border-green-200' : 
                    item.issue ? 'bg-red-50 border-red-200' : 
                    'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2 md:gap-4">
                    <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-muted text-xs md:text-sm font-semibold shrink-0">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
{/* Item Header - Mobile Optimized */}
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                            <span className="font-semibold text-sm md:text-lg">{item.name}</span>
                                            {item.addedLate && (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                                                ⚡ LATE ADD
                                              </span>
                                            )}
                                          </div>
                                          {item.addedLate && item.addedBy && (
                                            <div className="text-xs text-amber-600 mb-1">
                                              Added by {item.addedBy}
                                              {item.addedReason && ` • ${item.addedReason}`}
                                            </div>
                                          )}
                          
                          {mode === 'packing' ? (
                            <div className="text-xs md:text-sm text-muted-foreground">
                              Ordered: {item.orderedQty} {item.unit}
                            </div>
                          ) : (
                            <div className="text-xs md:text-sm">
                              <div className="flex items-center gap-1 md:gap-2 text-muted-foreground flex-wrap">
                                <span>Ordered: {item.orderedQty}</span>
                                <span>→</span>
                                <span className={item.packedQty !== item.orderedQty ? 'text-orange-600 font-semibold' : ''}>
                                  Packed: {item.packedQty ?? item.orderedQty}
                                </span>
                                <span className="text-xs">({item.unit})</span>
                              </div>
                              {item.packedQty !== null && item.packedQty < item.orderedQty && (
                                <div className="text-xs text-orange-600 mt-1">
                                  ⚠️ Kitchen packed {item.orderedQty - item.packedQty} less than ordered
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {!isCompleted && (
                          <div className="flex items-center gap-1 md:gap-2 shrink-0">
                            <Checkbox
                              checked={mode === 'packing' ? item.packedChecked : item.receivedChecked}
                              onCheckedChange={(checked) => handleItemCheck(item.id, checked as boolean)}
                              className="md:h-5 md:w-5"
                            />
                            <label className="text-xs md:text-sm font-medium cursor-pointer whitespace-nowrap">
                              {mode === 'packing' ? 'Packed' : 'Received'}
                            </label>
                          </div>
                        )}
                        
                        {((mode === 'packing' && item.packedChecked) || (mode === 'receiving' && item.receivedChecked)) && (
                          <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-600 shrink-0" />
                        )}
                      </div>

                      {!isCompleted && (
                        <>
                          {/* Issue Buttons - Compact on Mobile */}
                          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-1.5 md:gap-2 mb-2">
                            <Button
                              size="sm"
                              variant={item.issue === 'missing' ? "destructive" : "outline"}
                              onClick={() => handleIssue(item.id, item.issue === 'missing' ? null : 'missing')}
                              className="text-xs md:text-sm h-8 md:h-9"
                            >
                              Missing
                            </Button>
                            <Button
                              size="sm"
                              variant={item.issue === 'damaged' ? "destructive" : "outline"}
                              onClick={() => handleIssue(item.id, item.issue === 'damaged' ? null : 'damaged')}
                              className="text-xs md:text-sm h-8 md:h-9"
                            >
                              Damaged
                            </Button>
                            <Button
                              size="sm"
                              variant={item.issue === 'partial' ? "destructive" : "outline"}
                              onClick={() => handleIssue(item.id, item.issue === 'partial' ? null : 'partial')}
                              className="text-xs md:text-sm h-8 md:h-9"
                            >
                              Partial
                            </Button>
                          </div>

                          {/* Partial Quantity Input */}
                          {item.issue === 'partial' && (
                            <div className="mb-2 space-y-2">
                              <div>
                                <label className="text-xs md:text-sm font-medium mb-1 block">
                                  {mode === 'packing' ? 'Packed' : 'Received'} Quantity:
                                </label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={(mode === 'packing' ? item.packedQty : item.receivedQty) || ''}
                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                    className="w-24 md:w-32 h-9 text-sm"
                                  />
                                  <span className="text-xs md:text-sm text-muted-foreground">{item.unit}</span>
                                </div>
                              </div>
                              
                              {/* Packaging Constraint Toggle */}
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <label className="text-xs md:text-sm font-medium mb-2 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                                  Is this due to packaging?
                                </label>
                                <div className="flex items-center gap-3 mt-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={item.expectedVariance === false || item.expectedVariance === undefined ? "default" : "outline"}
                                    onClick={() => handleExpectedVariance(item.id, false)}
                                    className={`flex-1 h-9 text-xs ${item.expectedVariance === false || item.expectedVariance === undefined ? 'bg-rose-400 hover:bg-rose-500 border-rose-400 text-white' : ''}`}
                                  >
                                    No - Real Issue
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={item.expectedVariance === true ? "default" : "outline"}
                                    onClick={() => handleExpectedVariance(item.id, true)}
                                    className={`flex-1 h-9 text-xs ${item.expectedVariance === true ? 'bg-amber-400 hover:bg-amber-500 border-amber-400 text-white' : ''}`}
                                  >
                                    Yes - Packaging
                                  </Button>
                                </div>
                                {item.expectedVariance === true && (
                                  <p className="text-xs text-amber-700 mt-2 italic">
                                    ↳ Can't cut items - sent whole units only
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Notes - Collapsible on Mobile */}
                          {(item.notes || item.issue) && (
                            <div>
                              <label className="text-xs md:text-sm font-medium mb-1 block">
                                Notes:
                              </label>
                              <Input
                                placeholder="Add notes..."
                                value={item.notes}
                                onChange={(e) => handleNotes(item.id, e.target.value)}
                                className="text-xs md:text-sm h-9"
                              />
                            </div>
                          )}
                          {!item.notes && !item.issue && (
                            <button 
                              onClick={(e) => {
                                const input = e.currentTarget.nextElementSibling as HTMLInputElement;
                                input?.focus();
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              + Add note
                            </button>
                          )}
                          {(!item.notes && !item.issue) && (
                            <Input
                              placeholder="Add notes..."
                              value={item.notes}
                              onChange={(e) => handleNotes(item.id, e.target.value)}
                              className="text-xs md:text-sm h-9 mt-1 hidden focus:block"
                              onBlur={(e) => {
                                if (!e.target.value) {
                                  e.target.classList.add('hidden');
                                }
                              }}
                            />
                          )}
                        </>
                      )}

                      {/* Display issue info if completed */}
                      {isCompleted && item.issue && (
                        <div className="mt-2">
                          <Badge variant="destructive">
                            {item.issue.toUpperCase()}
                            {item.issue === 'partial' && item.receivedQty && 
                              ` - Received: ${item.receivedQty} ${item.unit}`
                            }
                          </Badge>
                          {item.notes && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Note: {item.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Overall Notes & Completion */}
        <Card className="mb-4 md:mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-xl">Overall Notes & Sign-off</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="text-xs md:text-sm font-medium mb-1.5 md:mb-2 block">
                  {mode === 'packing' ? 'Packing Notes:' : 'Delivery Notes:'}
                </label>
                <textarea
                  className="w-full h-20 md:h-24 p-2 md:p-3 border rounded-lg text-sm"
                  placeholder={mode === 'packing' 
                    ? "Any notes about packing..." 
                    : "Any notes about delivery..."}
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  disabled={isCompleted}
                />
              </div>

              {!isCompleted && (
                <div>
                  <label className="text-xs md:text-sm font-medium mb-1.5 md:mb-2 block">
                    {mode === 'packing' ? 'Packed By: *' : 'Received By: *'}
                  </label>
                  <Input
                    placeholder="Enter your name"
                    value={mode === 'packing' ? packedBy : receivedBy}
                    onChange={(e) => mode === 'packing' ? setPackedBy(e.target.value) : setReceivedBy(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
              )}

              {isCompleted && (
                <div className="bg-muted p-3 md:p-4 rounded-lg space-y-2 text-sm">
                  {branchDispatch.packedBy && (
                    <div>
                      <div className="text-xs md:text-sm text-muted-foreground">Packed by:</div>
                      <div className="font-semibold">{branchDispatch.packedBy}</div>
                      {branchDispatch.packingCompletedAt && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(branchDispatch.packingCompletedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                  {branchDispatch.receivedBy && (
                    <div className="mt-2">
                      <div className="text-xs md:text-sm text-muted-foreground">Received by:</div>
                      <div className="font-semibold">{branchDispatch.receivedBy}</div>
                      {branchDispatch.completedAt && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(branchDispatch.completedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {!isCompleted && (
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            <Button 
              onClick={saveProgress} 
              variant="outline"
              disabled={saving}
              className="flex-1 h-10 md:h-auto text-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Progress'}
            </Button>
            <Button 
              onClick={completeDispatch}
              disabled={saving}
              className="flex-1 h-10 md:h-auto text-sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {saving 
                ? 'Completing...' 
                : mode === 'packing' 
                ? 'Complete Packing' 
                : 'Complete Receiving'}
            </Button>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  )
}

