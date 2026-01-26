'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  XCircle
} from 'lucide-react'

interface Shortage {
  shortage_id: string
  schedule_id: string
  production_date: string
  ingredient_name: string
  inventory_item_name: string | null
  required_quantity: number
  available_quantity: number
  shortfall_amount: number
  unit: string
  status: 'MISSING' | 'PARTIAL' | 'CRITICAL'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  affected_recipes: string[]
  affected_production_items: string[]
  resolution_status: string
  created_at: string
  check_date: string
}

export function InventoryShortageAlertsWidget() {
  const [loading, setLoading] = useState(true)
  const [shortages, setShortages] = useState<Shortage[]>([])

  useEffect(() => {
    loadShortages()
    // Poll every 30 seconds for updates
    const interval = setInterval(loadShortages, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadShortages = async () => {
    try {
      const response = await fetch('/api/inventory-shortages?status=PENDING')
      if (response.ok) {
        const data = await response.json()
        setShortages(data.shortages || [])
      }
    } catch (error) {
      console.error('Error loading shortages:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const stats = {
    total: shortages.length,
    high: shortages.filter(s => s.priority === 'HIGH').length,
    medium: shortages.filter(s => s.priority === 'MEDIUM').length,
    low: shortages.filter(s => s.priority === 'LOW').length,
    missing: shortages.filter(s => s.status === 'MISSING').length,
    critical: shortages.filter(s => s.status === 'CRITICAL').length,
    partial: shortages.filter(s => s.status === 'PARTIAL').length,
  }

  // Get today's and this week's production dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekFromNow = new Date(today)
  weekFromNow.setDate(weekFromNow.getDate() + 7)

  const todayShortages = shortages.filter(s => {
    const prodDate = new Date(s.production_date)
    return prodDate.toDateString() === today.toDateString()
  })

  const thisWeekShortages = shortages.filter(s => {
    const prodDate = new Date(s.production_date)
    return prodDate >= today && prodDate <= weekFromNow
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Inventory Shortage Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (shortages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-green-600" />
            Inventory Shortage Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 mb-2">
              All Clear!
            </p>
            <p className="text-sm text-gray-600">
              No pending inventory shortages
            </p>
            <p className="text-xs text-gray-500 mt-1">
              All production requirements are currently met
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Inventory Shortage Alerts
          </CardTitle>
          <Link href="/kitchen/ingredient-problems">
            <Button variant="default" size="sm" className="bg-red-600 hover:bg-red-700">
              View More Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-4xl font-bold text-red-600 mb-1">
              {stats.total}
            </div>
            <div className="text-sm font-medium text-red-900">
              Total Active Shortages
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <div className="text-4xl font-bold text-amber-600 mb-1">
              {todayShortages.length}
            </div>
            <div className="text-sm font-medium text-amber-900">
              Due Today
            </div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Priority Breakdown
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-gray-700">High Priority</span>
              </div>
              <Badge className="bg-red-500 hover:bg-red-600 text-white">
                {stats.high}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between py-2 px-3 bg-amber-50 border border-amber-200 rounded">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-gray-700">Medium Priority</span>
              </div>
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                {stats.medium}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between py-2 px-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-gray-700">Low Priority</span>
              </div>
              <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
                {stats.low}
              </Badge>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Status Breakdown
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 border rounded-lg p-3 text-center">
              <XCircle className="h-5 w-5 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{stats.missing}</div>
              <div className="text-xs text-gray-600 mt-1">Missing</div>
            </div>
            
            <div className="bg-gray-50 border rounded-lg p-3 text-center">
              <AlertCircle className="h-5 w-5 text-red-700 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
              <div className="text-xs text-gray-600 mt-1">Critical</div>
            </div>
            
            <div className="bg-gray-50 border rounded-lg p-3 text-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-amber-600">{stats.partial}</div>
              <div className="text-xs text-gray-600 mt-1">Partial</div>
            </div>
          </div>
        </div>

        {/* This Week Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-900 mb-1">
                This Week's Production
              </div>
              <div className="text-xs text-blue-700">
                {thisWeekShortages.length} shortages affecting upcoming production
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {thisWeekShortages.length}
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-3">
            Click "View More Details" to see the full list, filter by priority, status, dates, and resolve shortages.
          </p>
          <Link href="/kitchen/ingredient-problems">
            <Button variant="outline" className="w-full">
              <AlertCircle className="mr-2 h-4 w-4" />
              Manage All Shortages
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
