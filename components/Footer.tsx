import Link from 'next/link'
import { Lock } from 'lucide-react'

export function Footer() {
  const version = '2.0.0'
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t bg-background no-print">
      <div className="container mx-auto px-3 xs:px-4 py-3 xs:py-4">
        <div className="flex flex-col xs:flex-row justify-between items-center gap-2 xs:gap-4 text-[10px] xs:text-xs sm:text-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-primary">Mikana</span> <span className="hidden xs:inline">Branch </span>Guidebook
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 xs:gap-3 sm:gap-4">
            <Link href="/admin" className="hover:text-primary flex items-center gap-1">
              <Lock className="h-2.5 w-2.5 xs:h-3 xs:w-3" /> Admin
            </Link>
            <span>v{version}</span>
            <span>© {currentYear} Mikana</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
