'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, CheckCircle2, Clock, PlayCircle, ArrowRight, Eye, Scale } from 'lucide-react'
import type { ProductionItem, ProductionStation } from '@/lib/data'

interface AssignedItemsByStationProps {
  byStation: Record<string, ProductionItem[]>
  stations: ProductionStation[]
  stationColors: Record<string, { bg: string; text: string; border: string }>
  stationIcons: Record<string, React.ReactNode>
  onReassign: (itemId: string, newStation: ProductionStation | null) => void
  onViewRecipe?: (item: ProductionItem) => void
  onAdjustQuantity?: (item: ProductionItem) => void
}

export function AssignedItemsByStation({
  byStation,
  stations,
  stationColors,
  stationIcons,
  onReassign,
  onViewRecipe,
  onAdjustQuantity
}: AssignedItemsByStationProps) {
  const getItemStatus = (item: ProductionItem) => {
    if (item.completed || item.completedAt) {
      return {
        label: 'Completed',
        icon: <CheckCircle2 className="h-3 w-3" />,
        className: 'bg-green-100 text-green-700'
      }
    }
    if (item.startedAt) {
      return {
        label: 'In Progress',
        icon: <PlayCircle className="h-3 w-3" />,
        className: 'bg-blue-100 text-blue-700'
      }
    }
    return {
      label: 'Pending',
      icon: <Clock className="h-3 w-3" />,
      className: 'bg-gray-100 text-gray-700'
    }
  }

  const formatQuantity = (item: ProductionItem) => {
    const target = `${item.quantity} ${item.unit}`
    if (item.actualQuantity) {
      return `${item.actualQuantity} ${item.actualUnit || item.unit} / ${target}`
    }
    return target
  }

  const getSubRecipeProgress = (item: ProductionItem) => {
    if (!item.subRecipeProgress) return null
    const entries = Object.entries(item.subRecipeProgress)
    if (entries.length === 0) return null

    const completed = entries.filter(([, p]) => p.completed).length
    return { completed, total: entries.length }
  }

  return (
    <div className="space-y-6">
      {stations.map(station => {
        const items = byStation[station] || []
        if (items.length === 0) return null

        const colors = stationColors[station]
        const completedCount = items.filter(i => i.completed || i.completedAt).length

        return (
          <Card key={station} className={`${colors.border} border-l-4`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${colors.bg} ${colors.text}`}>
                    {stationIcons[station]}
                  </div>
                  <span>{station}</span>
                  <Badge variant="outline" className="ml-2">
                    {completedCount}/{items.length}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                {items.map(item => {
                  const status = getItemStatus(item)
                  const subProgress = getSubRecipeProgress(item)

                  return (
                    <div
                      key={item.itemId}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        item.completed || item.completedAt ? 'bg-green-50/50' : 'bg-white'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${item.completed || item.completedAt ? 'line-through text-muted-foreground' : ''}`}>
                            {item.recipeName}
                          </p>
                          <Badge className={`${status.className} gap-1 text-xs border-0`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {formatQuantity(item)}
                          {item.notes && <span className="ml-2">• {item.notes}</span>}
                        </p>
                        {subProgress && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Sub-recipes: {subProgress.completed}/{subProgress.total} completed
                          </p>
                        )}
                        {item.completedAt && (
                          <p className="text-xs text-green-600 mt-1">
                            Completed at {new Date(item.completedAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
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
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        )}

                        {onAdjustQuantity && !item.completed && !item.completedAt && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onAdjustQuantity(item)}
                            className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <Scale className="h-4 w-4" />
                            <span className="hidden sm:inline">Adjust</span>
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onReassign(item.itemId, null)}
                              className="text-amber-600"
                            >
                              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                              Unassign
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {stations
                              .filter(s => s !== station)
                              .map(targetStation => (
                                <DropdownMenuItem
                                  key={targetStation}
                                  onClick={() => onReassign(item.itemId, targetStation)}
                                  className="flex items-center gap-2"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                  Move to {targetStation}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Show message if no items are assigned */}
      {stations.every(station => (byStation[station] || []).length === 0) && (
        <Card className="py-8">
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              No items have been assigned to stations yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
