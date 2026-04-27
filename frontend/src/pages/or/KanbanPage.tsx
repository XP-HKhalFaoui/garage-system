import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { orService } from '@/services/orService'
import { useSignalR } from '@/hooks/useSignalR'
import { ORCard } from '@/components/or/ORCard'
import { SignalRIndicator } from '@/components/or/SignalRIndicator'
import type { ORStatut, ORSummary } from '@/types/or'

const COLONNES: { statut: ORStatut; label: string; color: string }[] = [
  { statut: 'EnAttente',         label: 'En attente',         color: '#f59e0b' },
  { statut: 'EnCours',           label: 'En cours',           color: '#3b82f6' },
  { statut: 'Suspendu',          label: 'Suspendu',           color: '#8b5cf6' },
  { statut: 'TerminéTechnicien', label: 'Terminé technicien', color: '#10b981' },
  { statut: 'Livré',             label: 'Livré',              color: '#6b7280' },
]

export function KanbanPage() {
  const qc = useQueryClient()

  const { data: ors = [], isLoading } = useQuery({
    queryKey: ['or', 'today'],
    queryFn: () => orService.getToday(),
    refetchInterval: 60_000,
  })

  const { data: stats } = useQuery({
    queryKey: ['or', 'stats-today'],
    queryFn:  () => orService.getStatsToday(),
    refetchInterval: 30_000,
  })

  /* ── SignalR ──────────────────────────────────────────────────────────── */
  const { state: signalRState, on } = useSignalR('/hubs/ordres')

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['or'] })
  }, [qc])

  useEffect(() => {
    const unsubs = [
      on('NotifyORCreated', (d: unknown) => {
        invalidate()
        const { numéro } = d as { numéro: string }
        toast.info(`🆕 Nouvel OR : ${numéro}`)
      }),
      on('NotifyORStatusChanged', (d: unknown) => {
        invalidate()
        const { numéro, statut } = d as { numéro: string; statut: string }
        toast.success(`✅ OR ${numéro} → ${statut}`)
      }),
      on('NotifyORAssigned', (d: unknown) => {
        invalidate()
        const { numéro, technicien } = d as { numéro: string; technicien: string }
        toast.info(`👷 OR ${numéro} assigné à ${technicien}`)
      }),
    ]
    return () => unsubs.forEach(fn => fn?.())
  }, [on, invalidate])

  const byStatut = (s: ORStatut): ORSummary[] => ors.filter(o => o.statut === s)

  /* ── Render ───────────────────────────────────────────────────────────── */
  if (isLoading) {
    return <div style={{ padding: '2rem', color: '#64748b' }}>Chargement du Kanban…</div>
  }

  const today = new Date().toLocaleDateString('fr-DZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
            🔧 Atelier — {today}
          </h1>

          {stats && (
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Total',      value: stats.total,    color: '#64748b' },
                { label: 'En attente', value: stats.enAttente, color: '#f59e0b' },
                { label: 'En cours',   value: stats.enCours,  color: '#3b82f6' },
                { label: 'Terminés',   value: stats.terminés, color: '#10b981' },
              ].map(s => (
                <span key={s.label} style={{ fontSize: 13 }}>
                  <span style={{ color: '#94a3b8' }}>{s.label} </span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
                </span>
              ))}
              <span style={{ fontSize: 13 }}>
                <span style={{ color: '#94a3b8' }}>CA </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {stats.caTotalHT.toLocaleString('fr-DZ')} DA
                </span>
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SignalRIndicator state={signalRState} />
          <button style={{
            padding: '0.5rem 1rem',
            background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 6,
            cursor: 'pointer', fontWeight: 600, fontSize: 13,
          }}>
            + Nouvel OR
          </button>
        </div>
      </div>

      {/* ── Board ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.875rem', overflowX: 'auto', alignItems: 'flex-start', paddingBottom: '1rem' }}>
        {COLONNES.map(col => {
          const cards = byStatut(col.statut)
          return (
            <div key={col.statut} style={{
              minWidth: 240, maxWidth: 280, flex: '0 0 240px',
              background: '#f1f5f9', borderRadius: 10,
              padding: '0.75rem',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {/* Colonne header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingLeft: '0.5rem',
                borderLeft: `3px solid ${col.color}`,
                marginBottom: 4,
              }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>{col.label}</span>
                <span style={{
                  background: col.color, color: '#fff',
                  fontSize: 11, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 12,
                }}>
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              {cards.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 12, padding: '1.5rem 0' }}>
                  Aucun OR
                </div>
              ) : (
                cards.map(or => (
                  <ORCard key={or.id} or={or} />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
