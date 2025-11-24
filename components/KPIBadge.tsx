import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface KPIBadgeProps {
  label: string
  value: string
  type?: 'waste' | 'hygiene' | 'sales' | 'default'
}

export function KPIBadge({ label, value, type = 'default' }: KPIBadgeProps) {
  const getVariantClass = () => {
    if (type === 'waste') {
      const wasteNum = parseFloat(value)
      if (wasteNum <= 2.5) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      if (wasteNum <= 3.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    
    if (type === 'hygiene') {
      const score = parseInt(value)
      if (score >= 95) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      if (score >= 90) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }

    return 'bg-secondary text-secondary-foreground'
  }

  return (
    <Badge variant="outline" className={cn('font-medium text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 w-full justify-center break-words', getVariantClass())}>
      <span className="truncate">{label}: {value}</span>
    </Badge>
  )
}

