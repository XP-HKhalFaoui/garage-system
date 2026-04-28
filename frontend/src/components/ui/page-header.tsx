import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      <Separator />
    </div>
  )
}
