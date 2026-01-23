'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ClipboardList, ChevronDown, Send, Eye } from 'lucide-react'
import type { ProductionItem, ProductionStation } from '@/lib/data'

interface UnassignedItemsListProps {
  items: ProductionItem[]
  selectedItems: Set<string>
  onSelectionChange: (selected: Set<string>) => void
  onAssign: (itemIds: string[], station: ProductionStation) => void
  onViewRecipe?: (item: ProductionItem) => void
  stations: ProductionStation[]
  stationColors: Record<string, { bg: string; text: string; border: string }>
  stationIcons: Record<string, React.ReactNode>
}

export function UnassignedItemsList({
  items,
  selectedItems,
  onSelectionChange,
  onAssign,
  onViewRecipe,
  stations,
  stationColors,
  stationIcons
}: UnassignedItemsListProps) {
  const [bulkStation, setBulkStation] = useState<ProductionStation | null>(null)

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    onSelectionChange(newSelected)
  }

  const toggleAll = () => {
    if (selectedItems.size === items.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(items.map(i => i.itemId)))
    }
  }

  const handleBulkAssign = () => {
    if (bulkStation && selectedItems.size > 0) {
      onAssign(Array.from(selectedItems), bulkStation)
      setBulkStation(null)
    }
  }

  const handleSingleAssign = (itemId: string, station: ProductionStation) => {
    onAssign([itemId], station)
  }

  return (
    <Card className="mb-6 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <ClipboardList className="h-4 w-4" />
            Unassigned Items ({items.length})
          </CardTitle>

          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedItems.size} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    {bulkStation || 'Assign to...'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {stations.map(station => (
                    <DropdownMenuItem
                      key={station}
                      onClick={() => setBulkStation(station)}
                      className="flex items-center gap-2"
                    >
                      {stationIcons[station]}
                      {station}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {bulkStation && (
                <Button size="sm" onClick={handleBulkAssign}>
                  <Send className="h-3 w-3 mr-1" />
                  Assign
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Select All */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
          <Checkbox
            checked={selectedItems.size === items.length && items.length > 0}
            onCheckedChange={toggleAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Select All
          </label>
        </div>

        {/* Items List */}
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.itemId}
              className="flex items-center justify-between p-3 bg-white rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedItems.has(item.itemId)}
                  onCheckedChange={() => toggleItem(item.itemId)}
                />
                <div>
                  <p className="font-medium">{item.recipeName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} {item.unit}
                    {item.notes && <span className="ml-2 text-xs">• {item.notes}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onViewRecipe && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewRecipe(item)}
                    className="gap-1 text-muted-foreground hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">View Recipe</span>
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      Assign to
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {stations.map(station => {
                      const colors = stationColors[station]
                      return (
                        <DropdownMenuItem
                          key={station}
                          onClick={() => handleSingleAssign(item.itemId, station)}
                          className={`flex items-center gap-2 ${colors.text}`}
                        >
                          {stationIcons[station]}
                          {station}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            All items have been assigned to stations
          </div>
        )}
      </CardContent>
    </Card>
  )
}
