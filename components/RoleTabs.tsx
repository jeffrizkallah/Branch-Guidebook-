'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, ListChecks, ChevronRight } from 'lucide-react'
import { getRole } from '@/lib/data'

interface Role {
  roleId: string
  name: string
}

interface RoleTabsProps {
  roles: Role[]
  branchSlug: string
  defaultRole?: string
}

export function RoleTabs({ roles, branchSlug, defaultRole }: RoleTabsProps) {
  const [activeRole, setActiveRole] = useState(defaultRole || roles[0]?.roleId || '')

  if (roles.length === 0) {
    return <div className="text-muted-foreground">No roles available</div>
  }

  return (
    <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full overflow-hidden">
      <div className="w-full overflow-x-auto overflow-y-hidden pb-2 -mb-2">
        <TabsList className="w-full inline-flex md:grid md:grid-cols-5 justify-start h-auto min-h-[36px]">
          {roles.map(role => (
            <TabsTrigger 
              key={role.roleId} 
              value={role.roleId} 
              className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-3 py-2"
            >
              {role.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {roles.map(role => {
        const roleData = getRole(role.roleId)
        
        if (!roleData) {
          return (
            <TabsContent key={role.roleId} value={role.roleId} className="mt-6">
              <div className="rounded-lg border bg-card p-6">
                <p className="text-sm text-muted-foreground">Role data not available</p>
              </div>
            </TabsContent>
          )
        }

        return (
          <TabsContent key={role.roleId} value={role.roleId} className="mt-4 md:mt-6">
            <div className="rounded-lg border bg-card p-3 sm:p-4 md:p-6 space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 sm:justify-between min-w-0">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold break-words">{role.name}</h3>
                <Link href={`/branch/${branchSlug}/role/${role.roleId}`} className="w-full sm:w-auto shrink-0">
                  <Button variant="default" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                    <span className="hidden sm:inline">View Full Details</span>
                    <span className="sm:hidden">View Details</span>
                    <ChevronRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </Link>
              </div>
              
              {/* Role Description */}
              <p className="text-xs sm:text-sm text-muted-foreground break-words">{roleData.description}</p>
              
              {/* Quick Preview of Key Responsibilities */}
              <div className="min-w-0">
                <h4 className="font-semibold mb-2 text-xs sm:text-sm">Key Responsibilities:</h4>
                <ul className="space-y-1.5 text-xs sm:text-sm">
                  {roleData.responsibilities.slice(0, 3).map((resp, i) => (
                    <li key={i} className="flex items-start gap-2 min-w-0">
                      <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="break-words min-w-0">{resp}</span>
                    </li>
                  ))}
                  {roleData.responsibilities.length > 3 && (
                    <li className="text-muted-foreground ml-5 sm:ml-6">
                      +{roleData.responsibilities.length - 3} more...
                    </li>
                  )}
                </ul>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Link href={`/branch/${branchSlug}/role/${role.roleId}#timeline`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                    <Clock className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Daily Timeline
                  </Button>
                </Link>
                <Link href={`/branch/${branchSlug}/role/${role.roleId}#checklists`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                    <ListChecks className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Checklists
                  </Button>
                </Link>
              </div>
            </div>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}

