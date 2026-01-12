'use client'

import { useState, useEffect, useMemo } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { isCentralKitchen } from '@/lib/data'
import type { RecipeInstruction, Branch } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flame, Loader2, ChevronRight, Utensils, ChevronDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface RecipeInstructionsPageProps {
  params: {
    slug: string
  }
}

export default function RecipeInstructionsPage({ params }: RecipeInstructionsPageProps) {
  const searchParams = useSearchParams()
  const dayParam = searchParams.get('day')
  
  const [branch, setBranch] = useState<Branch | null | undefined>(undefined)
  const [instructions, setInstructions] = useState<RecipeInstruction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const INITIAL_DISPLAY_COUNT = 5

  // Load branch data from API
  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        const found = data.find((b: Branch) => b.slug === params.slug)
        setBranch(found || null)
      })
      .catch(() => setBranch(null))
  }, [params.slug])

  // Redirect Central Kitchen to recipes page
  useEffect(() => {
    if (branch && isCentralKitchen(branch)) {
      window.location.href = `/branch/${branch.slug}/recipes`
    }
  }, [branch])

  // Fetch instructions from API
  useEffect(() => {
    async function fetchInstructions() {
      try {
        const res = await fetch('/api/recipe-instructions')
        const data = await res.json()
        setInstructions(data)
      } catch (error) {
        console.error('Failed to fetch recipe instructions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchInstructions()
  }, [])

  // Get unique days from instructions, sorted
  const days = useMemo(() => {
    const daysSet = new Set<string>()
    instructions.forEach(instruction => {
      instruction.daysAvailable?.forEach(day => daysSet.add(day))
    })
    return Array.from(daysSet).sort((a, b) => 
      DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
    )
  }, [instructions])

  // Filter instructions based on selected day and search query
  const filteredInstructions = useMemo(() => {
    let filtered = instructions
    
    // Filter by day
    if (dayParam) {
      filtered = filtered.filter(instruction => instruction.daysAvailable?.includes(dayParam))
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(instruction => 
        instruction.dishName.toLowerCase().includes(query) ||
        instruction.category?.toLowerCase().includes(query) ||
        instruction.components?.some(comp => comp.name?.toLowerCase().includes(query))
      )
    }
    
    return filtered
  }, [instructions, dayParam, searchQuery])

  // Reset showAll when day filter or search changes
  useEffect(() => {
    setShowAll(false)
  }, [dayParam, searchQuery])

  // Get instructions to display (limited or all)
  const displayedInstructions = useMemo(() => {
    if (showAll) return filteredInstructions
    return filteredInstructions.slice(0, INITIAL_DISPLAY_COUNT)
  }, [filteredInstructions, showAll])

  const hasMoreToShow = filteredInstructions.length > INITIAL_DISPLAY_COUNT

  // Handle branch not found after loading
  if (branch === null) {
    notFound()
  }

  // Show loading while branch is being loaded
  if (branch === undefined || isLoading) {
    return (
      <div className="flex min-h-screen">
        <RoleSidebar />
        <main className="flex-1 flex flex-col pt-16 md:pt-0 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <RoleSidebar />

      <main className="flex-1 flex flex-col pt-16 md:pt-0">
        <div className="flex-1 container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: branch.name, href: `/branch/${branch.slug}` },
            { label: 'Recipe Instructions' },
          ]}
        />

        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="h-8 w-8 text-orange-500" />
            <h1 className="text-4xl font-bold">
              {dayParam ? `${dayParam}'s Instructions` : 'Recipe Instructions'}
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            {branch.name} - Reheating & Assembly Guide
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by dish name, category, or component..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredInstructions.length} result{filteredInstructions.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </p>
          )}
        </div>

        {/* Day Filter Tabs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/branch/${branch.slug}/recipe-instructions`}>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !dayParam
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  All Days
                </button>
              </Link>
              {days.map(day => (
                <Link key={day} href={`/branch/${branch.slug}/recipe-instructions?day=${day}`}>
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      dayParam === day
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {day}
                  </button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions Grid */}
        {filteredInstructions.length > 0 ? (
          <>
            <h2 className="text-2xl font-semibold mb-4">
              {showAll ? (
                <>{filteredInstructions.length} Instruction{filteredInstructions.length !== 1 ? 's' : ''} Available</>
              ) : (
                <>Showing {displayedInstructions.length} of {filteredInstructions.length} Instruction{filteredInstructions.length !== 1 ? 's' : ''}</>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedInstructions.map(instruction => (
                <Link 
                  key={instruction.instructionId} 
                  href={`/branch/${branch.slug}/recipe-instructions/${instruction.instructionId}`}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                    {/* Image */}
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      <img
                        src={instruction.visualPresentation[0] || 'https://picsum.photos/seed/food/800/600'}
                        alt={instruction.dishName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-orange-500 text-white">
                          {instruction.components.length} component{instruction.components.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
                            {instruction.dishName}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {instruction.category}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>

                      {/* Days Available */}
                      <div className="flex flex-wrap gap-1">
                        {instruction.daysAvailable.slice(0, 4).map((day, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {day.slice(0, 3)}
                          </Badge>
                        ))}
                        {instruction.daysAvailable.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{instruction.daysAvailable.length - 4}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* View All / Show Less Button */}
            {hasMoreToShow && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowAll(!showAll)}
                  className="min-w-[200px]"
                >
                  {showAll ? (
                    <>Show Less</>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      View All {filteredInstructions.length} Instructions
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Utensils className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Instructions Found</h3>
              <p className="text-muted-foreground">
                There are no recipe instructions available for {dayParam || 'this selection'}.
              </p>
            </CardContent>
          </Card>
        )}
        </div>
        <Footer />
      </main>
    </div>
  )
}

