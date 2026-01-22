'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { 
  Home, 
  Building2, 
  Factory, 
  Package, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X,
  User,
  ChefHat,
  Users,
  Bell,
  BarChart3,
  LogOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { UserRole } from '@/lib/auth'
import { useRolePreview } from '@/lib/role-preview'
import { ViewAsRoleSelector } from '@/components/ViewAsRoleSelector'
// Chat system disabled for now - uncomment to re-enable
// import { ChatButton } from '@/components/chat'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  subItems?: { href: string; label: string }[]
}

// Get navigation items based on user role
function getNavItems(role: UserRole | null, userBranches?: string[]): NavItem[] {
  if (!role) return []

  switch (role) {
    case 'admin':
      return [
        { href: '/admin', label: 'Home', icon: Home },
        { href: '/', label: 'Branches', icon: Building2 },
        { href: '/branch/central-kitchen', label: 'Central Kitchen', icon: Factory },
        { href: '/dispatch', label: 'Dispatches', icon: Package },
        { 
          href: '/admin', 
          label: 'Admin', 
          icon: Settings,
          subItems: [
            { href: '/admin', label: 'Dashboard' },
            { href: '/admin/users', label: 'User Management' },
            { href: '/recipes', label: 'Recipes' },
            { href: '/admin/recipe-instructions', label: 'Recipe Instructions' },
            { href: '/admin/production-schedules', label: 'Production Schedules' },
            { href: '/admin/branches', label: 'Branch Settings' },
            { href: '/admin/notifications', label: 'Notifications' },
            // { href: '/admin/chat-channels', label: 'Chat Channels' }, // Disabled for now
            { href: '/admin/analytics', label: 'Analytics' },
          ]
        },
      ]

    case 'operations_lead':
      return [
        { href: '/operations', label: 'Home', icon: Home },
        { href: '/', label: 'Branches', icon: Building2 },
        { href: '/branch/central-kitchen', label: 'Central Kitchen', icon: Factory },
        { 
          href: '/recipes', 
          label: 'Recipes', 
          icon: ChefHat,
          subItems: [
            { href: '/recipes', label: 'All Recipes' },
            { href: '/admin/recipe-instructions', label: 'Recipe Instructions' },
          ]
        },
      ]

    case 'dispatcher':
      return [
        { href: '/dispatch', label: 'Home', icon: Home },
        { href: '/', label: 'Branches', icon: Building2 },
        { href: '/admin/users', label: 'User Management', icon: Users },
      ]

    case 'central_kitchen':
      return [
        { href: '/kitchen', label: 'Home', icon: Home },
        { href: '/recipes', label: 'Recipes', icon: ChefHat },
        { href: '/', label: 'Branches', icon: Building2 },
      ]

    case 'head_chef':
      return [
        { href: '/kitchen/head-chef', label: 'Home', icon: Home },
        { href: '/recipes', label: 'Recipes', icon: ChefHat },
      ]

    case 'station_staff':
      return [
        { href: '/kitchen/station', label: 'Home', icon: Home },
        { href: '/recipes', label: 'Recipes', icon: ChefHat },
      ]

    case 'regional_manager':
      return [
        { href: '/regional', label: 'Home', icon: Home },
        { href: '/', label: 'Branches', icon: Building2 },
        { 
          href: '/regional', 
          label: 'Management', 
          icon: BarChart3,
          subItems: [
            { href: '/regional', label: 'Dashboard' },
            { href: '/regional/analytics', label: 'Sales Analytics' },
            { href: '/regional/quality-control', label: 'Quality Control' },
            { href: '/regional/budget', label: 'Budget Planner' },
          ]
        },
      ]

    case 'branch_manager':
      return [
        { href: '/dashboard', label: 'Home', icon: Home },
        { 
          href: '/dashboard', 
          label: 'My Branches', 
          icon: Building2,
          subItems: userBranches?.map(slug => ({
            href: `/branch/${slug}`,
            label: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          })) || []
        },
      ]

    case 'branch_staff':
      // Branch staff gets a Home button to their main branch
      // If they have multiple branches, also show "My Branches" expandable menu
      const mainBranchSlug = userBranches?.[0] || 'isc-soufouh'
      
      if (userBranches && userBranches.length > 1) {
        // Multiple branches: show Home + My Branches
        return [
          { href: `/branch/${mainBranchSlug}`, label: 'Home', icon: Home },
          { 
            href: '#', 
            label: 'My Branches', 
            icon: Building2,
            subItems: userBranches.map(slug => ({
              href: `/branch/${slug}`,
              label: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            }))
          }
        ]
      }
      
      // Single branch: just show Home
      return [
        { href: `/branch/${mainBranchSlug}`, label: 'Home', icon: Home }
      ]

    default:
      return []
  }
}

