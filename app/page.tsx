'use client'

import { useState, useMemo } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { BranchCard } from '@/components/BranchCard'
import { Footer } from '@/components/Footer'
import { loadBranches, filterBranches, getUniqueLocations } from '@/lib/data'
import { Card } from '@/components/ui/card'

export default function HomePage() {
  const allBranches = loadBranches()
  const locations = getUniqueLocations()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('all')

  const filteredBranches = useMemo(() => {
    return filterBranches(allBranches, searchQuery, {
      location: selectedLocation,
    })
  }, [allBranches, searchQuery, selectedLocation])

  return (
    <div className="flex min-h-screen">
      <Sidebar onSearch={setSearchQuery} searchQuery={searchQuery} />

      <main className="flex-1 flex flex-col pt-16 md:pt-0">
        <div className="flex-1 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-primary">Branch Control Panel</h1>
            <p className="text-lg text-muted-foreground">
              Select your branch to see all tasks, guides, and daily actions
            </p>
          </div>

          {/* Results Count and Location Filter */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredBranches.length} of {allBranches.length} branches
            </p>
            
            {/* Location Filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[140px] cursor-pointer"
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
          {filteredBranches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

