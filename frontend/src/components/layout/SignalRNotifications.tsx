import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSignalR } from '@/hooks/useSignalR'
import { SignalRIndicator } from '@/components/or/SignalRIndicator'

interface ORCreatedPayload  { id: string; numéro: string; statut: string; timestamp: string }
interface ORAssignedPayload { orId: string; numéro: string; technicien: string; timestamp: string }
interface ORStatusPayload   { orId: string; numéro: string; statut: string; timestamp: string }

const STATUT_LABEL: Record<string, string> = {
  EnAttente:   'En attente',
  EnCours:     'En cours',
  EnPause:     'En pause',
  Terminé:     'Terminé',
  Livré:       'Livré',
  Annulé:      'Annulé',
}

export function SignalRNotifications() {
  const qc = useQueryClient()
  const { state, on } = useSignalR('/hubs/ordres')

  useEffect(() => {
    const off1 = on('NotifyORCreated', (raw) => {
      const p = raw as ORCreatedPayload
      toast.info(`Nouvel OR créé : ${p.numéro}`, {
        description: `Statut : ${STATUT_LABEL[p.statut] ?? p.statut}`,
        duration: 5000,
      })
      qc.invalidateQueries({ queryKey: ['or-kanban'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    })

    const off2 = on('NotifyORAssigned', (raw) => {
      const p = raw as ORAssignedPayload
      toast.success(`OR ${p.numéro} assigné`, {
        description: `Technicien : ${p.technicien}`,
        duration: 4000,
      })
      qc.invalidateQueries({ queryKey: ['or-kanban'] })
    })

    const off3 = on('NotifyORStatusChanged', (raw) => {
      const p = raw as ORStatusPayload
      const label = STATUT_LABEL[p.statut] ?? p.statut
      toast(`OR ${p.numéro} → ${label}`, { duration: 4000 })
      qc.invalidateQueries({ queryKey: ['or-kanban'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    })

    return () => { off1(); off2(); off3() }
  }, [on, qc])

  return (
    <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 50 }}>
      <SignalRIndicator state={state} />
    </div>
  )
}
