'use client'

import { Button } from '@/components/ui/button'
import { Download, CheckCircle2, X } from 'lucide-react'
import type { Shortage } from './ShortagesTable'

interface BulkActionsBarProps {
  selectedCount: number
  onBulkResolve: () => void
  onExportCSV: () => void
  onClearSelection: () => void
}

export function BulkActionsBar({
  selectedCount,
  onBulkResolve,
  onExportCSV,
  onClearSelection
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 animate-in slide-in-from-top duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-blue-900">
            {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCSV}
            className="border-blue-300 hover:bg-blue-100"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={onBulkResolve}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Bulk Resolve
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
