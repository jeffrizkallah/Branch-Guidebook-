import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import type { UserRole } from '@/lib/auth'

/**
 * Get the effective role for the current request.
 * If the user is an admin and has set a preview role cookie, returns the preview role.
 * Otherwise returns the user's actual role.
 * 
 * Use this in API routes to filter data based on what an admin is previewing.
 */
export async function getEffectiveRole(): Promise<{
  actualRole: UserRole | null
  effectiveRole: UserRole | null
  isPreviewMode: boolean
  userId: number | null
}> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return {
      actualRole: null,
      effectiveRole: null,
      isPreviewMode: false,
      userId: null,
    }
  }
  
  const actualRole = session.user.role as UserRole | null
  const userId = session.user.id as number | null
  
  // Only admins can preview
  if (actualRole !== 'admin') {
    return {
      actualRole,
      effectiveRole: actualRole,
      isPreviewMode: false,
      userId,
    }
  }
  
  // Check for preview role cookie
  const cookieStore = await cookies()
  const previewCookie = cookieStore.get('role-preview')
  
  if (previewCookie?.value) {
    const previewRole = previewCookie.value as UserRole
    // Validate it's a valid role
    const validRoles: UserRole[] = ['admin', 'regional_manager', 'operations_lead', 'dispatcher', 'central_kitchen', 'branch_manager', 'branch_staff']
    if (validRoles.includes(previewRole)) {
      return {
        actualRole,
        effectiveRole: previewRole,
        isPreviewMode: previewRole !== actualRole,
        userId,
      }
    }
  }
  
  return {
    actualRole,
    effectiveRole: actualRole,
    isPreviewMode: false,
    userId,
  }
}

/**
 * Helper to check if the effective role has access to a resource.
 * Use this in API routes to filter data.
 */
export function roleCanAccess(effectiveRole: UserRole | null, resource: string): boolean {
  if (!effectiveRole) return false
  
  switch (resource) {
    case 'admin_dashboard':
    case 'user_management':
      return effectiveRole === 'admin'
    
    case 'recipes':
    case 'prep_instructions':
    case 'production_schedules':
      return ['admin', 'operations_lead'].includes(effectiveRole)
    
    case 'dispatch':
      return ['admin', 'operations_lead', 'dispatcher', 'central_kitchen'].includes(effectiveRole)
    
    case 'analytics':
      return ['admin', 'regional_manager', 'operations_lead'].includes(effectiveRole)
    
    case 'all_branches':
      return ['admin', 'regional_manager', 'operations_lead', 'dispatcher'].includes(effectiveRole)
    
    case 'regional':
      return ['admin', 'regional_manager'].includes(effectiveRole)
    
    case 'kitchen':
      return ['admin', 'operations_lead', 'central_kitchen'].includes(effectiveRole)
    
    default:
      return true
  }
}

