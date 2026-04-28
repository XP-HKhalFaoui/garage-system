import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        // OR statuses
        'or-EnAttente':        'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700',
        'or-EnCours':          'bg-blue-100  text-blue-700  ring-blue-200  dark:bg-blue-900/50  dark:text-blue-300  dark:ring-blue-700',
        'or-Suspendu':         'bg-yellow-100 text-yellow-700 ring-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:ring-yellow-700',
        'or-TerminéTechnicien':'bg-purple-100 text-purple-700 ring-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:ring-purple-700',
        'or-Livré':            'bg-green-100 text-green-700  ring-green-200  dark:bg-green-900/50  dark:text-green-300  dark:ring-green-700',
        'or-Annulé':           'bg-red-100   text-red-700   ring-red-200    dark:bg-red-900/50    dark:text-red-300    dark:ring-red-700',

        // Stock statuses
        'stock-ok':       'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/50 dark:text-green-300 dark:ring-green-700',
        'stock-low':      'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:ring-orange-700',
        'stock-critical': 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/50 dark:text-red-300 dark:ring-red-700',

        // Invoice statuses
        'invoice-Emise':            'bg-blue-100  text-blue-700  ring-blue-200  dark:bg-blue-900/50  dark:text-blue-300  dark:ring-blue-700',
        'invoice-PartiellemntPayée':'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:ring-orange-700',
        'invoice-Soldée':           'bg-green-100 text-green-700  ring-green-200  dark:bg-green-900/50  dark:text-green-300  dark:ring-green-700',
        'invoice-EnRetard':         'bg-red-100   text-red-700   ring-red-200    dark:bg-red-900/50    dark:text-red-300    dark:ring-red-700',
        'invoice-Annulée':          'bg-slate-100 text-slate-500  ring-slate-200  dark:bg-slate-900/50  dark:text-slate-400  dark:ring-slate-700',

        // Leave request statuses
        'leave-EnAttente': 'bg-yellow-100 text-yellow-700 ring-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:ring-yellow-700',
        'leave-Approuvé':  'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/50 dark:text-green-300 dark:ring-green-700',
        'leave-Refusé':    'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/50 dark:text-red-300 dark:ring-red-700',
      },
    },
  }
)

type StatusBadgeVariant = NonNullable<VariantProps<typeof statusBadgeVariants>['variant']>

const LABELS: Record<StatusBadgeVariant, string> = {
  'or-EnAttente':         'En attente',
  'or-EnCours':           'En cours',
  'or-Suspendu':          'Suspendu',
  'or-TerminéTechnicien': 'Terminé',
  'or-Livré':             'Livré',
  'or-Annulé':            'Annulé',
  'stock-ok':             'OK',
  'stock-low':            'Bas',
  'stock-critical':       'Critique',
  'invoice-Emise':             'Émise',
  'invoice-PartiellemntPayée': 'Partiel',
  'invoice-Soldée':            'Soldée',
  'invoice-EnRetard':          'En retard',
  'invoice-Annulée':           'Annulée',
  'leave-EnAttente': 'En attente',
  'leave-Approuvé':  'Approuvé',
  'leave-Refusé':    'Refusé',
}

interface StatusBadgeProps {
  variant: StatusBadgeVariant
  label?: string
  className?: string
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)}>
      {label ?? LABELS[variant]}
    </span>
  )
}

export type { StatusBadgeVariant }
