'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, RefreshCw, AlertCircle, Calendar, Package } from 'lucide-react'

interface EnhancedFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusChange: (status: string) => void
  priorityFilter: string
  onPriorityChange: (priority: string) => void
  dateFilter: string
  onDateChange: (date: string) => void
  quickFilters: {
    criticalOnly: boolean
    todayOnly: boolean
    completelyMissing: boolean
  }
  onQuickFilterToggle: (filter: 'criticalOnly' | 'todayOnly' | 'completelyMissing') => void
  onRefresh: () => void
  onClearFilters: () => void
}

export function EnhancedFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  dateFilter,
  onDateChange,
  quickFilters,
  onQuickFilterToggle,
  onRefresh,
  onClearFilters
}: EnhancedFiltersProps) {
  const hasActiveFilters = 
    searchQuery || 
    priorityFilter !== 'ALL' || 
    dateFilter !== 'ALL' ||
    quickFilters.criticalOnly ||
    quickFilters.todayOnly ||
    quickFilters.completelyMissing

  return (
    <div className="space-y-4">
      {/* Main Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ingredient name..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <Tabs value={statusFilter} onValueChange={onStatusChange} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="PENDING">Pending</TabsTrigger>
              <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
              <TabsTrigger value="ALL">All</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white text-sm"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white text-sm"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
          </select>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600 font-medium">Quick filters:</span>
        
        <Badge
          variant={quickFilters.criticalOnly ? "default" : "outline"}
          className={`cursor-pointer transition-colors ${
            quickFilters.criticalOnly 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'hover:bg-gray-100'
          }`}
          onClick={() => onQuickFilterToggle('criticalOnly')}
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Critical Only
        </Badge>
        
        <Badge
          variant={quickFilters.todayOnly ? "default" : "outline"}
          className={`cursor-pointer transition-colors ${
            quickFilters.todayOnly 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'hover:bg-gray-100'
          }`}
          onClick={() => onQuickFilterToggle('todayOnly')}
        >
          <Calendar className="h-3 w-3 mr-1" />
          Today
        </Badge>
        
        <Badge
          variant={quickFilters.completelyMissing ? "default" : "outline"}
          className={`cursor-pointer transition-colors ${
            quickFilters.completelyMissing 
              ? 'bg-purple-500 hover:bg-purple-600' 
              : 'hover:bg-gray-100'
          }`}
          onClick={() => onQuickFilterToggle('completelyMissing')}
        >
          <Package className="h-3 w-3 mr-1" />
          Completely Missing
        </Badge>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-gray-600 hover:text-gray-900"
          >
            Clear all filters
          </Button>
        )}
      </div>
    </div>
  )
}
