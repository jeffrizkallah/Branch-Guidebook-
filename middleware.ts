import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Role-based landing pages
const roleLandingPages: Record<string, string> = {
  admin: '/admin',
  regional_manager: '/regional',
  operations_lead: '/operations',
  dispatcher: '/dispatch',
  central_kitchen: '/kitchen',
  head_chef: '/kitchen/head-chef',
  station_staff: '/kitchen/station',
  branch_manager: '/dashboard',
  branch_staff: '/branch', // Will redirect to their specific branch
}

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/signup',
  '/pending',
]

// Routes that require specific roles
const roleRestrictedRoutes: Record<string, string[]> = {
  '/recipes': ['admin', 'operations_lead', 'central_kitchen', 'head_chef', 'station_staff'],
  '/admin/recipe-instructions': ['admin', 'operations_lead'],
  '/admin/production-schedules': ['admin', 'operations_lead'],
  '/admin/quality-control': ['admin', 'operations_lead'],
  '/admin/users': ['admin', 'dispatcher'],
  '/admin': ['admin'],
  '/regional': ['admin', 'regional_manager'],
  '/operations': ['admin', 'operations_lead'],
  '/dispatch': ['admin', 'operations_lead', 'dispatcher'],
  '/kitchen/head-chef': ['admin', 'operations_lead', 'head_chef'],
  '/kitchen/station': ['admin', 'station_staff'],
  '/kitchen': ['admin', 'operations_lead', 'central_kitchen', 'head_chef', 'station_staff'],
  '/dashboard': ['admin', 'operations_lead', 'branch_manager'],
}

// Roles that can access all branches
const allBranchAccessRoles = ['admin', 'regional_manager', 'operations_lead', 'dispatcher']

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Skip public routes
    if (publicRoutes.some(route => path.startsWith(route))) {
      return NextResponse.next()
    }

    // If not authenticated, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // If user is pending, redirect to pending page
    if (token.status === 'pending' || token.status === 'rejected') {
      if (path !== '/pending') {
        return NextResponse.redirect(new URL('/pending', req.url))
      }
      return NextResponse.next()
    }

    // If user is on pending page but is active, redirect to their landing page
    if (path === '/pending' && token.status === 'active') {
      const role = token.role as string
      const branches = (token.branches as string[]) || []
      
      // Branch staff goes directly to their branch
      if (role === 'branch_staff' && branches.length > 0) {
        return NextResponse.redirect(new URL(`/branch/${branches[0]}`, req.url))
      }
      
      const landingPage = roleLandingPages[role] || '/'
      return NextResponse.redirect(new URL(landingPage, req.url))
    }

    const userRole = token.role as string
    const userBranches = (token.branches as string[]) || []

    // Branch staff special handling - can only access their assigned branch
    if (userRole === 'branch_staff') {
      // Allow profile page
      if (path === '/profile') {
        return NextResponse.next()
      }
      
      // Allow their assigned branch page
      if (path.startsWith('/branch/')) {
        const branchSlug = path.split('/')[2]
        if (userBranches.includes(branchSlug)) {
          return NextResponse.next()
        }
      }
      
      // Allow dispatch pages for their assigned branches (packing/receiving)
      // Path format: /dispatch/[id]/branch/[slug]
      if (path.startsWith('/dispatch/')) {
        const pathParts = path.split('/')
        // Check if it's a branch-specific dispatch page
        if (pathParts[3] === 'branch' && pathParts[4]) {
          const branchSlug = pathParts[4]
          if (userBranches.includes(branchSlug)) {
            return NextResponse.next()
          }
        }
      }
      
      // Redirect to their branch
      if (userBranches.length > 0) {
        return NextResponse.redirect(new URL(`/branch/${userBranches[0]}`, req.url))
      }
      
      // No branches assigned - show error or redirect to pending
      return NextResponse.redirect(new URL('/pending', req.url))
    }

    // Central kitchen special handling - can only access kitchen-related pages
    if (userRole === 'central_kitchen') {
      // Allow their pages
      if (path === '/' ||
          path === '/kitchen' ||
          path === '/profile' ||
          path.startsWith('/recipes') ||
          path.startsWith('/branch/central-kitchen') ||
          path.startsWith('/branch/')) {
        return NextResponse.next()
      }

      // Allow dispatch pages for packing (central kitchen packs items for all branches)
      // Path format: /dispatch/[id]/branch/[slug]
      if (path.startsWith('/dispatch/')) {
        const pathParts = path.split('/')
        // Check if it's a branch-specific dispatch page (packing checklist)
        if (pathParts[3] === 'branch' && pathParts[4]) {
          return NextResponse.next()
        }
      }

      // Redirect to kitchen dashboard
      return NextResponse.redirect(new URL('/kitchen', req.url))
    }

    // Head chef special handling - can only access head chef dashboard and related pages
    if (userRole === 'head_chef') {
      // Redirect root to head chef dashboard
      if (path === '/') {
        return NextResponse.redirect(new URL('/kitchen/head-chef', req.url))
      }

      // Allow their pages
      if (path === '/kitchen/head-chef' ||
          path === '/kitchen' ||
          path === '/profile' ||
          path.startsWith('/recipes')) {
        return NextResponse.next()
      }

      // Redirect to head chef dashboard
      return NextResponse.redirect(new URL('/kitchen/head-chef', req.url))
    }

    // Station staff special handling - can only access station tablet page
    if (userRole === 'station_staff') {
      // Redirect root to station page
      if (path === '/') {
        return NextResponse.redirect(new URL('/kitchen/station', req.url))
      }

      // Allow their pages
      if (path === '/kitchen/station' ||
          path === '/profile' ||
          path.startsWith('/recipes')) {
        return NextResponse.next()
      }

      // Redirect to station page
      return NextResponse.redirect(new URL('/kitchen/station', req.url))
    }

    // Branch manager special handling - can access dashboard and assigned branches
    if (userRole === 'branch_manager') {
      // Allow dashboard, profile
      if (path === '/dashboard' || path === '/profile') {
        return NextResponse.next()
      }
      
      // Allow their assigned branch pages
      if (path.startsWith('/branch/')) {
        const branchSlug = path.split('/')[2]
        if (userBranches.includes(branchSlug)) {
          return NextResponse.next()
        }
        // Redirect to dashboard if trying to access other branches
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      
      // Allow dispatch pages for their assigned branches (packing/receiving)
      // Path format: /dispatch/[id]/branch/[slug]
      if (path.startsWith('/dispatch/')) {
        const pathParts = path.split('/')
        // Check if it's a branch-specific dispatch page
        if (pathParts[3] === 'branch' && pathParts[4]) {
          const branchSlug = pathParts[4]
          if (userBranches.includes(branchSlug)) {
            return NextResponse.next()
          }
        }
        // Redirect to dashboard if trying to access other branches' dispatches
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      
      // All other pages - redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Check role-based access for protected routes
    // Sort routes by length (longest first) so more specific routes match before general ones
    const sortedRoutes = Object.entries(roleRestrictedRoutes).sort((a, b) => b[0].length - a[0].length)
    for (const [route, allowedRoles] of sortedRoutes) {
      if (path.startsWith(route)) {
        if (!userRole || !allowedRoles.includes(userRole)) {
          // Redirect to user's appropriate landing page
          const landingPage = roleLandingPages[userRole] || '/'
          return NextResponse.redirect(new URL(landingPage, req.url))
        }
        break
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Auth pages are always accessible
        if (publicRoutes.some(route => path.startsWith(route))) {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     * - ALL api routes (let them handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|api/).*)',
  ],
}

