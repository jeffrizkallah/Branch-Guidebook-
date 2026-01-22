'use client'

import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { useRolePreview } from '@/lib/role-preview'

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isPreviewMode } = useRolePreview()
  
  return (
    <div className="flex min-h-screen">
      <RoleSidebar />
      <main className={`flex-1 flex flex-col pt-16 md:pt-0 ${isPreviewMode ? 'mt-10' : ''}`}>
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  )
}

