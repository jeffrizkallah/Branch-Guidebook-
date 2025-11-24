'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Clock, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react'
import type { Dispatch, BranchDispatch } from '@/lib/data'

interface BranchDispatchesProps {
  branchSlug: string
}

export function BranchDispatches({ branchSlug }: BranchDispatchesProps) {
  const [dispatches, setDispatches] = useState<Array<Dispatch & { branchDispatch: BranchDispatch }>>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'dispatched' | 'completed'>('pending')

  useEffect(() => {
    fetchDispatches()
  }, [branchSlug])

  const fetchDispatches = async () => {
    try {
      const response = await fetch('/api/dispatch')
      const allDispatches: Dispatch[] = await response.json()
      
      // Filter dispatches for this branch
      const branchDispatches = allDispatches
        .map(dispatch => {
          const branchDispatch = dispatch.branchDispatches.find(
            bd => bd.branchSlug === branchSlug
          )
          if (branchDispatch) {
            return {
              ...dispatch,
              branchDispatch
            }
          }
          return null
        })
        .filter(d => d !== null) as Array<Dispatch & { branchDispatch: BranchDispatch }>
      
      // Sort by delivery date, most recent first
      branchDispatches.sort((a, b) => 
        new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
      )
      
      setDispatches(branchDispatches)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dispatches:', error)
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const pendingDispatches = dispatches.filter(
    d => d.branchDispatch.status === 'pending' || d.branchDispatch.status === 'packing'
  )
  
  const dispatchedDispatches = dispatches.filter(
    d => d.branchDispatch.status === 'dispatched' || d.branchDispatch.status === 'receiving'
  )
  
  const completedDispatches = dispatches.filter(
    d => d.branchDispatch.status === 'completed'
  )

  const currentDispatches = activeTab === 'pending' 
    ? pendingDispatches 
    : activeTab === 'dispatched'
    ? dispatchedDispatches
    : completedDispatches

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Dispatches & Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading dispatches...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 py-3 md:px-6 md:py-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
          <Package className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <span className="break-words">Dispatches & Deliveries</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3 md:px-6 md:py-4">
        {/* Tabs */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1">
          <Button
            variant={activeTab === 'pending' ? "default" : "outline"}
            onClick={() => setActiveTab('pending')}
            size="sm"
            className="flex-1 min-w-[85px] text-xs sm:text-sm px-2 sm:px-3"
          >
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="whitespace-nowrap">Pending ({pendingDispatches.length})</span>
          </Button>
          <Button
            variant={activeTab === 'dispatched' ? "default" : "outline"}
            onClick={() => setActiveTab('dispatched')}
            size="sm"
            className="flex-1 min-w-[100px] text-xs sm:text-sm px-2 sm:px-3"
          >
            <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="whitespace-nowrap">Dispatched ({dispatchedDispatches.length})</span>
          </Button>
          <Button
            variant={activeTab === 'completed' ? "default" : "outline"}
            onClick={() => setActiveTab('completed')}
            size="sm"
            className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 sm:px-3"
          >
            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="whitespace-nowrap">Done ({completedDispatches.length})</span>
          </Button>
        </div>

        {/* Dispatch List */}
        <div className="space-y-3">
          {currentDispatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <div>
                {activeTab === 'pending' 
                  ? 'No pending dispatches' 
                  : activeTab === 'dispatched'
                  ? 'No dispatched items to receive'
                  : 'No completed dispatches yet'
                }
              </div>
            </div>
          ) : (
            currentDispatches.map(dispatch => {
              const bd = dispatch.branchDispatch
              const issuesCount = bd.items.filter(item => item.issue !== null).length
              const isCompleted = bd.status === 'completed'
              const isPacking = bd.status === 'packing'
              const isDispatched = bd.status === 'dispatched'
              const isReceiving = bd.status === 'receiving'
              
              // Get button text based on status
              let buttonText = 'Open Checklist'
              let buttonIcon = Package
              if (bd.status === 'pending') {
                buttonText = 'Start Packing'
                buttonIcon = Package
              } else if (isPacking) {
                buttonText = 'Continue Packing'
                buttonIcon = Package
              } else if (isDispatched) {
                buttonText = 'Start Receiving'
                buttonIcon = Package
              } else if (isReceiving) {
                buttonText = 'Continue Receiving'
                buttonIcon = Package
              } else if (isCompleted) {
                buttonText = 'View Details'
                buttonIcon = ChevronRight
              }
              
              const ButtonIcon = buttonIcon
              
              return (
                <div 
                  key={dispatch.id} 
                  className={`border rounded-lg p-3 sm:p-4 min-w-0 ${
                    isCompleted ? 'border-l-4 border-l-green-500' :
                    isDispatched || isReceiving ? 'border-l-4 border-l-orange-500' :
                    'border-l-4 border-l-blue-500'
                  }`}
                >
                  <div className="flex flex-col gap-2 mb-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {bd.status === 'pending' && (
                          <Badge variant="secondary" className="flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                            📋 Ready to Pack
                          </Badge>
                        )}
                        {isPacking && (
                          <Badge variant="default" className="flex items-center gap-1 bg-blue-600 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                            🔄 Packing
                          </Badge>
                        )}
                        {(isDispatched || isReceiving) && (
                          <Badge variant="secondary" className="flex items-center gap-1 bg-orange-600 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                            📦 Ready to Receive
                          </Badge>
                        )}
                        {issuesCount > 0 && (
                          <Badge variant="destructive" className="flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                            <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {issuesCount} Issue{issuesCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="font-semibold text-sm sm:text-base md:text-lg break-words">
                        Delivery: {formatDate(dispatch.deliveryDate)}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                        {bd.items.length} items
                        {bd.packedBy && ` • Packed by ${bd.packedBy}`}
                        {bd.receivedBy && ` • Received by ${bd.receivedBy}`}
                      </div>
                    </div>
                  </div>

                  {/* Progress for packing/receiving */}
                  {!isCompleted && (
                    <div className="mb-3 min-w-0">
                      <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                        {isPacking || bd.status === 'pending' ? (
                          <>{bd.items.filter(item => item.packedChecked).length}/{bd.items.length} items packed</>
                        ) : (
                          <>{bd.items.filter(item => item.receivedChecked).length}/{bd.items.length} items received</>
                        )}
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 sm:h-2">
                        <div 
                          className="bg-primary rounded-full h-1.5 sm:h-2 transition-all"
                          style={{ 
                            width: `${isPacking || bd.status === 'pending' 
                              ? (bd.items.filter(item => item.packedChecked).length / bd.items.length) * 100
                              : (bd.items.filter(item => item.receivedChecked).length / bd.items.length) * 100
                            }%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <Link href={`/dispatch/${dispatch.id}/branch/${branchSlug}`} className="block">
                    <Button 
                      className="w-full text-xs sm:text-sm"
                      variant={isCompleted ? "outline" : "default"}
                      size="sm"
                    >
                      <ButtonIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      <span className="truncate">{buttonText}</span>
                    </Button>
                  </Link>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

