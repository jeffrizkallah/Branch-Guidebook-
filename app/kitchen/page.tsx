'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Factory,
  ChefHat,
  Package,
  Truck,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle2,
  Building2,
  ClipboardList,
  BarChart3,
  Eye,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { QualityControlWidget } from '@/components/QualityControlWidget'
import { InventoryShortageAlertsWidget } from '@/components/kitchen/InventoryShortageAlertsWidget'

interface Dispatch {
  id: string
  deliveryDate: string
  createdDate: string
  branchDispatches: {
    branchSlug: string
    branchName: string
    status: string
    items: any[]
    packedBy?: string
    packedAt?: string
  }[]
}

interface ProductionSchedule {
  scheduleId: string
  weekStart: string
  weekEnd: string
  createdBy: string
  createdAt: string
  days: {
    date: string
    dayName: string
    items: {
      itemId: string
      recipeName: string
      quantity: number
      unit: string
      station: string
      notes: string
      completed: boolean
    }[]
  }[]
}

export default function CentralKitchenDashboard() {
  const { user, loading: authLoading } = useAuth({ 
    required: true, 
    allowedRoles: ['admin', 'operations_lead', 'central_kitchen'] 
  })
  
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [productionSchedules, setProductionSchedules] = useState<ProductionSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalItems: 0,
    pendingBranches: 0,
    packingBranches: 0,
    dispatchedBranches: 0,
    completedBranches: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [dispatchResponse, schedulesResponse] = await Promise.all([
        fetch('/api/dispatch'),
        fetch('/api/production-schedules')
      ])
      
      const dispatchData: Dispatch[] = await dispatchResponse.json()
      const schedulesData: ProductionSchedule[] = await schedulesResponse.json()
      
      // Sort dispatches by delivery date, most recent first
      const sorted = dispatchData.sort((a, b) => 
        new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
      )
      setDispatches(sorted)
      
      // Sort schedules by week start, most recent first
      const sortedSchedules = schedulesData.sort((a, b) => 
        new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      )
      setProductionSchedules(sortedSchedules)

      // Calculate stats
      const allBranchDispatches = dispatchData.flatMap(d => d.branchDispatches)
      setStats({
        totalItems: allBranchDispatches.reduce((sum, bd) => sum + (bd.items?.length || 0), 0),
        pendingBranches: allBranchDispatches.filter(bd => bd.status === 'pending').length,
        packingBranches: allBranchDispatches.filter(bd => bd.status === 'packing').length,
        dispatchedBranches: allBranchDispatches.filter(bd => bd.status === 'dispatched' || bd.status === 'receiving').length,
        completedBranches: allBranchDispatches.filter(bd => bd.status === 'completed').length,
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const getTotalItems = (schedule: ProductionSchedule) => {
    return schedule.days.reduce((acc, day) => acc + day.items.length, 0)
  }

  const getCompletedItems = (schedule: ProductionSchedule) => {
    return schedule.days.reduce((acc, day) => 
      acc + day.items.filter(item => item.completed).length, 0
    )
  }

  const getStatusBadge = (status: string) => {
    const baseClass = "text-[10px] xs:text-xs px-1.5 xs:px-2 py-0.5"
    switch (status) {
      case 'pending':
        return <Badge className={`${baseClass} bg-gray-100 text-gray-700 border-0`}><Clock className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />Pending</Badge>
      case 'packing':
        return <Badge className={`${baseClass} bg-blue-100 text-blue-700 border-0`}><Package className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />Packing</Badge>
      case 'dispatched':
        return <Badge className={`${baseClass} bg-orange-100 text-orange-700 border-0`}><Truck className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />Dispatched</Badge>
      case 'receiving':
        return <Badge className={`${baseClass} bg-purple-100 text-purple-700 border-0`}><Truck className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />Receiving</Badge>
      case 'completed':
        return <Badge className={`${baseClass} bg-green-100 text-green-700 border-0`}><CheckCircle2 className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />Completed</Badge>
      default:
        return <Badge variant="outline" className={baseClass}>{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get today's and upcoming dispatches
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todaysDispatches = dispatches.filter(d => {
    const dispatchDate = new Date(d.deliveryDate)
    dispatchDate.setHours(0, 0, 0, 0)
    return dispatchDate.getTime() === today.getTime()
  })

  const activeDispatches = dispatches.filter(d => 
    d.branchDispatches.some(bd => bd.status !== 'completed')
  )

  if (authLoading || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center space-y-3 xs:space-y-4">
          <div className="animate-spin rounded-full h-6 w-6 xs:h-8 xs:w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-xs xs:text-sm text-muted-foreground">Loading kitchen dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 xs:px-4 py-4 xs:py-6 md:py-8">
      {/* Header */}
      <div className="mb-4 xs:mb-6 md:mb-8">
        <div className="flex items-center gap-2 xs:gap-3">
          <div className="p-1.5 xs:p-2 rounded-lg xs:rounded-xl bg-rose-100 shrink-0">
            <Factory className="h-4 w-4 xs:h-5 xs:w-5 text-rose-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg xs:text-xl sm:text-2xl font-bold text-foreground truncate">Central Kitchen</h1>
            <p className="text-xs xs:text-sm text-muted-foreground truncate">
              Welcome, {user?.firstName}!
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 xs:grid-cols-5 gap-2 xs:gap-3 md:gap-4 mb-4 xs:mb-6 md:mb-8">
        <Card className="bg-gradient-to-br from-rose-50 to-white col-span-3 xs:col-span-1">
          <CardContent className="pt-3 xs:pt-4 md:pt-6 pb-3 xs:pb-4 px-2 xs:px-4">
            <div className="text-center">
              <p className="text-xl xs:text-2xl md:text-3xl font-bold text-rose-600">{stats.totalItems}</p>
              <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 xs:pt-4 md:pt-6 pb-3 xs:pb-4 px-2 xs:px-4">
            <div className="text-center">
              <p className="text-lg xs:text-xl md:text-3xl font-bold text-gray-600">{stats.pendingBranches}</p>
              <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 xs:pt-4 md:pt-6 pb-3 xs:pb-4 px-2 xs:px-4">
            <div className="text-center">
              <p className="text-lg xs:text-xl md:text-3xl font-bold text-blue-600">{stats.packingBranches}</p>
              <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground">Packing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 xs:pt-4 md:pt-6 pb-3 xs:pb-4 px-2 xs:px-4">
            <div className="text-center">
              <p className="text-lg xs:text-xl md:text-3xl font-bold text-orange-600">{stats.dispatchedBranches}</p>
              <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground">Dispatched</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 xs:pt-4 md:pt-6 pb-3 xs:pb-4 px-2 xs:px-4">
            <div className="text-center">
              <p className="text-lg xs:text-xl md:text-3xl font-bold text-green-600">{stats.completedBranches}</p>
              <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automated Inventory Shortage Alerts */}
      <div className="mb-4 xs:mb-6 md:mb-8">
        <InventoryShortageAlertsWidget />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4 mb-4 xs:mb-6 md:mb-8">
        <Link href="/">
          <Card className="hover:shadow-lg transition-all cursor-pointer group h-full active:scale-[0.98]">
            <CardContent className="pt-4 xs:pt-5 md:pt-6 pb-4 xs:pb-5">
              <div className="flex items-center gap-3 xs:gap-4">
                <div className="p-2 xs:p-3 rounded-lg xs:rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 group-hover:scale-110 transition-transform shrink-0">
                  <Building2 className="h-5 w-5 xs:h-6 xs:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm xs:text-base">All Branches</h3>
                  <p className="text-xs xs:text-sm text-muted-foreground mt-0.5 xs:mt-1 line-clamp-1">
                    View all branches for packing
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 xs:h-5 xs:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/branch/central-kitchen/recipes">
          <Card className="hover:shadow-lg transition-all cursor-pointer group h-full active:scale-[0.98]">
            <CardContent className="pt-4 xs:pt-5 md:pt-6 pb-4 xs:pb-5">
              <div className="flex items-center gap-3 xs:gap-4">
                <div className="p-2 xs:p-3 rounded-lg xs:rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 group-hover:scale-110 transition-transform shrink-0">
                  <ChefHat className="h-5 w-5 xs:h-6 xs:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm xs:text-base">CK Recipes</h3>
                  <p className="text-xs xs:text-sm text-muted-foreground mt-0.5 xs:mt-1 line-clamp-1">
                    View cooking recipes and instructions
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 xs:h-5 xs:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Production Schedule Section */}
      <Card className="mb-4 xs:mb-6 md:mb-8 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <CardHeader className="pb-2 xs:pb-3 md:pb-4 px-3 xs:px-4 md:px-6 pt-3 xs:pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-orange-800 text-sm xs:text-base md:text-lg">
            <BarChart3 className="h-4 w-4 xs:h-5 xs:w-5 text-orange-600" />
            Production Schedule
          </CardTitle>
          <p className="text-xs xs:text-sm text-orange-700/80">View and manage the weekly production schedule</p>
        </CardHeader>
        <CardContent className="px-3 xs:px-4 md:px-6 pb-3 xs:pb-4 md:pb-6">
          {productionSchedules.length === 0 ? (
            <div className="text-center py-6 xs:py-8">
              <Calendar className="h-10 w-10 xs:h-12 xs:w-12 text-orange-300 mx-auto mb-2 xs:mb-3" />
              <p className="text-sm xs:text-base text-orange-700/70">No production schedules found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4">
              {productionSchedules.map((schedule) => {
                const totalItems = getTotalItems(schedule)
                const completedItems = getCompletedItems(schedule)
                const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

                return (
                  <Card 
                    key={schedule.scheduleId} 
                    className="bg-white hover:shadow-lg transition-all group overflow-hidden border-orange-100"
                  >
                    <div className="h-1 xs:h-1.5 bg-orange-100">
                      <div 
                        className="h-full bg-orange-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <CardContent className="p-3 xs:p-4">
                      <div className="flex items-start justify-between mb-2 xs:mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold flex items-center gap-1.5 xs:gap-2 text-gray-800 text-sm xs:text-base">
                            <Calendar className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-orange-500 shrink-0" />
                            <span className="truncate">Week of {new Date(schedule.weekStart).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}</span>
                          </h3>
                          <p className="text-xs xs:text-sm text-muted-foreground truncate">
                            {new Date(schedule.weekStart).toLocaleDateString()} - {new Date(schedule.weekEnd).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge 
                          className={`${
                            progress === 100 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          } border-0 text-[10px] xs:text-xs shrink-0 ml-2`}
                        >
                          {progress}%
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs xs:text-sm text-muted-foreground mb-3 xs:mb-4">
                        <p>{schedule.days.length} production days</p>
                        <p>{totalItems} total items</p>
                        <p>{completedItems} completed</p>
                        <p className="text-[10px] xs:text-xs truncate">Created by {schedule.createdBy}</p>
                      </div>

                      <Link href={`/branch/central-kitchen/production-schedule?scheduleId=${schedule.scheduleId}`}>
                        <Button 
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-1.5 xs:gap-2 h-8 xs:h-9 text-xs xs:text-sm"
                          size="sm"
                        >
                          <Eye className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                          View Schedule
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Control Section */}
      <div className="mb-4 xs:mb-6 md:mb-8">
        <QualityControlWidget 
          branchSlug="central-kitchen" 
          branchName="Central Kitchen" 
        />
      </div>

      {/* Today's Dispatches */}
      {todaysDispatches.length > 0 && (
        <Card className="mb-4 xs:mb-6 md:mb-8 border-l-4 border-l-rose-500">
          <CardHeader className="pb-2 xs:pb-3 px-3 xs:px-4 md:px-6 pt-3 xs:pt-4 md:pt-6">
            <CardTitle className="text-sm xs:text-base flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-rose-500" />
              <span className="truncate">Today&apos;s Dispatches - Packing Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 xs:px-4 md:px-6 pb-3 xs:pb-4 md:pb-6">
            <div className="space-y-2 xs:space-y-3">
              {todaysDispatches.flatMap(dispatch =>
                dispatch.branchDispatches.map(bd => (
                  <div 
                    key={`${dispatch.id}-${bd.branchSlug}`}
                    className="flex items-center justify-between p-2 xs:p-3 bg-muted/50 rounded-lg gap-2"
                  >
                    <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
                      <Building2 className="h-4 w-4 xs:h-5 xs:w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm xs:text-base truncate">{bd.branchName}</p>
                        <p className="text-xs xs:text-sm text-muted-foreground">
                          {bd.items?.length || 0} items
                        </p>
                        {bd.packedBy && bd.packedAt && (
                          <p className="text-[10px] xs:text-xs text-muted-foreground mt-0.5 xs:mt-1 truncate">
                            Packed by {bd.packedBy} at {new Date(bd.packedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(bd.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Dispatches */}
      <Card>
        <CardHeader className="pb-2 xs:pb-3 px-3 xs:px-4 md:px-6 pt-3 xs:pt-4 md:pt-6">
          <CardTitle className="text-sm xs:text-base flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-primary" />
            <span className="truncate">All Active Dispatches - Packing Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 xs:px-4 md:px-6 pb-3 xs:pb-4 md:pb-6">
          {activeDispatches.length === 0 ? (
            <div className="text-center py-6 xs:py-8">
              <CheckCircle2 className="h-10 w-10 xs:h-12 xs:w-12 text-green-500 mx-auto mb-2 xs:mb-3" />
              <p className="text-sm xs:text-base text-muted-foreground">All dispatches completed!</p>
            </div>
          ) : (
            <div className="space-y-3 xs:space-y-4">
              {activeDispatches.slice(0, 5).map(dispatch => (
                <div key={dispatch.id} className="border rounded-lg p-2.5 xs:p-3 md:p-4">
                  <div className="mb-2 xs:mb-3">
                    <p className="font-semibold text-sm xs:text-base">
                      Delivery: {formatDate(dispatch.deliveryDate)}
                    </p>
                    <p className="text-xs xs:text-sm text-muted-foreground">
                      {dispatch.branchDispatches.length} branches • {dispatch.branchDispatches.filter(bd => bd.status === 'completed').length} completed
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 xs:gap-2">
                    {dispatch.branchDispatches.slice(0, 4).map(bd => (
                      <div 
                        key={bd.branchSlug}
                        className="p-1.5 xs:p-2 bg-muted/50 rounded"
                      >
                        <p className="font-medium text-xs xs:text-sm truncate">{bd.branchName}</p>
                        <div className="flex items-center justify-between mt-0.5 xs:mt-1 gap-1">
                          <span className="text-[10px] xs:text-xs text-muted-foreground">
                            {bd.items?.length || 0} items
                          </span>
                          {getStatusBadge(bd.status)}
                        </div>
                        {bd.packedBy && (
                          <p className="text-[10px] xs:text-xs text-muted-foreground mt-0.5 xs:mt-1 truncate">
                            By: {bd.packedBy}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {dispatch.branchDispatches.length > 4 && (
                    <p className="text-[10px] xs:text-xs text-muted-foreground mt-1.5 xs:mt-2 text-center">
                      +{dispatch.branchDispatches.length - 4} more branches
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

