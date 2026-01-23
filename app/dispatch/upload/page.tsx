'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Branch } from '@/lib/data'
import { getItemUnit } from '@/lib/dispatch-unit-mappings'

interface ParsedBranchData {
  branchSlug: string
  branchName: string
  items: Array<{
    name: string
    quantity: number
    unit: string
  }>
}

interface ParsedData {
  deliveryDate: string
  branches: ParsedBranchData[]
  totalItems: number
}

type TemplateFormat = 'old' | 'new' | null

export default function DispatchUploadPage() {
  const [pastedData, setPastedData] = useState('')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [detectedFormat, setDetectedFormat] = useState<TemplateFormat>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => setBranches(data))
      .catch(console.error)
  }, [])

  // Map Excel branch names to slugs (case-insensitive matching)
  const branchNameToSlug: Record<string, string> = {
    'Soufouh': 'isc-soufouh',
    'DIP': 'isc-dip',
    'Sharja': 'isc-sharja',
    'AlJada': 'isc-aljada',
    'Ajman': 'isc-ajman',
    'UEQ': 'isc-ueq',
    'RAK': 'isc-rak',
    'YAS': 'sabis-yas',
    'Ruwais': 'sis-ruwais',
    'Ain': 'isc-ain',
    'AIN': 'isc-ain',
    'Khalifa': 'isc-khalifa',
  }

  // Normalize branch name for lookup (handles case variations)
  const normalizeBranchName = (name: string): string => {
    const trimmed = name.trim()
    // Check exact match first
    if (branchNameToSlug[trimmed]) return trimmed
    // Check case-insensitive match
    const lowerName = trimmed.toLowerCase()
    for (const key of Object.keys(branchNameToSlug)) {
      if (key.toLowerCase() === lowerName) return key
    }
    return trimmed
  }

  // Detect which template format is being used
  const detectTemplateFormat = (lines: string[]): TemplateFormat => {
    if (lines.length < 2) return null
    
    const firstLine = lines[0].split('\t')
    const secondLine = lines[1].split('\t')
    
    // New format detection: 
    // - First row has "Sub-Recipes" or recipe count in first cell
    // - Second/third column has "Total" and "Unit" headers
    // - Branch names are in the header row directly
    const firstCell = firstLine[0]?.toLowerCase() || ''
    const hasSubRecipesHeader = firstCell.includes('sub-recipes') || /^\d+\s*sub-recipes/i.test(firstCell)
    const secondCell = (firstLine[1] || '').trim().toLowerCase()
    const thirdCell = (firstLine[2] || '').trim().toLowerCase()
    
    // Check if we have "Total" and "Unit" in positions 1 and 2 (new format header)
    if ((secondCell === 'total' && thirdCell === 'unit') || hasSubRecipesHeader) {
      console.log('Detected NEW template format')
      return 'new'
    }
    
    // Old format detection: second row has "Total" labels
    const hasSecondRowTotals = secondLine.some(cell => cell.trim().toLowerCase() === 'total')
    if (hasSecondRowTotals) {
      console.log('Detected OLD template format')
      return 'old'
    }
    
    // Try to detect by checking if branch names are directly in row 1 after first few columns
    const branchNamesLower = Object.keys(branchNameToSlug).map(n => n.toLowerCase())
    let branchesInFirstRow = 0
    for (let i = 3; i < firstLine.length; i++) {
      if (branchNamesLower.includes(firstLine[i]?.trim().toLowerCase())) {
        branchesInFirstRow++
      }
    }
    if (branchesInFirstRow >= 3) {
      console.log('Detected NEW template format (by branch names in row 1)')
      return 'new'
    }
    
    return null
  }

  // Parse the NEW template format
  const parseNewFormat = (lines: string[]): { branchColumns: Record<string, number>, dataStartRow: number } | null => {
    const headerLine = lines[0].split('\t')
    
    console.log('New format header:', headerLine)
    
    // Find branch column positions (branches are in row 1, after "Name", "Total", "Unit")
    const branchColumns: Record<string, number> = {}
    
    headerLine.forEach((cell, index) => {
      const trimmed = cell.trim()
      const normalizedName = normalizeBranchName(trimmed)
      if (branchNameToSlug[normalizedName]) {
        branchColumns[normalizedName] = index
        console.log(`Found branch ${normalizedName} at column ${index}`)
      }
    })
    
    if (Object.keys(branchColumns).length === 0) {
      return null
    }
    
    // Data starts from row 1 (index 1) since row 0 is headers
    return { branchColumns, dataStartRow: 1 }
  }

  // Parse the OLD template format
  const parseOldFormat = (lines: string[]): { branchTotalColumns: Record<string, number>, dataStartRow: number } | null => {
    const branchHeaderLine = lines[0]
    const secondHeaderLine = lines[1]
    const branchHeaders = branchHeaderLine.split('\t')
    const secondHeaders = secondHeaderLine.split('\t')
    
    const branchTotalColumns: Record<string, number> = {}
    
    branchHeaders.forEach((header, index) => {
      const trimmed = header.trim()
      const normalizedName = normalizeBranchName(trimmed)
      if (branchNameToSlug[normalizedName]) {
        // Found a branch, now find its Total column
        for (let i = index; i < Math.min(index + 15, secondHeaders.length); i++) {
          const cell = secondHeaders[i]?.trim() || ''
          if (cell.toLowerCase() === 'total') {
            branchTotalColumns[normalizedName] = i
            console.log(`Found Total column for ${normalizedName} at index ${i}`)
            break
          }
        }
      }
    })
    
    if (Object.keys(branchTotalColumns).length === 0) {
      return null
    }
    
    // Data starts from row 2 (index 2) in old format
    return { branchTotalColumns, dataStartRow: 2 }
  }

  const parseExcelData = () => {
    setError('')
    setParsedData(null)
    setDetectedFormat(null)
    
    try {
      const lines = pastedData.trim().split('\n')
      if (lines.length < 2) {
        setError('Please paste data with header row and at least one item row')
        return
      }

      // Detect which format we're dealing with
      const format = detectTemplateFormat(lines)
      console.log('Detected format:', format)
      
      if (format === 'new') {
        // Parse NEW template format
        const result = parseNewFormat(lines)
        if (!result || Object.keys(result.branchColumns).length === 0) {
          setError('Could not find branch columns in the new template format. Expected headers like: Soufouh, DIP, Sharja, etc.')
          return
        }
        
        setDetectedFormat('new')
        setError('')
        alert(`✓ Data parsed successfully!\n\nDetected: NEW Template Format\nFound ${Object.keys(result.branchColumns).length} branches: ${Object.keys(result.branchColumns).join(', ')}\n\nClick "Generate Dispatch Preview" to continue.`)
        
      } else if (format === 'old') {
        // Parse OLD template format
        const result = parseOldFormat(lines)
        if (!result || Object.keys(result.branchTotalColumns).length === 0) {
          setError('No branches with Total columns found in old template format.')
          return
        }
        
        setDetectedFormat('old')
        setError('')
        alert(`✓ Data parsed successfully!\n\nDetected: OLD Template Format\nFound ${Object.keys(result.branchTotalColumns).length} branches with Total columns.\n\nClick "Generate Dispatch Preview" to continue.`)
        
      } else {
        setError('Could not detect template format. Please make sure you copied the correct Excel data with branch headers.')
        return
      }
      
      // Set a dummy date since we're using totals
      setAvailableDates(['Weekly Total'])
      setSelectedDate('Weekly Total')
      
    } catch (err) {
      setError('Error parsing data. Please make sure you copied the correct Excel format.')
      console.error(err)
    }
  }

  const generateDispatch = () => {
    if (!selectedDate) {
      setError('Please select a delivery date')
      return
    }

    setError('')
    setLoading(true)

    try {
      const lines = pastedData.trim().split('\n')
      
      // Parse items based on detected format
      const branchData: Record<string, Array<{ name: string, quantity: number, unit: string }>> = {}
      
      if (detectedFormat === 'new') {
        // NEW TEMPLATE FORMAT
        const result = parseNewFormat(lines)
        if (!result) {
          setError('Failed to parse new template format')
          setLoading(false)
          return
        }
        
        const { branchColumns, dataStartRow } = result
        
        // Initialize branches
        Object.keys(branchColumns).forEach(branchName => {
          branchData[branchName] = []
        })
        
        // Find unit column index (should be column C, index 2)
        const headerLine = lines[0].split('\t')
        let unitColumnIndex = 2 // Default position
        for (let i = 0; i < Math.min(5, headerLine.length); i++) {
          if (headerLine[i]?.trim().toLowerCase() === 'unit') {
            unitColumnIndex = i
            break
          }
        }
        
        // Parse each data row
        for (let i = dataStartRow; i < lines.length; i++) {
          const cells = lines[i].split('\t')
          
          // Skip empty lines
          if (cells.length < 3 || !cells[0] || !cells[0].trim()) continue
          
          // Column A (index 0) = Recipe name in new format
          const itemName = cells[0].trim()
          
          // Skip if item name is a header or invalid
          if (!itemName || 
              itemName.toLowerCase().includes('sub-recipes') || 
              itemName.toLowerCase() === 'total' ||
              /^\d+\s*sub-recipes/i.test(itemName)) continue
          
          // Get unit from column C (index 2) - or use the unit column we found
          const rawUnit = cells[unitColumnIndex]?.trim() || 'Kg'
          // First check if item has a special unit mapping, otherwise use Excel data
          const excelUnit = rawUnit.toLowerCase() === 'unit' ? 'unit' : 
                       rawUnit.toLowerCase() === 'liter' || rawUnit.toLowerCase() === 'litre' ? 'Liter' :
                       rawUnit // Keep original unit (Kg, etc.)
          // Apply special unit mappings for specific items (overrides Excel data if item has a mapping)
          const unit = getItemUnit(itemName, excelUnit)
          
          // For each branch, get quantity from its column
          Object.entries(branchColumns).forEach(([branchName, columnIndex]) => {
            const quantityStr = cells[columnIndex]?.trim() || '0'
            
            // Parse quantity - handle numbers, commas, decimals
            let quantity = 0
            try {
              // Remove commas and parse as float
              const cleaned = quantityStr.replace(/,/g, '').split(/\s+/)[0] || '0'
              quantity = parseFloat(cleaned) || 0
            } catch {
              quantity = 0
            }
            
            // Only add if quantity > 0
            if (quantity > 0) {
              branchData[branchName].push({
                name: itemName,
                quantity: quantity,
                unit: unit
              })
            }
          })
        }
        
      } else {
        // OLD TEMPLATE FORMAT
        const result = parseOldFormat(lines)
        if (!result) {
          setError('Failed to parse old template format')
          setLoading(false)
          return
        }
        
        const { branchTotalColumns, dataStartRow } = result
        
        // Initialize branches
        Object.keys(branchTotalColumns).forEach(branchName => {
          branchData[branchName] = []
        })

        // Parse each item line
        for (let i = dataStartRow; i < lines.length; i++) {
          const cells = lines[i].split('\t')
          
          // Skip empty lines
          if (cells.length < 2 || !cells[1] || !cells[1].trim()) continue
          
          // Column B (index 1) = Recipe name in old format
          const itemName = cells[1].trim()
          
          // Skip if item name is invalid
          if (!itemName || itemName === 'Recipe') continue
          
          // For each branch, get the total quantity from the Total column
          Object.entries(branchTotalColumns).forEach(([branchName, totalColumnIndex]) => {
            const quantityStr = cells[totalColumnIndex]?.trim() || '0'
            
            // Parse quantity - handle numbers, commas, and multiple space-separated values
            let quantity = 0
            try {
              // Remove commas and get only the first number if there are multiple space-separated values
              const cleaned = quantityStr.replace(/,/g, '').split(/\s+/)[0] || '0'
              quantity = parseFloat(cleaned) || 0
            } catch {
              quantity = 0
            }
            
            // Determine unit using the item unit mapping (defaults to KG if no mapping)
            const unit = getItemUnit(itemName, 'KG')
            
            // Only add if quantity > 0
            if (quantity > 0) {
              branchData[branchName].push({
                name: itemName,
                quantity: quantity,
                unit: unit
              })
            }
          })
        }
      }

      // Convert to final structure
      const branchesWithItems: ParsedBranchData[] = []
      let totalItems = 0

      Object.entries(branchData).forEach(([branchName, items]) => {
        if (items.length > 0) {
          const slug = branchNameToSlug[branchName]
          const branch = branches.find(b => b.slug === slug)
          
          if (branch) {
            branchesWithItems.push({
              branchSlug: slug,
              branchName: branch.name,
              items: items
            })
            totalItems += items.length
          }
        }
      })

      const parsed: ParsedData = {
        deliveryDate: selectedDate,
        branches: branchesWithItems,
        totalItems: totalItems
      }

      setParsedData(parsed)
      setLoading(false)
      
    } catch (err) {
      setError('Error generating dispatch. Please check your data.')
      setLoading(false)
      console.error(err)
    }
  }

  const saveDispatch = async () => {
    if (!parsedData) return

    setLoading(true)
    
    try {
      // Since we're using weekly totals, use today's date or next Monday as the delivery date
      const today = new Date()
      const formattedDate = today.toISOString().split('T')[0] // Format: YYYY-MM-DD

      // Create dispatch object
      const dispatch = {
        id: `dispatch-${formattedDate}-${Date.now()}`,
        createdDate: new Date().toISOString(),
        deliveryDate: formattedDate,
        createdBy: 'Head Office',
        type: 'primary' as const,
        followUpDispatchIds: [],
        branchDispatches: parsedData.branches.map(branch => ({
          branchSlug: branch.branchSlug,
          branchName: branch.branchName,
          status: 'pending' as const,
          items: branch.items.map((item, index) => ({
            id: `${branch.branchSlug}-item-${index}`,
            name: item.name,
            orderedQty: item.quantity,
            packedQty: null,
            receivedQty: null,
            unit: item.unit,
            packedChecked: false,
            receivedChecked: false,
            notes: '',
            issue: null
          })),
          // Packing checkpoint
          packedBy: null,
          packingStartedAt: null,
          packingCompletedAt: null,
          // Receiving checkpoint
          receivedBy: null,
          receivingStartedAt: null,
          receivedAt: null,
          completedAt: null,
          overallNotes: ''
        }))
      }

      // Save to dispatches.json via API
      const response = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatch)
      })

      if (!response.ok) {
        throw new Error('Failed to save dispatch')
      }

      setSuccess(true)
      setLoading(false)
      
      setTimeout(() => {
        router.push('/dispatch')
      }, 2000)
      
    } catch (err) {
      setError('Error saving dispatch. Please try again.')
      setLoading(false)
      console.error(err)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <main className="flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0">
        <div className="flex-1 container mx-auto px-4 py-8">
          <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Dispatch', href: '/dispatch' },
            { label: 'Upload' },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Dispatch Order</h1>
          <p className="text-muted-foreground">Upload or paste Excel data to create dispatch orders for branches</p>
        </div>

        {success ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Dispatch Created Successfully!</h2>
                <p className="text-muted-foreground mb-4">
                  {parsedData?.branches.length} branches can now see their deliveries
                </p>
                <p className="text-sm text-muted-foreground">Redirecting to dispatch dashboard...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Step 1: Paste Data */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Step 1: Paste Excel Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Copy and paste your Excel data here (including headers):
                    </label>
                    <textarea
                      className="w-full h-64 p-3 border rounded-lg font-mono text-sm"
                      placeholder="Paste Excel data here (Ctrl+C from Excel, then Ctrl+V here)...&#10;&#10;Supports both formats:&#10;• NEW: Recipe Name | Total | Unit | Soufouh | DIP | Sharja | ...&#10;• OLD: Branch headers with Total sub-columns&#10;&#10;Include the header row and all item rows."
                      value={pastedData}
                      onChange={(e) => setPastedData(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={parseExcelData} 
                    disabled={!pastedData.trim()}
                    size="lg"
                  >
                    Parse Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Generate Dispatch */}
            {availableDates.length > 0 && !parsedData && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Step 2: Generate Dispatch from Total Quantities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {detectedFormat && (
                      <div className={`p-3 rounded-lg ${detectedFormat === 'new' ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
                        <div className="font-medium text-sm">
                          {detectedFormat === 'new' ? '📋 New Template Format Detected' : '📄 Old Template Format Detected'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {detectedFormat === 'new' 
                            ? 'Format: Recipe Name | Total | Unit | Branch quantities in columns...'
                            : 'Format: Branch headers with "Total" sub-columns...'}
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      This will create a dispatch using the total quantities for each branch.
                    </p>
                    <Button onClick={generateDispatch} size="lg" disabled={loading}>
                      {loading ? 'Generating...' : 'Generate Dispatch Preview'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Preview & Confirm */}
            {parsedData && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Step 3: Preview & Confirm</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Dispatch Type</div>
                          <div className="text-lg font-semibold">Weekly Total</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Branches</div>
                          <div className="text-lg font-semibold">{parsedData.branches.length}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total Items</div>
                          <div className="text-lg font-semibold">{parsedData.totalItems}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold">Branches & Items:</h3>
                      {parsedData.branches.map(branch => (
                        <div key={branch.branchSlug} className="border-l-4 border-primary pl-4 py-2">
                          <div className="font-medium">{branch.branchName}</div>
                          <div className="text-sm text-muted-foreground">
                            {branch.items.length} items
                          </div>
                          <details className="mt-2">
                            <summary className="text-sm text-primary cursor-pointer hover:underline">
                              View items
                            </summary>
                            <div className="mt-2 text-sm space-y-1">
                              {branch.items.slice(0, 10).map((item, idx) => (
                                <div key={idx} className="text-muted-foreground">
                                  • {item.name}: {item.quantity} {item.unit}
                                </div>
                              ))}
                              {branch.items.length > 10 && (
                                <div className="text-muted-foreground italic">
                                  ... and {branch.items.length - 10} more items
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button 
                        onClick={saveDispatch} 
                        size="lg" 
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? 'Creating...' : '📤 Create Digital Dispatches'}
                      </Button>
                      <Button 
                        onClick={() => setParsedData(null)} 
                        variant="outline"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <Card className="border-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 text-red-600">
                    <AlertCircle className="h-5 w-5 mt-0.5" />
                    <div>
                      <div className="font-semibold">Error</div>
                      <div className="text-sm">{error}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            </>
          )}
        </div>

        <Footer />
      </main>
    </div>
  )
}

