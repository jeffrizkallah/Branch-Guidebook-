'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface StationProgressCardProps {
  station: string
  icon: React.ReactNode
  total: number
  completed: number
  inProgress: number
  colors: { bg: string; text: string; border: string }
}

export function StationProgressCard({
  station,
  icon,
  total,
  completed,
  inProgress,
  colors
}: StationProgressCardProps) {
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <Card className={`${colors.bg} ${colors.border} border`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded ${colors.text} bg-white/50`}>
            {icon}
          </div>
          <span className={`font-semibold text-sm ${colors.text}`}>{station}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{completed}</span>
            <span className="text-sm text-muted-foreground">/ {total}</span>
          </div>

          <Progress value={progressPercent} className="h-2" />

          <div className="flex items-center justify-between text-xs">
            <span className={`${colors.text}`}>{progressPercent}% complete</span>
            {inProgress > 0 && (
              <span className="text-muted-foreground">
                {inProgress} in progress
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
