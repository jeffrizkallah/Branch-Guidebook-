'use client'

import { useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight, Calendar, Clock, Package, TrendingUp } from 'lucide-react'
import { formatQuantity } from '@/lib/display-utils'
import type { Shortage } from './ShortagesTable'

interface ShortageDrawerProps {
  shortage: Shortage | null
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  onResolve: (shortage: Shortage) => void
  currentIndex: number
  totalCount: number
}

export function ShortageDrawer({
  shortage,
  isOpen,
  onClose,
  onNext,
  onPrev,
  onResolve,
  currentIndex,
  totalCount
}: ShortageDrawerProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Handle arrow keys
  useEffect(() => {
    const handleArrows = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleArrows)
      return () => window.removeEventListener('keydown', handleArrows)
    }
  }, [isOpen, onNext, onPrev])

  if (!isOpen || !shortage) return null

  const required = formatQuantity(shortage.required_quantity, shortage.unit)
  const available = formatQuantity(shortage.available_quantity, shortage.unit)
  const shortfall = formatQuantity(Math.abs(shortage.shortfall_amount), shortage.unit)

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">HIGH</Badge>
      case 'MEDIUM':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">MEDIUM</Badge>
      case 'LOW':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">LOW</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MISSING':
        return <Badge variant="destructive">Completely Missing</Badge>
      case 'CRITICAL':
        return <Badge className="bg-red-600 hover:bg-red-700 text-white">Critical</Badge>
      case 'PARTIAL':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Partial</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-10 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrev}
                disabled={currentIndex === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                disabled={currentIndex === totalCount - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Item {currentIndex + 1} of {totalCount}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {shortage.ingredient_name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {getPriorityBadge(shortage.priority)}
              {getStatusBadge(shortage.status)}
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Detected: {formatTimeAgo(shortage.created_at)}
              </Badge>
            </div>
          </div>

          {/* Production Date */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Calendar className="h-4 w-4" />
              Production Date
            </div>
            <div className="font-semibold text-lg">
              {formatDate(shortage.production_date)}
            </div>
          </div>

          {/* Quantity Overview */}
          <div>
            <h3 className="font-semibold text-sm text-gray-600 mb-3">Quantity Overview</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-xs text-gray-600 mb-1">Required</div>
                <div className="font-bold text-lg">
                  {required.value}
                </div>
                <div className="text-xs text-gray-500">{required.unit}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-xs text-gray-600 mb-1">Available</div>
                <div className="font-bold text-lg">
                  {available.value}
                </div>
                <div className="text-xs text-gray-500">{available.unit}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                <div className="text-xs text-red-600 mb-1">Shortfall</div>
                <div className="font-bold text-lg text-red-600">
                  -{shortfall.value}
                </div>
                <div className="text-xs text-red-500">{shortfall.unit}</div>
              </div>
            </div>
          </div>

          {/* Affected Recipes */}
          {shortage.affected_recipes && shortage.affected_recipes.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-600 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Affected Recipes ({shortage.affected_recipes.length})
              </h3>
              <div className="space-y-2">
                {shortage.affected_recipes.map((recipe, idx) => (
                  <div key={idx} className="bg-white border rounded-lg px-4 py-2 text-sm">
                    • {recipe}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affected Production Items */}
          {shortage.affected_production_items && shortage.affected_production_items.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-600 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Affected Production Items ({shortage.affected_production_items.length})
              </h3>
              <div className="space-y-2">
                {shortage.affected_production_items.map((item, idx) => (
                  <div key={idx} className="bg-white border rounded-lg px-4 py-2 text-sm">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-blue-900 mb-3">Schedule Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Schedule ID:</span>
                <span className="font-medium text-blue-900">#{shortage.schedule_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Check Date:</span>
                <span className="font-medium text-blue-900">{formatDate(shortage.check_date)}</span>
              </div>
            </div>
          </div>

          {/* Resolution Info (if resolved) */}
          {shortage.resolution_status === 'RESOLVED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-green-800 mb-3">Resolution Details</h3>
              <div className="text-sm space-y-2">
                {shortage.resolved_at && (
                  <div>
                    <span className="font-medium text-green-700">Resolved:</span>{' '}
                    <span className="text-green-900">{formatDate(shortage.resolved_at)}</span>
                  </div>
                )}
                {shortage.resolution_action && (
                  <div>
                    <span className="font-medium text-green-700">Action:</span>{' '}
                    <span className="text-green-900">{shortage.resolution_action.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {shortage.resolution_notes && (
                  <div>
                    <span className="font-medium text-green-700">Notes:</span>{' '}
                    <span className="text-green-900">{shortage.resolution_notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          {shortage.resolution_status !== 'RESOLVED' && (
            <Button
              onClick={() => onResolve(shortage)}
              className="w-full"
              size="lg"
            >
              Resolve Shortage
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
