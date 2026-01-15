'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { UserRole } from '@/lib/auth'

// Role landing pages
export const roleLandingPages: Record<UserRole, string> = {
  admin: '/admin',
  regional_manager: '/regional',
  operations_lead: '/operations',
  dispatcher: '/dispatch',
  central_kitchen: '/kitchen',
  branch_manager: '/dashboard',
  branch_staff: '/branch', // Redirected to specific branch by middleware
}

export function useAuth(options?: { 
  required?: boolean
  allowedRoles?: UserRole[]
  redirectTo?: string 
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const loading = status === 'loading'
  const authenticated = status === 'authenticated'
  const user = session?.user

  useEffect(() => {
    if (loading) return

    // If auth is required and user is not authenticated, redirect
    if (options?.required && !authenticated) {
      router.push(options.redirectTo || '/login')
      return
    }

    // If user is pending, redirect to pending page
    if (authenticated && user?.status === 'pending') {
      router.push('/pending')
      return
    }

    // If specific roles are required, check access
    if (options?.allowedRoles && authenticated && user?.role) {
      if (!options.allowedRoles.includes(user.role as UserRole)) {
        const landingPage = roleLandingPages[user.role as UserRole] || '/'
        router.push(landingPage)
      }
    }
  }, [loading, authenticated, user, options, router])

  // Helper functions
  const hasRole = (role: UserRole | UserRole[]) => {
    if (!user?.role) return false
    if (Array.isArray(role)) {
      return role.includes(user.role as UserRole)
    }
    return user.role === role
  }

  const canAccess = (resource: string) => {
    if (!user?.role) return false
    
    switch (resource) {
      case 'admin':
        return user.role === 'admin'
      case 'regional':
        return ['admin', 'regional_manager'].includes(user.role)
      case 'users':
        return ['admin', 'dispatcher'].includes(user.role)
      case 'recipes':
      case 'prep_instructions':
      case 'production_schedules':
        return ['admin', 'operations_lead'].includes(user.role)
      case 'dispatch':
        return ['admin', 'operations_lead', 'dispatcher'].includes(user.role)
      case 'kitchen':
        return ['admin', 'operations_lead', 'central_kitchen'].includes(user.role)
      case 'dashboard':
        return ['admin', 'operations_lead', 'branch_manager'].includes(user.role)
      case 'operations':
        return ['admin', 'operations_lead'].includes(user.role)
      case 'analytics':
        return ['admin', 'regional_manager', 'operations_lead'].includes(user.role)
      case 'quality_control':
        return ['admin', 'regional_manager', 'operations_lead'].includes(user.role)
      case 'budget':
        return ['admin', 'regional_manager'].includes(user.role)
      default:
        return true
    }
  }

  const canEdit = (resource: string) => {
    if (!user?.role) return false
    
    switch (resource) {
      case 'recipes':
      case 'prep_instructions':
      case 'production_schedules':
        return ['admin', 'operations_lead'].includes(user.role)
      case 'dispatch':
        return ['admin', 'operations_lead', 'dispatcher'].includes(user.role)
      case 'users':
        return ['admin', 'dispatcher'].includes(user.role)
      case 'branches':
        return ['admin', 'operations_lead'].includes(user.role)
      default:
        return false
    }
  }

  const hasBranchAccess = (branchSlug: string) => {
    if (!user) return false
    
    // Admin, regional_manager, and operations_lead have access to all branches
    if (['admin', 'regional_manager', 'operations_lead'].includes(user.role || '')) return true
    
    // Dispatchers can view all branches
    if (user.role === 'dispatcher') return true
    
    // Central kitchen only has access to central-kitchen
    if (user.role === 'central_kitchen') return branchSlug === 'central-kitchen'
    
    // Branch managers and staff only have access to assigned branches
    if (user.role === 'branch_manager' || user.role === 'branch_staff') {
      return user.branches?.includes(branchSlug) || false
    }
    
    return false
  }

  return {
    user,
    loading,
    authenticated,
    hasRole,
    canAccess,
    canEdit,
    hasBranchAccess,
    isAdmin: user?.role === 'admin',
    isRegionalManager: user?.role === 'regional_manager',
    isOperationsLead: user?.role === 'operations_lead',
    isDispatcher: user?.role === 'dispatcher',
    isCentralKitchen: user?.role === 'central_kitchen',
    isBranchManager: user?.role === 'branch_manager',
    isBranchStaff: user?.role === 'branch_staff',
  }
}

