import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { sql } from '@vercel/postgres'
import { authOptions } from '@/lib/auth-options'
import * as XLSX from 'xlsx'

// Configure route to handle larger file uploads
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout

// AI-powered branch name matching
function matchBranchSlug(excelBranchName: string, branches: any[]): string | null {
  if (!excelBranchName) return null
  
  const normalized = excelBranchName.toLowerCase().trim().replace(/[_\s-]+/g, '-')
  
  // Direct match
  const directMatch = branches.find(b => 
    b.slug === normalized || 
    b.name.toLowerCase() === excelBranchName.toLowerCase()
  )
  if (directMatch) return directMatch.slug
  
  // Fuzzy match - check if branch name contains key parts
  const fuzzyMatch = branches.find(b => {
    const branchWords = b.name.toLowerCase().split(/[\s-_]+/)
    const excelWords = excelBranchName.toLowerCase().split(/[\s-_]+/)
    
    // Check if major keywords match
    return excelWords.some(word => 
      word.length > 2 && branchWords.some((bWord: string) => 
        bWord.includes(word) || word.includes(bWord)
      )
    )
  })
  
  return fuzzyMatch?.slug || null
}

// Parse date from various formats
function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null
  
  // If it's already a date
  if (dateValue instanceof Date) return dateValue
  
  // If it's an Excel serial date number
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + dateValue * 86400000)
    return date
  }
  
  // If it's a string, try to parse it (MM/DD/YYYY format)
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue)
    if (!isNaN(parsed.getTime())) return parsed
  }
  
  return null
}

// Normalize section names
function normalizeSection(section: string): string {
  if (!section) return 'Hot'
  
  const normalized = section.toLowerCase().trim()
  if (normalized.includes('hot')) return 'Hot'
  if (normalized.includes('cold')) return 'Cold'
  if (normalized.includes('bakery') || normalized.includes('bake')) return 'Bakery'
  if (normalized.includes('beverage') || normalized.includes('drink')) return 'Beverages'
  
  return 'Hot' // default
}

// AI-powered column mapping
function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  
  const patterns: Record<string, string[]> = {
    branch: ['branch', 'location', 'site', 'store'],
    date: ['date', 'submission', 'submitted', 'time', 'timestamp'],
    productName: ['product name', 'product', 'item', 'food', 'dish'],
    section: ['section', 'category', 'type', 'item type', 'department'],
    tasteScore: ['taste score', 'taste', 'flavor score', 'flavor'],
    tasteNotes: ['taste note', 'taste comment', 'flavor note'],
    appearanceScore: ['appearance score', 'appearance', 'look score', 'visual score'],
    appearanceNotes: ['appearance note', 'appearance comment', 'look note'],
    portionQtyGm: ['portion qty in gm', 'portion qty', 'portion', 'weight', 'qty', 'gram', 'gm', 'quantity'],
    portionNotes: ['portion note', 'portion comment', 'weight note'],
    tempCelsius: ['temp score in c', 'temp score', 'temp', 'temperature', 'celsius', '°c', 'deg'],
    mealService: ['meal', 'service', 'meal service'],
    remarks: ['remark', 'comment', 'observation'],
    correctiveAction: ['corrective action required', 'corrective', 'action required'],
    correctiveActionNotes: ['corrective note', 'action note']
  }
  
  // Track which headers have been used to avoid double-mapping
  const usedHeaders = new Set<string>()
  
  for (const [field, keywords] of Object.entries(patterns)) {
    let bestMatch: string | null = null
    let bestMatchScore = 0
    
    for (const header of headers) {
      if (usedHeaders.has(header)) continue
      
      const headerLower = header.toLowerCase().trim()
      
      // Check each keyword
      for (const keyword of keywords) {
        // Exact match gets highest priority
        if (headerLower === keyword) {
          bestMatch = header
          bestMatchScore = 100
          break
        }
        // Contains match with higher score for longer matches
        else if (headerLower.includes(keyword)) {
          const score = keyword.length
          if (score > bestMatchScore) {
            bestMatch = header
            bestMatchScore = score
          }
        }
      }
      
      if (bestMatchScore === 100) break // Found exact match, no need to continue
    }
    
    if (bestMatch) {
      mapping[field] = bestMatch
      usedHeaders.add(bestMatch)
    }
  }
  
  return mapping
}

