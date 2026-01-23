'use client'

import { ReactNode } from 'react'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { useRolePreview } from '@/lib/role-preview'

interface PageLayoutProps {
  children: ReactNode
  showFooter?: boolean
  maxWidth?: 'default' | 'full' | '7xl'
}

/**
 * Standard page layout with role sidebar, footer, and preview mode support.
 * Automatically handles top margin when role preview banner is active.
 * Optimized for all screen sizes including foldable devices.
 */
export function PageLayout({ children, showFooter = true, maxWidth = 'default' }: PageLayoutProps) {
  const { isPreviewMode } = useRolePreview()
  
  const maxWidthClass = 
    maxWidth === 'full' ? 'max-w-full' :
    maxWidth === '7xl' ? 'max-w-7xl' :
    ''
  
  return (
    <div className="flex min-h-screen">
      <RoleSidebar />
      <main className={`flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0 ${isPreviewMode ? 'mt-10' : ''}`}>
        <div className={`flex-1 container mx-auto px-3 xs:px-4 sm:px-5 md:px-6 py-4 xs:py-6 md:py-8 ${maxWidthClass}`}>
          {children}
        </div>
        {showFooter && <Footer />}
      </main>
    </div>
  )
}

