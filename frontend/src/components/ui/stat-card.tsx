import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StatCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  icon?: LucideIcon
  className?: string
}

export function StatCard({ label, value, delta, deltaLabel, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight truncate">{value}</p>
            {delta !== undefined && (
              <div className="mt-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs font-medium',
                    delta > 0 && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    delta < 0 && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    delta === 0 && 'bg-muted text-muted-foreground',
                  )}
                >
                  {delta > 0 ? '+' : ''}{delta}{deltaLabel ?? '%'}
                </Badge>
              </div>
            )}
          </div>
          {Icon && (
            <div className="shrink-0 rounded-lg bg-primary/10 p-2.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
