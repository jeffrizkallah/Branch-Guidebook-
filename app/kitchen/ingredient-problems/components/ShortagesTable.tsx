'use client'

import React, { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  MoreVertical,
  Filter,
  X
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatQuantity } from '@/lib/display-utils'

export interface Shortage {
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
  resolved_at?: string
  resolved_by?: string
  resolution_action?: string
  resolution_notes?: string
}

type SortColumn = 'priority' | 'ingredient_name' | 'status' | 'required_quantity' | 
                  'available_quantity' | 'shortfall_amount' | 'production_date'
type SortDirection = 'asc' | 'desc'

interface ShortagesTableProps {
  shortages: Shortage[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onRowClick: (shortage: Shortage) => void
  onResolve: (shortage: Shortage) => void
}

export function ShortagesTable({
  shortages,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onResolve
}: ShortagesTableProps) {
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('priority')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')
  
  // Column filters
  const [priorityFilters, setPriorityFilters] = React.useState<Set<string>>(new Set(['HIGH', 'MEDIUM', 'LOW']))
  const [statusFilters, setStatusFilters] = React.useState<Set<string>>(new Set(['MISSING', 'PARTIAL', 'CRITICAL']))
  const [dateFilters, setDateFilters] = React.useState<Set<string>>(new Set())
  
  const parentRef = useRef<HTMLDivElement>(null)

  // Get unique values for filters
  const uniqueDates = useMemo(() => {
    const dates = [...new Set(shortages.map(s => s.production_date))]
    return dates.sort()
  }, [shortages])

  // Initialize date filters if empty
  React.useEffect(() => {
    if (dateFilters.size === 0 && uniqueDates.length > 0) {
      setDateFilters(new Set(uniqueDates))
    }
  }, [uniqueDates, dateFilters.size])

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    // First filter
    let data = shortages.filter(shortage => {
      if (!priorityFilters.has(shortage.priority)) return false
      if (!statusFilters.has(shortage.status)) return false
      if (!dateFilters.has(shortage.production_date)) return false
      return true
    })
    
    // Then sort
    data.sort((a, b) => {
      let aVal: any
      let bVal: any
      
      switch (sortColumn) {
        case 'priority':
          const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
          aVal = priorityOrder[a.priority]
          bVal = priorityOrder[b.priority]
          break
        case 'ingredient_name':
          aVal = a.ingredient_name.toLowerCase()
          bVal = b.ingredient_name.toLowerCase()
          break
        case 'status':
          const statusOrder = { MISSING: 3, CRITICAL: 2, PARTIAL: 1 }
          aVal = statusOrder[a.status]
          bVal = statusOrder[b.status]
          break
        case 'required_quantity':
          aVal = a.required_quantity
          bVal = b.required_quantity
          break
        case 'available_quantity':
          aVal = a.available_quantity
          bVal = b.available_quantity
          break
        case 'shortfall_amount':
          aVal = Math.abs(a.shortfall_amount)
          bVal = Math.abs(b.shortfall_amount)
          break
        case 'production_date':
          aVal = new Date(a.production_date).getTime()
          bVal = new Date(b.production_date).getTime()
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    
    return data
  }, [shortages, sortColumn, sortDirection, priorityFilters, statusFilters, dateFilters])

  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: filteredAndSortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  })

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection(column === 'priority' ? 'desc' : 'asc')
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedData.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(filteredAndSortedData.map(s => s.shortage_id)))
    }
  }

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectionChange(newSelected)
  }

  const togglePriorityFilter = (priority: string) => {
    const newFilters = new Set(priorityFilters)
    if (newFilters.has(priority)) {
      newFilters.delete(priority)
    } else {
      newFilters.add(priority)
    }
    setPriorityFilters(newFilters)
  }

  const toggleStatusFilter = (status: string) => {
    const newFilters = new Set(statusFilters)
    if (newFilters.has(status)) {
      newFilters.delete(status)
    } else {
      newFilters.add(status)
    }
    setStatusFilters(newFilters)
  }

  const toggleDateFilter = (date: string) => {
    const newFilters = new Set(dateFilters)
    if (newFilters.has(date)) {
      newFilters.delete(date)
    } else {
      newFilters.add(date)
    }
    setDateFilters(newFilters)
  }

  const clearAllFilters = () => {
    setPriorityFilters(new Set(['HIGH', 'MEDIUM', 'LOW']))
    setStatusFilters(new Set(['MISSING', 'PARTIAL', 'CRITICAL']))
    setDateFilters(new Set(uniqueDates))
  }

  const hasActiveFilters = priorityFilters.size < 3 || statusFilters.size < 3 || dateFilters.size < uniqueDates.length

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">HIGH</Badge>
      case 'MEDIUM':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">MED</Badge>
      case 'LOW':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">LOW</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MISSING':
        return <Badge variant="destructive" className="text-xs">Missing</Badge>
      case 'CRITICAL':
        return <Badge className="bg-red-600 hover:bg-red-700 text-white text-xs">Critical</Badge>
      case 'PARTIAL':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">Partial</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    })
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400" />
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 ml-1" /> : 
      <ArrowDown className="h-3 w-3 ml-1" />
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Active Filters Bar */}
      {hasActiveFilters && (
        <div className="bg-blue-50 border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-900">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Active filters applied</span>
            <span className="text-blue-600">({filteredAndSortedData.length} of {shortages.length} items shown)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-blue-600 hover:text-blue-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        </div>
      )}

      {/* Table Header */}
      <div className="bg-gray-100 border-b">
        <div className="grid grid-cols-[40px_80px_minmax(200px,1fr)_110px_100px_100px_110px_110px_60px] gap-2 px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
          <div className="flex items-center justify-center">
            <Checkbox 
              checked={selectedIds.size === filteredAndSortedData.length && filteredAndSortedData.length > 0}
              onCheckedChange={toggleSelectAll}
            />
          </div>
          
          {/* Priority Column with Filter */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleSort('priority')}
              className="flex items-center hover:text-gray-900 transition-colors"
            >
              Priority
              <SortIcon column="priority" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Filter className={`h-3 w-3 ${priorityFilters.size < 3 ? 'text-blue-600' : 'text-gray-400'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-white shadow-lg border">
                <DropdownMenuLabel className="text-xs font-semibold">Filter by Priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={priorityFilters.has('HIGH')}
                  onCheckedChange={() => togglePriorityFilter('HIGH')}
                >
                  HIGH
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={priorityFilters.has('MEDIUM')}
                  onCheckedChange={() => togglePriorityFilter('MEDIUM')}
                >
                  MEDIUM
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={priorityFilters.has('LOW')}
                  onCheckedChange={() => togglePriorityFilter('LOW')}
                >
                  LOW
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <button 
            onClick={() => handleSort('ingredient_name')}
            className="flex items-center hover:text-gray-900 transition-colors"
          >
            Ingredient Name
            <SortIcon column="ingredient_name" />
          </button>
          
          {/* Status Column with Filter */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleSort('status')}
              className="flex items-center hover:text-gray-900 transition-colors"
            >
              Status
              <SortIcon column="status" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Filter className={`h-3 w-3 ${statusFilters.size < 3 ? 'text-blue-600' : 'text-gray-400'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-white shadow-lg border">
                <DropdownMenuLabel className="text-xs font-semibold">Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={statusFilters.has('MISSING')}
                  onCheckedChange={() => toggleStatusFilter('MISSING')}
                >
                  Missing
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilters.has('CRITICAL')}
                  onCheckedChange={() => toggleStatusFilter('CRITICAL')}
                >
                  Critical
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilters.has('PARTIAL')}
                  onCheckedChange={() => toggleStatusFilter('PARTIAL')}
                >
                  Partial
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <button 
            onClick={() => handleSort('required_quantity')}
            className="flex items-center justify-end hover:text-gray-900 transition-colors"
          >
            Required
            <SortIcon column="required_quantity" />
          </button>
          
          <button 
            onClick={() => handleSort('available_quantity')}
            className="flex items-center justify-end hover:text-gray-900 transition-colors"
          >
            Available
            <SortIcon column="available_quantity" />
          </button>
          
          <button 
            onClick={() => handleSort('shortfall_amount')}
            className="flex items-center justify-end hover:text-gray-900 transition-colors"
          >
            Shortfall
            <SortIcon column="shortfall_amount" />
          </button>
          
          {/* Production Date Column with Filter */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleSort('production_date')}
              className="flex items-center hover:text-gray-900 transition-colors"
            >
              Production
              <SortIcon column="production_date" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Filter className={`h-3 w-3 ${dateFilters.size < uniqueDates.length ? 'text-blue-600' : 'text-gray-400'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-white shadow-lg border max-h-80 overflow-y-auto">
                <DropdownMenuLabel className="text-xs font-semibold">Filter by Date</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {uniqueDates.map(date => (
                  <DropdownMenuCheckboxItem
                    key={date}
                    checked={dateFilters.has(date)}
                    onCheckedChange={() => toggleDateFilter(date)}
                  >
                    {formatDate(date)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center justify-center">
            <MoreVertical className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '600px' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const shortage = filteredAndSortedData[virtualRow.index]
            const isSelected = selectedIds.has(shortage.shortage_id)
            
            const required = formatQuantity(shortage.required_quantity, shortage.unit)
            const available = formatQuantity(shortage.available_quantity, shortage.unit)
            const shortfall = formatQuantity(Math.abs(shortage.shortfall_amount), shortage.unit)

            return (
              <div
                key={shortage.shortage_id}
                className={`
                  absolute top-0 left-0 w-full
                  grid grid-cols-[40px_80px_minmax(200px,1fr)_110px_100px_100px_110px_110px_60px] gap-2 px-4 py-3
                  border-b border-gray-200
                  hover:bg-gray-50 cursor-pointer transition-colors
                  ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white'}
                  ${virtualRow.index % 2 === 1 ? 'bg-gray-50/50' : ''}
                `}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick(shortage)}
              >
                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={(e) => toggleSelect(shortage.shortage_id, e as any)}
                  />
                </div>
                
                <div className="flex items-center">
                  {getPriorityBadge(shortage.priority)}
                </div>
                
                <div className="flex items-center font-semibold text-gray-900 truncate">
                  {shortage.ingredient_name}
                </div>
                
                <div className="flex items-center">
                  {getStatusBadge(shortage.status)}
                </div>
                
                <div className="flex items-center justify-end text-sm tabular-nums">
                  {required.value} {required.unit}
                </div>
                
                <div className="flex items-center justify-end text-sm tabular-nums text-gray-600">
                  {available.value} {available.unit}
                </div>
                
                <div className="flex items-center justify-end text-sm tabular-nums font-bold text-red-600">
                  -{shortfall.value} {shortfall.unit}
                </div>
                
                <div className="flex items-center justify-end text-sm text-gray-600">
                  {formatDate(shortage.production_date)}
                </div>
                
                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200">
                        <MoreVertical className="h-4 w-4 text-gray-700" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-48 bg-white shadow-lg border border-gray-200"
                    >
                      <DropdownMenuItem 
                        onClick={() => onRowClick(shortage)}
                        className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100"
                      >
                        <span className="text-gray-700 font-medium">View Details</span>
                      </DropdownMenuItem>
                      {shortage.resolution_status !== 'RESOLVED' && (
                        <DropdownMenuItem 
                          onClick={() => onResolve(shortage)}
                          className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100"
                        >
                          <span className="text-gray-700 font-medium">Resolve</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => {
                          const text = `${shortage.ingredient_name}: -${shortfall.value} ${shortfall.unit}`
                          navigator.clipboard.writeText(text)
                        }}
                        className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100"
                      >
                        <span className="text-gray-700 font-medium">Copy to Clipboard</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedData.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <p className="font-medium mb-1">No shortages match your filters</p>
          <Button variant="link" onClick={clearAllFilters} className="text-blue-600">
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  )
}
