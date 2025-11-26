'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NotificationDropdown } from '@/components/NotificationDropdown'

interface TopNavProps {
  onSearch?: (query: string) => void
  searchQuery?: string
}

export function TopNav({ onSearch, searchQuery }: TopNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="sticky top-0 z-50 glass-nav border-b border-border no-print">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-lg sm:text-xl font-bold text-primary">Mikana</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            <Link 
              href="/" 
              className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
            >
              Branches
            </Link>
            <Link 
              href="/dispatch" 
              className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
            >
              Dispatch
            </Link>
            <Link 
              href="/admin" 
              className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
            >
              Admin
            </Link>
          </div>

          {/* Desktop Search Bar */}
          {onSearch && !isMobileSearchOpen && (
            <div className="flex-1 max-w-md mx-4 relative hidden sm:block">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <Input
                type="text"
                placeholder="Search branches..."
                value={searchQuery || ''}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Search Button */}
            {onSearch && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                aria-label="Toggle search"
                className="sm:hidden"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </Button>
            )}

            {/* Notification Bell */}
            <NotificationDropdown />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              className="md:hidden"
            >
              {isMobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {onSearch && isMobileSearchOpen && (
          <div className="mt-3 sm:hidden">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <Input
                type="text"
                placeholder="Search branches..."
                value={searchQuery || ''}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-10 w-full"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-3 pb-2 border-t border-border pt-3">
            <div className="flex flex-col gap-2">
              <Link 
                href="/" 
                className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                onClick={closeMobileMenu}
              >
                Branches
              </Link>
              <Link 
                href="/dispatch" 
                className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                onClick={closeMobileMenu}
              >
                Dispatch
              </Link>
              <Link 
                href="/admin" 
                className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                onClick={closeMobileMenu}
              >
                Admin
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
