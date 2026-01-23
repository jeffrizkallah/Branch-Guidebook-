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
    switch (status) {
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-700 border-0"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'packing':
        return <Badge className="bg-blue-100 text-blue-700 border-0"><Package className="h-3 w-3 mr-1" />Packing</Badge>
      case 'dispatched':
        return <Badge className="bg-orange-100 text-orange-700 border-0"><Truck className="h-3 w-3 mr-1" />Dispatched</Badge>
      case 'receiving':
        return <Badge className="bg-purple-100 text-purple-700 border-0"><Truck className="h-3 w-3 mr-1" />Receiving</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50 to-orange-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading kitchen dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 xs:px-4 py-4 xs:py-6 md:py-8">
      {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-100">
                <Factory className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Central Kitchen</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {user?.firstName}!
                </p>
              </div>
            </div>
          </div>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-rose-50 to-white">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-rose-600">{stats.totalItems}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-600">{stats.pendingBranches}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.packingBranches}</p>
                <p className="text-sm text-muted-foreground">Packing</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{stats.dispatchedBranches}</p>
                <p className="text-sm text-muted-foreground">Dispatched</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{stats.completedBranches}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link href="/">
            <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">All Branches</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      View all branches for packing
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/branch/central-kitchen/recipes">
            <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 group-hover:scale-110 transition-transform">
                    <ChefHat className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">CK Recipes</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      View cooking recipes and instructions
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Production Schedule Section */}
        <Card className="mb-8 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              Production Schedule
            </CardTitle>
            <p className="text-sm text-orange-700/80">View and manage the weekly production schedule</p>
          </CardHeader>
          <CardContent>
            {productionSchedules.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-orange-300 mx-auto mb-3" />
                <p className="text-orange-700/70">No production schedules found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productionSchedules.map((schedule) => {
                  const totalItems = getTotalItems(schedule)
                  const completedItems = getCompletedItems(schedule)
                  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

                  return (
                    <Card 
                      key={schedule.scheduleId} 
                      className="bg-white hover:shadow-lg transition-all group overflow-hidden border-orange-100"
                    >
                      <div className="h-1.5 bg-orange-100">
                        <div 
                          className="h-full bg-orange-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold flex items-center gap-2 text-gray-800">
                              <Calendar className="h-4 w-4 text-orange-500" />
                              Week of {new Date(schedule.weekStart).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(schedule.weekStart).toLocaleDateString()} - {new Date(schedule.weekEnd).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge 
                            className={`${
                              progress === 100 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-orange-100 text-orange-700'
                            } border-0`}
                          >
                            {progress}%
                          </Badge>
                        </div>

                        <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                          <p>{schedule.days.length} production days</p>
                          <p>{totalItems} total items</p>
                          <p>{completedItems} completed</p>
                          <p className="text-xs">Created by {schedule.createdBy}</p>
                        </div>

                        <Link href={`/branch/central-kitchen/production-schedule?scheduleId=${schedule.scheduleId}`}>
                          <Button 
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2"
                            size="sm"
                          >
                            <Eye className="h-4 w-4" />
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
        <div className="mb-8">
          <QualityControlWidget 
            branchSlug="central-kitchen" 
            branchName="Central Kitchen" 
          />
        </div>

        {/* Today's Dispatches */}
        {todaysDispatches.length > 0 && (
          <Card className="mb-8 border-l-4 border-l-rose-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-rose-500" />
                Today&apos;s Dispatches - Packing Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysDispatches.flatMap(dispatch =>
                  dispatch.branchDispatches.map(bd => (
                    <div 
                      key={`${dispatch.id}-${bd.branchSlug}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{bd.branchName}</p>
                          <p className="text-sm text-muted-foreground">
                            {bd.items?.length || 0} items
                          </p>
                          {bd.packedBy && bd.packedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Packed by {bd.packedBy} at {new Date(bd.packedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              All Active Dispatches - Packing Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeDispatches.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">All dispatches completed!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDispatches.slice(0, 5).map(dispatch => (
                  <div key={dispatch.id} className="border rounded-lg p-4">
                    <div className="mb-3">
                      <p className="font-semibold">
                        Delivery: {formatDate(dispatch.deliveryDate)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {dispatch.branchDispatches.length} branches • {dispatch.branchDispatches.filter(bd => bd.status === 'completed').length} completed
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {dispatch.branchDispatches.slice(0, 4).map(bd => (
                        <div 
                          key={bd.branchSlug}
                          className="p-2 bg-muted/50 rounded"
                        >
                          <p className="font-medium text-sm truncate">{bd.branchName}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              {bd.items?.length || 0} items
                            </span>
                            {getStatusBadge(bd.status)}
                          </div>
                          {bd.packedBy && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              By: {bd.packedBy}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {dispatch.branchDispatches.length > 4 && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
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

