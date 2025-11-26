import Link from 'next/link'
import { MapPin, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Branch } from '@/lib/data'

interface BranchCardProps {
  branch: Branch
}

export function BranchCard({ branch }: BranchCardProps) {
  return (
    <Card className="branch-card hover:scale-[1.02] transition-transform duration-200">
      <CardHeader>
        <CardTitle className="text-xl">{branch.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{branch.school}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location and Manager */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{branch.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{branch.manager}</span>
          </div>
        </div>

        {/* Action Button */}
        <Link href={`/branch/${branch.slug}`} className="block">
          <Button className="w-full" size="sm">
            Open Branch
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

