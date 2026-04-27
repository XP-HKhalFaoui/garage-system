import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { congeService, employeService } from '@/services/rhService'
import type { CongeResponse } from '@/types/rh'

// ── Types & helpers ───────────────────────────────────────────────────────────

const TYPE_CONGE = ['Annuel', 'Maladie', 'Maternité', 'Paternité', 'SansPayement', 'Autre'] as const
type TypeConge = typeof TYPE_CONGE[number]

const STATUT_COLORS: Record<string, string> = {
  EnAttente: 'bg-yellow-100 text-yellow-700',
  Approuvé:  'bg-green-100 text-green-700',
  Refusé:    'bg-red-100 text-red-600',
}

function StatutBadge({ statut }: { statut: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[statut] ?? 'bg-gray-100 text-gray-500'}`}>
      {statut}
    </span>
  )
}

function nbJoursLabel(nb: number) {
  return nb === 1 ? '1 jour' : `${nb} jours`
}

// ── Schema demande ────────────────────────────────────────────────────────────

const schema = z.object({
  type:      z.enum(TYPE_CONGE, { required_error: 'Requis' }),
  dateDébut: z.string().min(1, 'Requis'),
  dateFin:   z.string().min(1, 'Requis'),
  motif:     z.string().min(5, 'Motif requis (min 5 cars)'),
}).refine(d => d.dateFin >= d.dateDébut, {
  message: 'La date de fin doit être ≥ date de début',
  path: ['dateFin'],
})

type FormData = z.infer<typeof schema>

// ── Page principale ───────────────────────────────────────────────────────────

type Tab = 'mes-demandes' | 'a-approuver'

export default function CongesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('mes-demandes')
  const [showForm, setShowForm] = useState(false)
  const [decisionModal, setDecisionModal] = useState<{ id: string; action: 'approuver' | 'refuser' } | null>(null)

  // Mes demandes
  const { data: mesDemandes, isLoading: loadingMes } = useQuery({
    queryKey: ['mes-conges'],
    queryFn: congeService.mesDemandes,
    enabled: tab === 'mes-demandes',
  })

  // À approuver
  const { data: aApprouver, isLoading: loadingApprouver } = useQuery({
    queryKey: ['conges-a-approuver'],
    queryFn: congeService.aApprouver,
    enabled: tab === 'a-approuver',
  })

  const approuverMut = useMutation({
    mutationFn: ({ id, commentaire }: { id: string; commentaire?: string }) =>
      congeService.approuver(id, commentaire),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conges-a-approuver'] })
      toast.success('Congé approuvé')
      setDecisionModal(null)
    },
  })

  const refuserMut = useMutation({
    mutationFn: ({ id, commentaire }: { id: string; commentaire?: string }) =>
      congeService.refuser(id, commentaire),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conges-a-approuver'] })
      toast.success('Congé refusé')
      setDecisionModal(null)
    },
  })

  const items: CongeResponse[] = tab === 'mes-demandes' ? (mesDemandes ?? []) : (aApprouver ?? [])
  const isLoading = tab === 'mes-demandes' ? loadingMes : loadingApprouver

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Congés</h1>
        {tab === 'mes-demandes' && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Nouvelle demande
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {([
          { id: 'mes-demandes' as Tab,  label: 'Mes demandes' },
          { id: 'a-approuver'  as Tab, label: 'À approuver' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              tab === t.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Chargement…</div>
      ) : !items.length ? (
        <div className="text-center py-16 text-gray-400">Aucune demande de congé</div>
      ) : (
        <div className="space-y-3">
          {items.map(c => (
            <CongeCard
              key={c.id}
              conge={c}
              showEmploye={tab === 'a-approuver'}
              onApprouver={() => setDecisionModal({ id: c.id, action: 'approuver' })}
              onRefuser={()   => setDecisionModal({ id: c.id, action: 'refuser' })}
            />
          ))}
        </div>
      )}

      {/* Calendrier visuel des absences — résumé mensuel */}
      {tab === 'a-approuver' && <AbsencesCalendar conges={aApprouver ?? []} />}

      {/* Modals */}
      {showForm && (
        <DemandeModal
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            qc.invalidateQueries({ queryKey: ['mes-conges'] })
            setShowForm(false)
          }}
        />
      )}

      {decisionModal && (
        <DecisionModal
          action={decisionModal.action}
          onClose={() => setDecisionModal(null)}
          onConfirm={(commentaire) => {
            if (decisionModal.action === 'approuver') {
              approuverMut.mutate({ id: decisionModal.id, commentaire })
            } else {
              refuserMut.mutate({ id: decisionModal.id, commentaire })
            }
          }}
          isPending={approuverMut.isPending || refuserMut.isPending}
        />
      )}
    </div>
  )
}

// ── Carte congé ───────────────────────────────────────────────────────────────

function CongeCard({
  conge: c,
  showEmploye,
  onApprouver,
  onRefuser,
}: {
  conge: CongeResponse
  showEmploye: boolean
  onApprouver: () => void
  onRefuser: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        {showEmploye && (
          <p className="text-xs text-gray-500 mb-0.5">{c.employeNom}</p>
        )}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-800">{c.type}</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-500">{nbJoursLabel(c.nbJours)}</span>
        </div>
        <p className="text-xs text-gray-500">
          {new Date(c.dateDébut).toLocaleDateString('fr-DZ')} → {new Date(c.dateFin).toLocaleDateString('fr-DZ')}
        </p>
        {c.motif && <p className="text-xs text-gray-400 mt-1 italic">"{c.motif}"</p>}
        {c.commentaireDecision && (
          <p className="text-xs text-gray-500 mt-1">Décision : {c.commentaireDecision}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <StatutBadge statut={c.statut} />
        {c.statut === 'EnAttente' && showEmploye && (
          <>
            <button
              onClick={onApprouver}
              className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200"
            >
              Approuver
            </button>
            <button
              onClick={onRefuser}
              className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200"
            >
              Refuser
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Calendrier résumé mensuel ─────────────────────────────────────────────────

function AbsencesCalendar({ conges }: { conges: CongeResponse[] }) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Filtrer les congés approuvés qui chevauchent ce mois
  const actifs = conges.filter(c => {
    const start = new Date(c.dateDébut)
    const end   = new Date(c.dateFin)
    const mStart = new Date(year, month, 1)
    const mEnd   = new Date(year, month, daysInMonth)
    return c.statut === 'Approuvé' && start <= mEnd && end >= mStart
  })

  // Construire map jour → [employeNom]
  const dayMap: Record<number, string[]> = {}
  for (const c of actifs) {
    const start = new Date(c.dateDébut)
    const end   = new Date(c.dateFin)
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month, d)
      if (day >= start && day <= end) {
        if (!dayMap[d]) dayMap[d] = []
        dayMap[d].push(c.employeNom)
      }
    }
  }

  const MONTHS = ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc']

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Calendrier des absences approuvées</h3>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
          >‹</button>
          <span className="text-sm text-gray-600 min-w-[100px] text-center">{MONTHS[month]} {year}</span>
          <button
            onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
          >›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['L','M','M','J','V','S','D'].map((d, i) => (
          <div key={i} className="text-center text-xs text-gray-400 py-1">{d}</div>
        ))}
        {/* Décalage 1er jour */}
        {Array.from({ length: (new Date(year, month, 1).getDay() + 6) % 7 }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const names = dayMap[d]
          const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === d
          return (
            <div
              key={d}
              title={names?.join(', ')}
              className={`relative text-center text-xs rounded py-1.5 transition-colors ${
                names?.length
                  ? 'bg-orange-100 text-orange-700 font-medium cursor-pointer hover:bg-orange-200'
                  : isToday
                  ? 'bg-blue-50 text-blue-600 font-bold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
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

// ── Modal: nouvelle demande ───────────────────────────────────────────────────

function DemandeModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'Annuel' },
  })

  const mut = useMutation({
    mutationFn: (d: FormData) => congeService.soumettre({
      type: d.type,
      dateDébut: d.dateDébut,
      dateFin: d.dateFin,
      motif: d.motif,
    }),
    onSuccess: () => {
      toast.success('Demande soumise')
      onSubmitted()
    },
    onError: () => toast.error('Erreur lors de la soumission'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Nouvelle demande de congé</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit(d => mut.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type de congé *</label>
            <select {...register('type')} className={inp(errors.type)}>
              {TYPE_CONGE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date début *</label>
              <input {...register('dateDébut')} type="date" className={inp(errors.dateDébut)} />
              {errors.dateDébut && <p className="text-xs text-red-500 mt-0.5">{errors.dateDébut.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date fin *</label>
              <input {...register('dateFin')} type="date" className={inp(errors.dateFin)} />
              {errors.dateFin && <p className="text-xs text-red-500 mt-0.5">{errors.dateFin.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motif *</label>
            <textarea {...register('motif')} rows={3} className={inp(errors.motif)} placeholder="Expliquez brièvement…" />
            {errors.motif && <p className="text-xs text-red-500 mt-0.5">{errors.motif.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={mut.isPending}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {mut.isPending ? 'Envoi…' : 'Soumettre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: décision ───────────────────────────────────────────────────────────

function DecisionModal({
  action,
  onClose,
  onConfirm,
  isPending,
}: {
  action: 'approuver' | 'refuser'
  onClose: () => void
  onConfirm: (commentaire?: string) => void
  isPending: boolean
}) {
  const [commentaire, setCommentaire] = useState('')
  const isRefus = action === 'refuser'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            {isRefus ? 'Refuser la demande' : 'Approuver la demande'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Commentaire {isRefus ? '(motif du refus)' : '(optionnel)'}
            </label>
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder={isRefus ? 'Motif obligatoire…' : 'Optionnel…'}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button
              onClick={() => onConfirm(commentaire || undefined)}
              disabled={isPending || (isRefus && !commentaire.trim())}
              className={`px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
                isRefus ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isPending ? 'Traitement…' : isRefus ? 'Confirmer refus' : 'Confirmer approbation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inp(err?: any) {
  return `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    err ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'
  }`
}
