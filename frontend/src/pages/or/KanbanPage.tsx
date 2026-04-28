import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PlusCircle } from 'lucide-react'
import { orService } from '@/services/orService'
import { useSignalR } from '@/hooks/useSignalR'
import { ORCard } from '@/components/or/ORCard'
import { SignalRIndicator } from '@/components/or/SignalRIndicator'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ORStatut, ORSummary } from '@/types/or'

// ── Colonnes ──────────────────────────────────────────────────────────────────
const COLONNES: {
  statut: ORStatut
  label: string
  headerClass: string
  dotClass: string
}[] = [
  { statut: 'EnAttente',         label: 'En attente',         headerClass: 'border-amber-400',  dotClass: 'bg-amber-400' },
  { statut: 'EnCours',           label: 'En cours',           headerClass: 'border-blue-500',   dotClass: 'bg-blue-500'  },
  { statut: 'Suspendu',          label: 'Suspendu',           headerClass: 'border-purple-500', dotClass: 'bg-purple-500'},
  { statut: 'TerminéTechnicien', label: 'Terminé technicien', headerClass: 'border-green-500',  dotClass: 'bg-green-500' },
  { statut: 'Livré',             label: 'Livré',              headerClass: 'border-slate-400',  dotClass: 'bg-slate-400' },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export function KanbanPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: ors = [], isLoading } = useQuery({
    queryKey: ['or', 'today'],
    queryFn: () => orService.getToday(),
    refetchInterval: 60_000,
  })

  const { data: stats } = useQuery({
    queryKey: ['or', 'stats-today'],
    queryFn: () => orService.getStatsToday(),
    refetchInterval: 30_000,
  })

  const { state: signalRState, on } = useSignalR('/hubs/ordres')

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['or'] })
  }, [qc])

  useEffect(() => {
    const unsubs = [
      on('NotifyORCreated', (d: unknown) => {
        invalidate()
        toast.info(`Nouvel OR : ${(d as { numéro: string }).numéro}`)
      }),
      on('NotifyORStatusChanged', (d: unknown) => {
        invalidate()
        const { numéro, statut } = d as { numéro: string; statut: string }
        toast.success(`OR ${numéro} → ${statut}`)
      }),
      on('NotifyORAssigned', (d: unknown) => {
        invalidate()
        const { numéro, technicien } = d as { numéro: string; technicien: string }
        toast.info(`OR ${numéro} assigné à ${technicien}`)
      }),
    ]
    return () => unsubs.forEach(fn => fn?.())
  }, [on, invalidate])

  const byStatut = (s: ORStatut): ORSummary[] => ors.filter(o => o.statut === s)

  const today = new Date().toLocaleDateString('fr-DZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Atelier — Kanban"
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
        actions={
          <div className="flex items-center gap-3">
            <SignalRIndicator state={signalRState} />
            <Button size="sm" onClick={() => navigate('/or/nouveau')}>
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Nouvel OR
            </Button>
          </div>
        }
      />

      {/* Stats rapides */}
      {stats && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total',      value: stats.total,     className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
            { label: 'En attente', value: stats.enAttente, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
            { label: 'En cours',   value: stats.enCours,   className: 'bg-blue-100  text-blue-700  dark:bg-blue-900/40  dark:text-blue-300'  },
            { label: 'Terminés',   value: stats.terminés,  className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
          ].map(s => (
            <span key={s.label} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', s.className)}>
              {s.label} <span className="font-bold">{s.value}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            CA : <span className="font-semibold text-foreground">{stats.caTotalHT.toLocaleString('fr-DZ')} DA</span>
          </span>
        </div>
      )}

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 items-start">
        {COLONNES.map(col => {
          const cards = byStatut(col.statut)
          return (
            <div
              key={col.statut}
              className="flex-none w-60 bg-muted/60 rounded-xl p-2.5 flex flex-col gap-2"
            >
              {/* Colonne header */}
              <div className={cn('flex items-center justify-between pl-2 border-l-[3px] mb-1', col.headerClass)}>
                <span className="text-sm font-semibold text-foreground">{col.label}</span>
                <Badge variant="secondary" className="text-xs px-1.5 min-w-[1.5rem] justify-center">
                  {isLoading ? '…' : cards.length}
                </Badge>
              </div>

              {/* Cards */}
              {isLoading ? (
                <>
                  <Skeleton className="h-40 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                </>
              ) : cards.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">Aucun OR</p>
              ) : (
                cards.map(or => <ORCard key={or.id} or={or} />)
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
