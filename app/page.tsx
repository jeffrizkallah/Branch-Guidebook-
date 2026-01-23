'use client'

import { useState, useMemo, useEffect } from 'react'
import { RoleSidebar } from '@/components/RoleSidebar'
import { BranchCard } from '@/components/BranchCard'
import { BranchMapWidget } from '@/components/BranchMapWidget'
import { Footer } from '@/components/Footer'
import { filterBranches, type Branch } from '@/lib/data'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'

export default function HomePage() {
  const [allBranches, setAllBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        setAllBranches(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const locations = useMemo(() => {
    const locs = allBranches.map(b => b.location)
    return Array.from(new Set(locs)).sort()
  }, [allBranches])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('all')

  const filteredBranches = useMemo(() => {
    return filterBranches(allBranches, searchQuery, {
      location: selectedLocation,
    })
  }, [allBranches, searchQuery, selectedLocation])

  return (
    <div className="flex min-h-screen">
      <RoleSidebar />

      <main className="flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0">
        <div className="flex-1 container mx-auto px-3 xs:px-4 py-4 xs:py-6 md:py-8">
          {/* Header */}
          <div className="mb-4 xs:mb-6 md:mb-8">
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold mb-1 xs:mb-2 text-primary">All Branches</h1>
            <p className="text-sm xs:text-base md:text-lg text-muted-foreground">
              Select a branch to see all tasks, guides, and daily actions
            </p>
          </div>

          {/* Interactive Map Widget */}
          {!loading && allBranches.length > 0 && (
            <BranchMapWidget branches={allBranches} />
          )}

          {/* Search and Filter */}
          <div className="mb-4 xs:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 xs:gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 xs:h-10 text-sm"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 xs:gap-4 w-full sm:w-auto">
              <p className="text-xs xs:text-sm text-muted-foreground order-2 sm:order-1">
                {filteredBranches.length}/{allBranches.length}
              </p>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="rounded-md border border-input bg-background px-2 xs:px-3 py-1.5 xs:py-2 text-xs xs:text-sm min-w-[120px] xs:min-w-[140px] cursor-pointer flex-1 sm:flex-none order-1 sm:order-2"
              >
                <option value="all">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Branch grid */}
          {loading ? (
            <div className="flex justify-center py-8 xs:py-12">
              <Loader2 className="h-6 w-6 xs:h-8 xs:w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBranches.length > 0 ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 fold:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 md:gap-6">
              {filteredBranches.map(branch => (
                <BranchCard key={branch.id} branch={branch} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                No branches match your search criteria. Try adjusting your filters.
              </p>
            </Card>
          )}
        </div>

        <Footer />
      </main>
    </div>
  )
}

