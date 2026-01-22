'use client'

import { useState } from 'react'
import { Eye, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRolePreview } from '@/lib/role-preview'
import type { UserRole } from '@/lib/auth'
import { roleDisplayNames } from '@/lib/auth'

const ALL_ROLES: UserRole[] = [
  'admin',
  'regional_manager',
  'operations_lead',
  'dispatcher',
  'central_kitchen',
  'head_chef',
  'station_staff',
  'branch_manager',
  'branch_staff',
]

interface ViewAsRoleSelectorProps {
  isCollapsed?: boolean
}

export function ViewAsRoleSelector({ isCollapsed = false }: ViewAsRoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { canPreview, effectiveRole, actualRole, setPreviewRole, isPreviewMode } = useRolePreview()

  // Don't show if user can't preview (non-admin)
  if (!canPreview) return null

  const handleSelectRole = (role: UserRole) => {
    // If selecting the actual role, exit preview mode
    if (role === actualRole) {
      setPreviewRole(null)
    } else {
      setPreviewRole(role)
    }
    setIsOpen(false)
  }

  if (isCollapsed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={`w-full ${isPreviewMode ? 'text-amber-600 bg-amber-50' : 'text-muted-foreground'}`}
        title={`Viewing as: ${roleDisplayNames[effectiveRole || 'admin']}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Eye className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-lg
          text-sm font-medium transition-all duration-200
          ${isPreviewMode 
            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }
        `}
      >
        <Eye className={`h-5 w-5 flex-shrink-0 ${isPreviewMode ? 'text-amber-600' : ''}`} />
        <span className="flex-1 text-left">
          {isPreviewMode ? `Viewing as ${roleDisplayNames[effectiveRole!]}` : 'View As...'}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                Select Role to Preview
              </div>
              {ALL_ROLES.map((role) => {
                const isSelected = effectiveRole === role
                const isActual = actualRole === role
                
                return (
                  <button
                    key={role}
                    onClick={() => handleSelectRole(role)}
                    className={`
                      w-full px-3 py-2.5 text-sm text-left flex items-center gap-2
                      transition-colors
                      ${isSelected 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-accent text-foreground'
                      }
                    `}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                    <span className="flex-1">{roleDisplayNames[role]}</span>
                    {isActual && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Your role
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

