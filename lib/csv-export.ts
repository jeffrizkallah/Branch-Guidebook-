import type { Shortage } from '@/app/kitchen/ingredient-problems/components/ShortagesTable'

export function exportShortagesToCSV(shortages: Shortage[], filename?: string) {
  // CSV headers
  const headers = [
    'Priority',
    'Ingredient Name',
    'Status',
    'Required',
    'Available',
    'Shortfall',
    'Unit',
    'Production Date',
    'Detected At',
    'Affected Recipes',
    'Affected Production Items',
    'Resolution Status',
    'Resolution Action',
    'Resolution Notes'
  ]

  // Convert data to CSV rows
  const rows = shortages.map(shortage => [
    shortage.priority,
    shortage.ingredient_name,
    shortage.status,
    shortage.required_quantity,
    shortage.available_quantity,
    Math.abs(shortage.shortfall_amount),
    shortage.unit,
    new Date(shortage.production_date).toLocaleDateString(),
    new Date(shortage.created_at).toLocaleString(),
    shortage.affected_recipes.join('; '),
    shortage.affected_production_items.join('; '),
    shortage.resolution_status || '',
    shortage.resolution_action || '',
    shortage.resolution_notes || ''
  ])

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    )
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  const defaultFilename = `inventory_shortages_${new Date().toISOString().split('T')[0]}_${new Date().toTimeString().split(' ')[0].replace(/:/g, '-')}.csv`
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename || defaultFilename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
