import Link from 'next/link'
import { Lock } from 'lucide-react'

export function Footer() {
  const version = '2.0.0'
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t bg-background no-print">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-primary">Mikana</span> Branch Guidebook
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="hover:text-primary flex items-center gap-1">
              <Lock className="h-3 w-3" /> Admin
            </Link>
            <span>Version {version}</span>
            <span>© {currentYear} Mikana Group</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
