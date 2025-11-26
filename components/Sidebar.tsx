'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { Home, Package, Settings, ChevronLeft, ChevronRight, Search, Menu, X } from 'lucide-react'

interface SidebarProps {
  onSearch?: (query: string) => void
  searchQuery?: string
}

export function Sidebar({ onSearch, searchQuery }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const navItems = [
    { href: '/', label: 'Branches', icon: Home },
    { href: '/dispatch', label: 'Dispatch', icon: Package },
    { href: '/admin', label: 'Admin', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const closeMobile = () => {
    setIsMobileOpen(false)
  }

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass-nav border-b border-border no-print">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">Mikana</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationDropdown />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Toggle menu"
            >
              {isMobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 no-print"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-50 glass-nav border-r border-border no-print
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-[80px]' : 'w-[280px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          flex flex-col
        `}
      >
        {/* Logo Section */}
        <div className={`px-4 py-3 border-b border-border flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">Mikana</span>
            </Link>
          )}
          
          <div className="hidden md:flex items-center gap-1">
            {/* Notification Bell (Desktop) */}
            {!isCollapsed && <NotificationDropdown />}
            
            {/* Desktop Collapse Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Search Section (if provided) */}
        {onSearch && (
          <div className={`p-4 border-b border-border ${isCollapsed ? 'px-2' : ''}`}>
            {isCollapsed ? (
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                title="Expand to search"
              >
                <Search className="h-5 w-5" />
              </Button>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search branches..."
                  value={searchQuery || ''}
                  onChange={(e) => onSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  text-sm font-medium transition-all duration-200
                  ${active 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer Section (optional) */}
        <div className={`p-4 border-t border-border text-xs text-muted-foreground ${isCollapsed ? 'text-center' : ''}`}>
          {!isCollapsed && (
            <p>Branch Guidebook v1.0</p>
          )}
        </div>
      </aside>

      {/* Spacer for desktop to prevent content from going under sidebar */}
      <div 
        className={`hidden md:block transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[80px]' : 'w-[280px]'}`}
      />
    </>
  )
}

