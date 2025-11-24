import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 md:mb-4 no-print overflow-x-auto pb-1">
      <ol className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground whitespace-nowrap min-w-0">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {index > 0 && <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

