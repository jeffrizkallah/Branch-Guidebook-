'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Factory, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle,
  Check,
  Loader2,
  Calendar
} from 'lucide-react'
import type { ProductionSchedule, ProductionDay, ProductionItem, ProductionStation } from '@/lib/data'

const STATIONS: ProductionStation[] = ['Butchery', 'Hot Section', 'Pantry', 'Desserts', 'Cold Section', 'Baker', 'Butcher']
const STATION_COLORS: Record<ProductionStation, string> = {
  'Butchery': 'bg-red-100 text-red-800',
  'Hot Section': 'bg-orange-100 text-orange-800',
  'Pantry': 'bg-green-100 text-green-800',
  'Desserts': 'bg-purple-100 text-purple-800',
  'Cold Section': 'bg-blue-100 text-blue-800',
  'Baker': 'bg-amber-100 text-amber-800',
  'Butcher': 'bg-rose-100 text-rose-800',
}

interface ParsedItem {
  date: string
  dayName: string
  recipeName: string
  quantity: number
  unit: string
  station: ProductionStation
}

export default function ImportProductionSchedulePage() {
  const router = useRouter()
  const [rawData, setRawData] = useState('')
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [weekStart, setWeekStart] = useState('')
  const [weekEnd, setWeekEnd] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseExcelData = () => {
    setIsParsing(true)
    setError(null)

    try {
      const lines = rawData.trim().split('\n')
      if (lines.length < 2) {
        throw new Error('Please paste at least 2 rows of data (header + data)')
      }

      // Parse header row
      const header = lines[0].split('\t').map(h => h.trim().toLowerCase())
      
      const dateIdx = header.findIndex(h => 
        h.includes('date') || h.includes('production')
      )
      const recipeIdx = header.findIndex(h => 
        h.includes('recipe') || h.includes('main') || h.includes('item')
      )
      const qtyIdx = header.findIndex(h => 
        h.includes('qty') || h.includes('quantity') || h.includes('order')
      )
      const unitIdx = header.findIndex(h => 
        h.includes('unit') || h.includes('uo') || h.includes('uom')
      )
      const stationIdx = header.findIndex(h => 
        h.includes('station') || h.includes('section')
      )

      const items: ParsedItem[] = []
      const errors: string[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t').map(c => c.trim())
        if (!cols[0]) continue

        const dateStr = dateIdx >= 0 ? cols[dateIdx] : cols[0]
        const recipeName = recipeIdx >= 0 ? cols[recipeIdx] : cols[1]
        const qtyStr = qtyIdx >= 0 ? cols[qtyIdx] : cols[2]
        const quantity = parseFloat(qtyStr) || 0
        const unit = unitIdx >= 0 ? cols[unitIdx] : cols[3] || 'Kg'
        const stationStr = stationIdx >= 0 ? cols[stationIdx] : cols[4] || 'Hot Section'

        if (!recipeName) {
          errors.push(`Row ${i + 1}: Missing recipe name`)
          continue
        }
        if (quantity === 0) {
          errors.push(`Row ${i + 1}: Invalid quantity "${qtyStr}"`)
          continue
        }

        // Parse date more carefully to avoid timezone issues
        let parsedDate: Date
        try {
          if (dateStr.includes(',')) {
            // Format: "Thursday, January 22, 2026" or "Monday, January 19, 2026"
            // Extract month, day, and year
            const parts = dateStr.split(',').map(p => p.trim())
            if (parts.length >= 2) {
              // Join remaining parts with comma+space to preserve format
              let datePart = parts.slice(1).join(', ').trim()
              // Match: "Month Day, Year" or "Month Day Year" - flexible with comma and spaces
              const dateMatch = datePart.match(/(\w+)\s+(\d+),?\s*(\d{4})/)
              if (dateMatch) {
                const [, monthName, day, year] = dateMatch
                const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                                  'july', 'august', 'september', 'october', 'november', 'december']
                const month = monthNames.indexOf(monthName.toLowerCase())
                if (month !== -1) {
                  // Create date using local timezone (year, month, day)
                  parsedDate = new Date(parseInt(year), month, parseInt(day))
                } else {
                  errors.push(`Row ${i + 1}: Unknown month "${monthName}"`)
                  continue
                }
              } else {
                errors.push(`Row ${i + 1}: Cannot parse date "${dateStr}"`)
                continue
              }
            } else {
              errors.push(`Row ${i + 1}: Invalid date format "${dateStr}"`)
              continue
            }
          } else {
            // Try standard date parsing
            parsedDate = new Date(dateStr)
          }
        } catch (e) {
          errors.push(`Row ${i + 1}: Date parse error "${dateStr}"`)
          continue
        }

        if (isNaN(parsedDate.getTime())) {
          errors.push(`Row ${i + 1}: Invalid date "${dateStr}"`)
          continue
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        
        // Match station
        let station: ProductionStation = 'Hot Section'
        for (const s of STATIONS) {
          if (stationStr.toLowerCase().includes(s.toLowerCase())) {
            station = s
            break
          }
        }

        // Format date as YYYY-MM-DD without timezone conversion
        const year = parsedDate.getFullYear()
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
        const day = String(parsedDate.getDate()).padStart(2, '0')
        const formattedDate = `${year}-${month}-${day}`

        items.push({
          date: formattedDate,
          dayName: dayNames[parsedDate.getDay()],
          recipeName,
          quantity,
          unit,
          station
        })
      }

      if (items.length === 0) {
        const errorMsg = errors.length > 0 
          ? `No valid items found. Errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`
          : 'No valid items found. Check your data format.'
        throw new Error(errorMsg)
      }

      // Sort by date
      items.sort((a, b) => a.date.localeCompare(b.date))

      // Set week start and end
      const dates = items.map(i => i.date)
      const uniqueDates = Array.from(new Set(dates)).sort()
      setWeekStart(uniqueDates[0])
      setWeekEnd(uniqueDates[uniqueDates.length - 1])

      setParsedItems(items)
    } catch (err: any) {
      setError(err.message || 'Failed to parse data')
    } finally {
      setIsParsing(false)
    }
  }

  const saveSchedule = async () => {
    if (!weekStart || !weekEnd) {
      setError('Please set week start and end dates')
      return
    }
    if (!createdBy.trim()) {
      setError('Please enter who created this schedule')
      return
    }
    if (parsedItems.length === 0) {
      setError('No items to save')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Group items by date
      const dayMap = new Map<string, ProductionItem[]>()
      
      parsedItems.forEach((item, idx) => {
        if (!dayMap.has(item.date)) {
          dayMap.set(item.date, [])
        }
        dayMap.get(item.date)!.push({
          itemId: `prod-${idx}`,
          recipeName: item.recipeName,
          quantity: item.quantity,
          unit: item.unit,
          station: item.station,
          notes: '',
          completed: false
        })
      })

      const days: ProductionDay[] = []
      
      dayMap.forEach((items, date) => {
        // Get day name from the first item with this date (already correctly parsed)
        const dayName = parsedItems.find(item => item.date === date)?.dayName || 'Monday'
        days.push({
          date,
          dayName,
          items
        })
      })

      // Sort days by date
      days.sort((a, b) => a.date.localeCompare(b.date))

      const scheduleId = `week-${weekStart}`

      const schedule: ProductionSchedule = {
        scheduleId,
        weekStart,
        weekEnd,
        createdBy: createdBy.trim(),
        createdAt: new Date().toISOString(),
        days
      }

      const res = await fetch('/api/production-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      router.push('/admin/production-schedules')
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule')
    } finally {
      setIsSaving(false)
    }
  }

  // Group items by date for preview
  const groupedItems = parsedItems.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = { dayName: item.dayName, items: [] }
    }
    acc[item.date].items.push(item)
    return acc
  }, {} as Record<string, { dayName: string, items: ParsedItem[] }>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Upload className="h-8 w-8" />
          Create Production Schedule
        </h1>
        <p className="text-muted-foreground">Paste data from Excel to create a weekly production schedule</p>
      </div>

      {/* Step 1: Paste Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Step 1: Paste Excel Data
          </CardTitle>
          <CardDescription>
            Copy and paste your production plan from Excel. Include headers. Supports single-day or multi-day weekly schedules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Date of Production\tMain Recipes\tQTY Ordered\tUOM\tStations
Monday, January 19, 2026\tBatter 1 KG\t6.6\tKg\tPantry
Monday, January 19, 2026\tBeef Burger 1 KG (80 grams)\t6.4\tKg\tButchery
Tuesday, January 20, 2026\tBanana Pudding 1 Kg\t17.4\tKg\tDesserts
Tuesday, January 20, 2026\tChicken Burger Patty 1 KG\t32.1\tKg\tButchery
Wednesday, January 21, 2026\tChicken Marinade Breast 1 Kg\t37.1\tKg\tButchery
Wednesday, January 21, 2026\tDate Sable 1 Kg\t13.3\tKg\tDesserts`}
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            rows={10}
            className="font-mono text-xs"
          />
          
          <Button 
            onClick={parseExcelData} 
            disabled={!rawData.trim() || isParsing}
            className="gap-2"
          >
            {isParsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Parse Data
          </Button>

          {error && (
            <div className="flex items-start gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="whitespace-pre-wrap">{error}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Review & Save */}
      {parsedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-orange-500" />
              Step 2: Review & Save
            </CardTitle>
            <CardDescription>
              {parsedItems.length} items parsed across {Object.keys(groupedItems).length} days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Schedule Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Week Start *</Label>
                <Input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Week End *</Label>
                <Input
                  type="date"
                  value={weekEnd}
                  onChange={(e) => setWeekEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Created By *</Label>
                <Input
                  placeholder="Your name"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {Object.entries(groupedItems).sort(([a], [b]) => a.localeCompare(b)).map(([date, { dayName, items }]) => {
                // Format date without timezone conversion
                const [year, month, day] = date.split('-')
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                const formattedDate = `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`
                
                return (
                <div key={date} className="border rounded-lg p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4" />
                    {dayName}, {formattedDate}
                    <Badge variant="secondary">{items.length} items</Badge>
                  </h3>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm p-2 bg-muted/50 rounded">
                        <Badge className={STATION_COLORS[item.station]} variant="outline">
                          {item.station}
                        </Badge>
                        <span className="flex-1">{item.recipeName}</span>
                        <span className="font-mono">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                )
              })}
            </div>

            {/* Save Button */}
            <Button 
              onClick={saveSchedule}
              disabled={isSaving || !weekStart || !weekEnd || !createdBy.trim()}
              className="gap-2 bg-orange-500 hover:bg-orange-600"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save Production Schedule
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

