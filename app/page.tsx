'use client'

import { useState, useMemo, useEffect } from 'react'
import { RoleSidebar } from '@/components/RoleSidebar'
import { BranchCard } from '@/components/BranchCard'
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

      <main className="flex-1 flex flex-col pt-16 md:pt-0">
        <div className="flex-1 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-primary">All Branches</h1>
            <p className="text-lg text-muted-foreground">
              Select a branch to see all tasks, guides, and daily actions
            </p>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {filteredBranches.length} of {allBranches.length} branches
              </p>
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
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBranches.length > 0 ? (
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