// Extract value from row using column name
function getRowValue(row: any, columnName: string): any {
  if (!columnName || !row) return null
  return row[columnName]
}

export async function POST(request: Request) {
  console.log('📥 Quality check import started')
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log('❌ Unauthorized: No session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    console.log('✅ User authenticated:', user.email, 'Role:', user.role)
    
    // Only admins and operations leads can import
    if (user.role !== 'admin' && user.role !== 'operations_lead') {
      console.log('❌ Forbidden: User role', user.role)
      return NextResponse.json({ error: 'Only admins can import quality checks' }, { status: 403 })
    }

    // Parse the uploaded file
    console.log('📄 Parsing form data...')
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.log('❌ No file in form data')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('📄 File received:', file.name, 'Size:', file.size, 'bytes')

    // Read the file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('✅ File buffer created, size:', buffer.length)
    
    // Parse Excel file
    console.log('📊 Parsing Excel file...')
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    console.log('📊 Sheet name:', sheetName)
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null })
    console.log('📊 Rows found:', rawData.length)
    
    if (rawData.length === 0) {
      console.log('❌ No data in Excel file')
      return NextResponse.json({ error: 'No data found in Excel file' }, { status: 400 })
    }

    // Get all branches for matching
    console.log('🏢 Fetching branches from database...')
    const branchesResult = await sql`SELECT slug, name FROM branches`
    const branches = branchesResult.rows
    console.log('🏢 Branches found:', branches.length)

    // Detect column mapping using AI
    const headers = Object.keys(rawData[0] as any)
    console.log('🤖 Detecting columns:', headers.join(', '))
    const columnMapping = detectColumnMapping(headers)
    console.log('🤖 Column mapping:', JSON.stringify(columnMapping, null, 2))

    // Process each row
    const results = {
      success: [] as number[],
      warnings: [] as { row: number; message: string; data?: any }[],
      errors: [] as { row: number; message: string }[]
    }

    console.log('🔄 Processing rows...')
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as any
      const rowNumber = i + 2 // Excel row number (1-indexed + header)

      try {
        // Extract data using column mapping
        const branchName = getRowValue(row, columnMapping.branch)
        const branchSlug = matchBranchSlug(branchName, branches)
        
        if (!branchSlug) {
          results.errors.push({
            row: rowNumber,
            message: `Branch "${branchName}" not found or could not be matched`
          })
          continue
        }

        const dateValue = getRowValue(row, columnMapping.date)
        const submissionDate = parseDate(dateValue)
        
        if (!submissionDate) {
          results.warnings.push({
            row: rowNumber,
            message: `Invalid date "${dateValue}", using current date`
          })
        }

        const productName = getRowValue(row, columnMapping.productName)
        if (!productName) {
          results.errors.push({
            row: rowNumber,
            message: 'Product name is required'
          })
          continue
        }

        const sectionRaw = getRowValue(row, columnMapping.section) || 'Hot'
        const section = normalizeSection(sectionRaw)

        const tasteScoreRaw = getRowValue(row, columnMapping.tasteScore)
        let tasteScore = 0
        
        if (!columnMapping.tasteScore) {
          results.errors.push({
            row: rowNumber,
            message: `Taste Score column not found in Excel. Available columns: ${headers.slice(0, 5).join(', ')}...`
          })
          continue
        }
        
        if (tasteScoreRaw === null || tasteScoreRaw === undefined || tasteScoreRaw === '') {
          results.errors.push({
            row: rowNumber,
            message: `Taste score is empty (column: "${columnMapping.tasteScore}"). Must be 1-5`
          })
          continue
        }
        
        tasteScore = parseInt(String(tasteScoreRaw).trim())
        
        if (isNaN(tasteScore) || tasteScore < 1 || tasteScore > 5) {
          results.errors.push({
            row: rowNumber,
            message: `Invalid taste score value "${tasteScoreRaw}" (column: "${columnMapping.tasteScore}"). Must be a number 1-5`
          })
          continue
        }

        const appearanceScoreRaw = getRowValue(row, columnMapping.appearanceScore)
        let appearanceScore = 0
        
        if (!columnMapping.appearanceScore) {
          results.errors.push({
            row: rowNumber,
            message: `Appearance Score column not found in Excel. Available columns: ${headers.slice(0, 5).join(', ')}...`
          })
          continue
        }
        
        if (appearanceScoreRaw === null || appearanceScoreRaw === undefined || appearanceScoreRaw === '') {
          results.errors.push({
            row: rowNumber,
            message: `Appearance score is empty (column: "${columnMapping.appearanceScore}"). Must be 1-5`
          })
          continue
        }
        
        appearanceScore = parseInt(String(appearanceScoreRaw).trim())
        
        if (isNaN(appearanceScore) || appearanceScore < 1 || appearanceScore > 5) {
          results.errors.push({
            row: rowNumber,
            message: `Invalid appearance score value "${appearanceScoreRaw}" (column: "${columnMapping.appearanceScore}"). Must be a number 1-5`
          })
          continue
        }

        const portionRaw = getRowValue(row, columnMapping.portionQtyGm)
        let portionQtyGm = portionRaw ? parseFloat(String(portionRaw).trim()) : 0
        
        if (!portionQtyGm || isNaN(portionQtyGm) || portionQtyGm <= 0) {
          portionQtyGm = 100 // default
          results.warnings.push({
            row: rowNumber,
            message: `Invalid/missing portion quantity "${portionRaw}", using default 100g`
          })
        }

        const tempRaw = getRowValue(row, columnMapping.tempCelsius)
        const tempCelsius = tempRaw ? parseFloat(String(tempRaw).trim()) : 0
        
        const tasteNotes = getRowValue(row, columnMapping.tasteNotes) || null
        const appearanceNotes = getRowValue(row, columnMapping.appearanceNotes) || null
        const portionNotes = getRowValue(row, columnMapping.portionNotes) || null
        const remarks = getRowValue(row, columnMapping.remarks) || null

        // Determine meal service from time or default to lunch
        let mealService = getRowValue(row, columnMapping.mealService) || 'lunch'
        if (mealService && typeof mealService === 'string') {
          mealService = mealService.toLowerCase().includes('breakfast') ? 'breakfast' : 'lunch'
        }

        // Corrective action
        const correctiveActionRaw = getRowValue(row, columnMapping.correctiveAction)
        const correctiveActionTaken = correctiveActionRaw === true || 
                                       correctiveActionRaw === 'TRUE' || 
                                       correctiveActionRaw === 'Yes' ||
                                       correctiveActionRaw === '1' ||
                                       correctiveActionRaw === 1
        
        const correctiveActionNotes = getRowValue(row, columnMapping.correctiveActionNotes) || null

        // Insert into database
        const result = await sql`
          INSERT INTO quality_checks (
            branch_slug,
            submitted_by,
            submission_date,
            meal_service,
            product_name,
            section,
            taste_score,
            appearance_score,
            portion_qty_gm,
            temp_celsius,
            taste_notes,
            portion_notes,
            appearance_notes,
            remarks,
            corrective_action_taken,
            corrective_action_notes,
            photos,
            status
          ) VALUES (
            ${branchSlug},
            ${user.id},
            ${(submissionDate || new Date()).toISOString()},
            ${mealService},
            ${productName},
            ${section},
            ${tasteScore},
            ${appearanceScore},
            ${portionQtyGm > 0 ? portionQtyGm : 100},
            ${tempCelsius},
            ${tasteNotes},
            ${portionNotes},
            ${appearanceNotes},
            ${remarks},
            ${correctiveActionTaken},
            ${correctiveActionNotes},
            '[]'::jsonb,
            'submitted'
          )
          RETURNING id
        `

        results.success.push(result.rows[0].id)
      } catch (error: any) {
        console.error(`❌ Error on row ${rowNumber}:`, error.message)
        results.errors.push({
          row: rowNumber,
          message: error.message || 'Unknown error'
        })
      }
    }

    console.log('✅ Import complete:', {
      total: rawData.length,
      success: results.success.length,
      warnings: results.warnings.length,
      errors: results.errors.length
    })

    return NextResponse.json({
      success: true,
      total: rawData.length,
      imported: results.success.length,
      warnings: results.warnings.length,
      errors: results.errors.length,
      details: results,
      columnMapping
    })
  } catch (error: any) {
    console.error('❌ Fatal error importing quality checks:', error)
    console.error('Stack trace:', error.stack)
    return NextResponse.json({ 
      error: 'Failed to import quality checks', 
      details: error.message 
    }, { status: 500 })
  }
}

