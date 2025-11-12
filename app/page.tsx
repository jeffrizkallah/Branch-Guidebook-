'use client'

import { useState, useMemo } from 'react'
import { TopNav } from '@/components/TopNav'
import { BranchCard } from '@/components/BranchCard'
import { Footer } from '@/components/Footer'
import { loadBranches, filterBranches, getUniqueLocations } from '@/lib/data'
import { Filter } from 'lucide-react'
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
    <div className="min-h-screen flex flex-col">
      <TopNav onSearch={setSearchQuery} searchQuery={searchQuery} />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-primary">Branch Guidebook</h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive operational guides for all Mikana branches
          </p>
        </div>

        {/* Results Count and Location Filter */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredBranches.length} of {allBranches.length} branches
          </p>
          
          {/* Location Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
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
      </main>

      <Footer />
    </div>
  )
}

