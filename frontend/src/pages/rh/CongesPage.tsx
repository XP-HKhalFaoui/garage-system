import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { congeService } from '@/services/rhService'
import type { CongeResponse } from '@/types/rh'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const TYPE_CONGE = ['Annuel', 'Maladie', 'Maternité', 'Paternité', 'SansPayement', 'Autre'] as const
type TypeConge = typeof TYPE_CONGE[number]

const schema = z.object({
  type:      z.enum(TYPE_CONGE),
  dateDébut: z.string().min(1, 'Requis'),
  dateFin:   z.string().min(1, 'Requis'),
  motif:     z.string().min(5, 'Motif requis (min 5 cars)'),
}).refine(d => d.dateFin >= d.dateDébut, {
  message: 'La date de fin doit être ≥ date de début',
  path: ['dateFin'],
})
type FormData = z.infer<typeof schema>

export default function CongesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'mes-demandes' | 'a-approuver'>('mes-demandes')
  const [showForm, setShowForm] = useState(false)
  const [decisionModal, setDecisionModal] = useState<{ id: string; action: 'approuver' | 'refuser' } | null>(null)

  const { data: mesDemandes, isLoading: loadingMes } = useQuery({
    queryKey: ['mes-conges'],
    queryFn: congeService.mesDemandes,
    enabled: tab === 'mes-demandes',
  })

  const { data: aApprouver, isLoading: loadingApprouver } = useQuery({
    queryKey: ['conges-a-approuver'],
    queryFn: congeService.aApprouver,
    enabled: tab === 'a-approuver',
  })

  const approuverMut = useMutation({
    mutationFn: ({ id, commentaire }: { id: string; commentaire?: string }) => congeService.approuver(id, commentaire),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conges-a-approuver'] }); toast.success('Congé approuvé'); setDecisionModal(null) },
  })

  const refuserMut = useMutation({
    mutationFn: ({ id, commentaire }: { id: string; commentaire?: string }) => congeService.refuser(id, commentaire),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conges-a-approuver'] }); toast.success('Congé refusé'); setDecisionModal(null) },
  })

  const items: CongeResponse[] = tab === 'mes-demandes' ? (mesDemandes ?? []) : (aApprouver ?? [])
  const isLoading = tab === 'mes-demandes' ? loadingMes : loadingApprouver

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Congés"
        actions={
          tab === 'mes-demandes' ? (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nouvelle demande
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="mes-demandes">Mes demandes</TabsTrigger>
          <TabsTrigger value="a-approuver">À approuver</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !items.length ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-lg">
              Aucune demande de congé
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(c => (
                <CongeCard
                  key={c.id}
                  conge={c}
                  showEmploye={tab === 'a-approuver'}
                  onApprouver={() => setDecisionModal({ id: c.id, action: 'approuver' })}
                  onRefuser={() => setDecisionModal({ id: c.id, action: 'refuser' })}
                />
              ))}
            </div>
          )}

          {tab === 'a-approuver' && <AbsencesCalendar conges={aApprouver ?? []} />}
        </TabsContent>
      </Tabs>

      {/* Modal nouvelle demande */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) setShowForm(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle demande de congé</DialogTitle></DialogHeader>
          <DemandeForm
            onClose={() => setShowForm(false)}
            onSubmitted={() => { qc.invalidateQueries({ queryKey: ['mes-conges'] }); setShowForm(false) }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal décision */}
      <Dialog open={!!decisionModal} onOpenChange={open => { if (!open) setDecisionModal(null) }}>
        <DialogContent className="max-w-sm">
          {decisionModal && (
            <DecisionContent
              action={decisionModal.action}
              onClose={() => setDecisionModal(null)}
              onConfirm={commentaire => {
                if (decisionModal.action === 'approuver') approuverMut.mutate({ id: decisionModal.id, commentaire })
                else refuserMut.mutate({ id: decisionModal.id, commentaire })
              }}
              isPending={approuverMut.isPending || refuserMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CongeCard({ conge: c, showEmploye, onApprouver, onRefuser }: {
  conge: CongeResponse; showEmploye: boolean; onApprouver: () => void; onRefuser: () => void
}) {
  const nbJours = c.nbJours === 1 ? '1 jour' : `${c.nbJours} jours`
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        {showEmploye && <p className="text-xs text-muted-foreground mb-0.5">{c.employeNom}</p>}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{c.type}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">{nbJours}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(c.dateDébut).toLocaleDateString('fr-DZ')} → {new Date(c.dateFin).toLocaleDateString('fr-DZ')}
        </p>
        {c.motif && <p className="text-xs text-muted-foreground mt-1 italic">"{c.motif}"</p>}
        {c.commentaireDecision && <p className="text-xs text-muted-foreground mt-1">Décision : {c.commentaireDecision}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge variant={
          c.statut === 'EnAttente' ? 'leave-EnAttente' :
          c.statut === 'Approuvé'  ? 'leave-Approuvé'  : 'leave-Refusé'
        } />
        {c.statut === 'EnAttente' && showEmploye && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300" onClick={onApprouver}>Approuver</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" onClick={onRefuser}>Refuser</Button>
          </>
        )}
      </div>
    </div>
  )
}

function DemandeForm({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'Annuel' },
  })

  const mut = useMutation({
    mutationFn: (d: FormData) => congeService.soumettre({ type: d.type, dateDébut: d.dateDébut, dateFin: d.dateFin, motif: d.motif }),
    onSuccess: () => { toast.success('Demande soumise'); onSubmitted() },
    onError: () => toast.error('Erreur lors de la soumission'),
  })

  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Type de congé</Label>
        <Select defaultValue="Annuel" onValueChange={v => setValue('type', v as TypeConge)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPE_CONGE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Date début</Label>
          <Input type="date" {...register('dateDébut')} />
          {errors.dateDébut && <p className="text-xs text-destructive">{errors.dateDébut.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Date fin</Label>
          <Input type="date" {...register('dateFin')} />
          {errors.dateFin && <p className="text-xs text-destructive">{errors.dateFin.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Motif</Label>
        <Textarea {...register('motif')} rows={3} placeholder="Expliquez brièvement…" />
        {errors.motif && <p className="text-xs text-destructive">{errors.motif.message}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Soumettre
        </Button>
      </div>
    </form>
  )
}

function DecisionContent({ action, onClose, onConfirm, isPending }: {
  action: 'approuver' | 'refuser'; onClose: () => void; onConfirm: (c?: string) => void; isPending: boolean
}) {
  const [commentaire, setCommentaire] = useState('')
  const isRefus = action === 'refuser'

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isRefus ? 'Refuser la demande' : 'Approuver la demande'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Commentaire {isRefus ? '(motif du refus)' : '(optionnel)'}</Label>
          <Textarea
            value={commentaire}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentaire(e.target.value)}
            rows={3}
            placeholder={isRefus ? 'Motif obligatoire…' : 'Optionnel…'}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => onConfirm(commentaire || undefined)}
            disabled={isPending || (isRefus && !commentaire.trim())}
            className={cn(isRefus ? 'bg-destructive hover:bg-destructive/90' : 'bg-green-600 hover:bg-green-700')}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isRefus ? 'Confirmer refus' : 'Confirmer approbation'}
          </Button>
        </div>
      </div>
    </>
  )
}

function AbsencesCalendar({ conges }: { conges: CongeResponse[] }) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const actifs = conges.filter(c => {
    const start = new Date(c.dateDébut), end = new Date(c.dateFin)
    const mStart = new Date(year, month, 1), mEnd = new Date(year, month, daysInMonth)
    return c.statut === 'Approuvé' && start <= mEnd && end >= mStart
  })

  const dayMap: Record<number, string[]> = {}
  for (const c of actifs) {
    const start = new Date(c.dateDébut), end = new Date(c.dateFin)
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month, d)
      if (day >= start && day <= end) {
        if (!dayMap[d]) dayMap[d] = []
        dayMap[d].push(c.employeNom)
      }
    }
  }

  const MONTHS = ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc']
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-3">
        <p className="text-sm font-semibold text-muted-foreground">Calendrier des absences approuvées</p>
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevMonth}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <span className="text-sm text-muted-foreground min-w-[100px] text-center">{MONTHS[month]} {year}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={nextMonth}><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['L','M','M','J','V','S','D'].map((d, i) => (
          <div key={i} className="text-center text-xs text-muted-foreground py-1">{d}</div>
        ))}
        {Array.from({ length: (new Date(year, month, 1).getDay() + 6) % 7 }).map((_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const names = dayMap[d]
          const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === d
          return (
            <div key={d} title={names?.join(', ')} className={cn(
              'relative text-center text-xs rounded py-1.5 transition-colors',
              names?.length ? 'bg-orange-100 text-orange-700 font-medium cursor-pointer hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300'
                : isToday ? 'bg-primary/10 text-primary font-bold'
                : 'text-foreground hover:bg-muted',
            )}>
              {d}
              {names?.length ? (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center">
                  {names.length}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
