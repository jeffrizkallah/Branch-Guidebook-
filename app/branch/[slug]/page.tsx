import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Phone, Mail, Clock, Factory, Flame, ChefHat } from 'lucide-react'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PrintHeader } from '@/components/PrintHeader'
import { KPIBadge } from '@/components/KPIBadge'
import { RoleTabs } from '@/components/RoleTabs'
import { RecipeSelector } from '@/components/RecipeSelector'
import { RecipeInstructionSelector } from '@/components/RecipeInstructionSelector'
import { BranchDispatches } from '@/components/BranchDispatches'
import { loadBranch, loadBranches, loadRoles, isCentralKitchen } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BranchPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    print?: string
  }>
}

export default async function BranchPage({ params, searchParams }: BranchPageProps) {
  const { slug } = await params
  const { print } = await searchParams
  const branch = await loadBranch(slug)
  const allRoles = loadRoles()

  if (!branch) {
    notFound()
  }

  const isPrintMode = print === '1'
  const isCK = isCentralKitchen(branch)
  
  // Get role details for this branch
  const branchRoles = allRoles
    .filter(role => branch.roles.includes(role.roleId))
    .map(role => ({ roleId: role.roleId, name: role.name }))

  return (
    <div className={isPrintMode ? "min-h-screen flex flex-col" : "flex min-h-screen"}>
      {!isPrintMode && <RoleSidebar />}
      <PrintHeader branchName={branch.name} />

      <main className={isPrintMode ? "flex-1 container mx-auto px-4 py-8" : "flex-1 flex flex-col pt-16 md:pt-0 overflow-x-hidden"}>
        <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: branch.name },
            ]}
          />

          {/* Hero Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0 w-full">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 break-words">{branch.name}</h1>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground break-words">{branch.school}</p>
              </div>
              {!isPrintMode && (
                <Link href={`/branch/${branch.slug}?print=1`} target="_blank" className="w-full sm:w-auto shrink-0">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">Print View</Button>
                </Link>
              )}
            </div>

            {/* Branch Information Card */}
            <Card className="mb-4 md:mb-6" data-tour-id="branch-info">
              <CardHeader className="px-4 py-3 md:px-6 md:py-4">
                <CardTitle className="text-base sm:text-lg md:text-xl">Branch Information</CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-3 md:px-6 md:py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs sm:text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span>Location</span>
                    </div>
                    <p className="font-semibold text-sm sm:text-base break-words">{branch.location}</p>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="text-xs sm:text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span>Operating Hours</span>
                    </div>
                    <p className="text-xs sm:text-sm break-words">{branch.operatingHours}</p>
                  </div>

                  <div className="space-y-1 min-w-0 sm:col-span-2 lg:col-span-1">
                    <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Manager
                    </div>
                    <p className="font-semibold text-sm sm:text-base break-words">{branch.manager}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs - Hidden for Central Kitchen */}
            {!isCK && (
              <Card className="mb-4 md:mb-6" data-tour-id="kpi-badges">
                <CardHeader className="px-4 py-3 md:px-6 md:py-4">
                  <CardTitle className="text-base sm:text-lg md:text-xl">Key Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-3 md:px-6 md:py-4">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                    <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[180px]">
                      <KPIBadge
                        label="Sales Target"
                        value={branch.kpis.salesTarget}
                        type="sales"
                      />
                    </div>
                    <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[120px]">
                      <KPIBadge label="Waste" value={branch.kpis.wastePct} type="waste" />
                    </div>
                    <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[140px]">
                      <KPIBadge
                        label="Hygiene Score"
                        value={branch.kpis.hygieneScore}
                        type="hygiene"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacts - Hidden for Central Kitchen */}
            {!isCK && (
              <Card className="mb-4 md:mb-6">
                <CardHeader className="px-4 py-3 md:px-6 md:py-4">
                  <CardTitle className="text-base sm:text-lg md:text-xl">Contacts</CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-3 md:px-6 md:py-4">
                  <div className="space-y-3 md:space-y-4">
                    {branch.contacts.map((contact, index) => (
                      <div key={index} className="flex flex-col gap-2 pb-3 md:pb-4 border-b last:border-b-0 last:pb-0 min-w-0">
                        <div className="font-semibold text-sm sm:text-base break-words">{contact.name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground break-words">{contact.role}</div>
                        <div className="flex flex-col gap-1 text-xs sm:text-sm min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Phone className="h-3 w-3 shrink-0" />
                            <a href={`tel:${contact.phone}`} className="hover:underline break-all min-w-0">
                              {contact.phone}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-3 w-3 shrink-0" />
                            <a href={`mailto:${contact.email}`} className="hover:underline break-all min-w-0 overflow-hidden">
                              {contact.email}
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dispatches Section - Hidden for Central Kitchen */}
            {!isCK && !isPrintMode && (
              <div className="mb-4 md:mb-6">
                <BranchDispatches branchSlug={branch.slug} />
              </div>
            )}
          </div>

          {/* Roles Section */}
          <Card className="mb-4 md:mb-6" data-tour-id="role-tabs">
            <CardHeader className="px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-base sm:text-lg md:text-xl">Operational Roles</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Select a role to view responsibilities, checklists, and daily timelines
              </p>
            </CardHeader>
            <CardContent className="px-4 py-3 md:px-6 md:py-4">
              <RoleTabs roles={branchRoles} branchSlug={branch.slug} />
            </CardContent>
          </Card>

          {/* Central Kitchen: Production Schedule Link */}
          {isCK && !isPrintMode && (
            <Card className="mb-4 md:mb-6 border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
              <CardHeader className="px-4 py-3 md:px-6 md:py-4">
                <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
                  <Factory className="h-5 w-5 text-orange-500" />
                  Production Schedule
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  View and manage the weekly production schedule
                </p>
              </CardHeader>
              <CardContent className="px-4 py-3 md:px-6 md:py-4">
                <Link href={`/branch/${branch.slug}/production-schedule`}>
                  <Button className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white">
                    View Production Schedule
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Recipes Section (Central Kitchen) or Recipe Instructions (Branches) */}
          <Card className="mb-4 md:mb-6" data-tour-id="recipe-selector">
            <CardHeader className="px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
                {isCK ? (
                  <>
                    <ChefHat className="h-5 w-5" />
                    Full Recipes & Cooking Instructions
                  </>
                ) : (
                  <>
                    <Flame className="h-5 w-5 text-orange-500" />
                    Recipe Instructions (Reheating & Assembly)
                  </>
                )}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isCK 
                  ? 'Select a day to view recipes, preparation instructions, and cooking guidelines'
                  : 'Select a day to view reheating instructions, assembly steps, and presentation guidelines'
                }
              </p>
            </CardHeader>
            <CardContent className="px-4 py-3 md:px-6 md:py-4">
              {isCK ? (
                <RecipeSelector branchSlug={branch.slug} />
              ) : (
                <RecipeInstructionSelector branchSlug={branch.slug} />
              )}
            </CardContent>
          </Card>
        </div>

        <Footer />
      </main>
    </div>
  )
}

export async function generateStaticParams() {
  const branches = await loadBranches()
  return branches.map(branch => ({
    slug: branch.slug,
  }))
}