interface RoleSidebarProps {
  className?: string
}

export function RoleSidebar({ className }: RoleSidebarProps) {
  const { data: session } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const pathname = usePathname()
  
  // Get role preview state - use effective role for UI rendering
  const { effectiveRole, canPreview, isPreviewMode } = useRolePreview()

  const user = session?.user
  const actualRole = user?.role as UserRole | null
  const branches = user?.branches || []
  
  // Use effective role (preview or actual) for navigation
  const role = effectiveRole || actualRole

  const navItems = getNavItems(role, branches)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/admin' && pathname === '/admin') return true
    return pathname.startsWith(href) && href !== '/admin'
  }

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <>
      {/* Mobile Top Bar */}
      <div className={`md:hidden fixed left-0 right-0 z-50 glass-nav border-b border-border no-print ${isPreviewMode ? 'top-10' : 'top-0'}`}>
        <div className="flex items-center justify-between px-3 xs:px-4 py-2.5 xs:py-3">
          <Link href={role ? getNavItems(role)[0]?.href || '/' : '/'} className="flex items-center gap-2">
            <span className="text-base xs:text-lg font-bold text-primary">Mikana</span>
          </Link>
          <div className="flex items-center gap-0.5 xs:gap-1">
            <NotificationDropdown />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Toggle menu"
              className="h-9 w-9 xs:h-10 xs:w-10 touch-target-sm"
            >
              {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 no-print"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 z-50 glass-nav border-r border-border no-print
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-[70px] xs:w-[80px]' : 'w-[260px] xs:w-[280px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          flex flex-col
          ${isPreviewMode ? 'top-10 h-[calc(100vh-40px)]' : 'top-0 h-screen'}
          ${className || ''}
        `}
      >
        {/* Logo Section */}
        <div className={`px-4 py-3 border-b border-border flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <Link href={role ? getNavItems(role)[0]?.href || '/' : '/'} className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">Mikana</span>
            </Link>
          )}
          
          <div className="hidden md:flex items-center gap-1">
            {!isCollapsed && <NotificationDropdown />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-2.5 xs:p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isExpanded = expandedItems.includes(item.label)
            
            if (hasSubItems) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      text-sm font-medium transition-all duration-200
                      ${active 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }
                      ${isCollapsed ? 'justify-center' : 'justify-between'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  
                  {!isCollapsed && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                      {item.subItems?.map(subItem => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={`
                            block px-3 py-2 rounded-md text-sm
                            ${pathname === subItem.href
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }
                          `}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
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

        {/* Chat Button - Disabled for now, uncomment to re-enable */}
        {/* <div className={`px-4 pb-2 ${isCollapsed ? 'px-2' : ''}`}>
          <ChatButton isCollapsed={isCollapsed} />
        </div> */}

        {/* View As Role Selector (Admin only) */}
        {canPreview && (
          <div className={`px-4 pb-2 ${isCollapsed ? 'px-2' : ''}`}>
            <ViewAsRoleSelector isCollapsed={isCollapsed} />
          </div>
        )}

        {/* Divider */}
        <div className="mx-4 border-t border-border" />

        {/* Profile Link */}
        <div className="p-4">
          <Link
            href="/profile"
            onClick={() => setIsMobileOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg
              text-sm font-medium transition-all duration-200
              ${pathname === '/profile'
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'Profile' : undefined}
          >
            <User className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Profile</span>}
          </Link>
        </div>

        {/* User Info & Sign Out */}
        <div className={`p-4 border-t border-border ${isCollapsed ? 'text-center' : ''}`}>
          {!isCollapsed && user && (
            <div className="mb-3">
              <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground capitalize">{role?.replace('_', ' ')}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size={isCollapsed ? 'icon' : 'sm'}
            className={`${isCollapsed ? '' : 'w-full justify-start'} text-muted-foreground hover:text-foreground`}
            onClick={handleSignOut}
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Spacer for desktop */}
      <div 
        className={`hidden md:block transition-all duration-300 ease-in-out flex-shrink-0 ${isCollapsed ? 'w-[70px] xs:w-[80px]' : 'w-[260px] xs:w-[280px]'}`}
      />
    </>
  )
}

export default RoleSidebar

