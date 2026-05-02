import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ArrowLeft, UserPlus, Wrench, Trash2, Plus, Phone, Car, User,
  ChevronRight, FileText, Play, PauseCircle, CheckCircle2, PackageCheck,
  XCircle, RotateCcw, Check,
} from 'lucide-react'
import { orService } from '@/services/orService'
import { stockService } from '@/services/stockService'
import { factureService } from '@/services/billingService'
import { ORTimer } from '@/components/or/ORTimer'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ORStatut, ORDetail, LigneORType } from '@/types/or'
import httpClient from '@/services/httpClient'

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<ORStatut, string> = {
  EnAttente:          'En attente',
  EnCours:            'En cours',
  Suspendu:           'Suspendu',
  TerminéTechnicien:  'Terminé technicien',
  Livré:              'Livré',
  Annulé:             'Annulé',
}

const STATUT_COLORS: Record<ORStatut, string> = {
  EnAttente:          'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  EnCours:            'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Suspendu:           'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  TerminéTechnicien:  'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Livré:              'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Annulé:             'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const TRANSITIONS: Record<ORStatut, ORStatut[]> = {
  EnAttente:          ['EnCours', 'Annulé'],
  EnCours:            ['Suspendu', 'TerminéTechnicien'],
  Suspendu:           ['EnCours', 'Annulé'],
  TerminéTechnicien:  ['Livré'],
  Livré:              [],
  Annulé:             [],
}

// Main workflow steps (linear progression shown in stepper)
const WORKFLOW_STEPS: ORStatut[] = ['EnAttente', 'EnCours', 'TerminéTechnicien', 'Livré']

// Config for each transition button
type TransitionCfg = {
  label: string
  shortLabel: string
  icon: React.ElementType
  className: string        // button style
  requiresComment?: boolean
  isDestructive?: boolean
}

const TRANSITION_BTN: Record<ORStatut, TransitionCfg> = {
  EnCours: {
    label: 'Démarrer la réparation',
    shortLabel: 'Démarrer',
    icon: Play,
    className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
  },
  Suspendu: {
    label: 'Suspendre le travail',
    shortLabel: 'Suspendre',
    icon: PauseCircle,
    className: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500',
    requiresComment: true,
  },
  TerminéTechnicien: {
    label: 'Terminer (côté technicien)',
    shortLabel: 'Terminer',
    icon: CheckCircle2,
    className: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600',
  },
  Livré: {
    label: 'Marquer comme livré',
    shortLabel: 'Livrer',
    icon: PackageCheck,
    className: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
  },
  EnAttente: {
    label: 'Remettre en attente',
    shortLabel: 'En attente',
    icon: RotateCcw,
    className: 'bg-slate-600 hover:bg-slate-700 text-white border-slate-600',
  },
  Annulé: {
    label: "Annuler l'OR",
    shortLabel: 'Annuler',
    icon: XCircle,
    className: 'border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 bg-transparent',
    isDestructive: true,
  },
}

const fmt = (n: number) => new Intl.NumberFormat('fr-DZ').format(n) + ' DA'

// ── Schémas Zod ────────────────────────────────────────────────────────────────

const commentSchema = z.object({
  commentaire: z.string().min(1, 'Commentaire requis pour une suspension'),
})

const ligneSchema = z.object({
  type: z.enum(['Pièce', 'MO']),
  articleId: z.string().optional(),
  description: z.string().min(1, 'Description requise'),
  quantité: z.coerce.number().positive('Quantité > 0'),
  prixUnitaire: z.coerce.number().min(0).optional(),
})

// ── Sous-composants ────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: ORStatut }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold', STATUT_COLORS[statut])}>
      {STATUT_LABELS[statut]}
    </span>
  )
}

function HistoriqueTimeline({ or }: { or: ORDetail }) {
  if (or.historique.length === 0) return null
  return (
    <div className="space-y-2">
      {or.historique.map((h, i) => (
        <div key={h.id} className="flex gap-3 text-sm">
          <div className="flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1 shrink-0" />
            {i < or.historique.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="pb-3">
            <p className="font-medium">
              <span className={cn('mr-1 text-xs px-1.5 py-0.5 rounded', STATUT_COLORS[h.statutAvant])}>
                {STATUT_LABELS[h.statutAvant]}
              </span>
              <ChevronRight className="inline h-3 w-3 text-muted-foreground" />
              <span className={cn('ml-1 text-xs px-1.5 py-0.5 rounded', STATUT_COLORS[h.statutAprès])}>
                {STATUT_LABELS[h.statutAprès]}
              </span>
            </p>
            {h.commentaire && (
              <p className="text-muted-foreground text-xs mt-0.5 italic">« {h.commentaire} »</p>
            )}
            <p className="text-muted-foreground text-xs mt-0.5">
              {new Date(h.timestamp).toLocaleString('fr-DZ')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Stepper de workflow ────────────────────────────────────────────────────────

function WorkflowStepper({ statut }: { statut: ORStatut }) {
  const isCancelled = statut === 'Annulé'
  const isSuspended = statut === 'Suspendu'

  const currentIdx = WORKFLOW_STEPS.indexOf(
    isCancelled || isSuspended ? 'EnCours' : statut
  )

  const stepColors: Record<ORStatut, { ring: string; bg: string; text: string; line: string }> = {
    EnAttente:         { ring: 'ring-amber-400',  bg: 'bg-amber-400',  text: 'text-amber-700',  line: 'bg-amber-400'  },
    EnCours:           { ring: 'ring-blue-500',   bg: 'bg-blue-500',   text: 'text-blue-700',   line: 'bg-blue-500'   },
    TerminéTechnicien: { ring: 'ring-purple-500', bg: 'bg-purple-500', text: 'text-purple-700', line: 'bg-purple-500' },
    Livré:             { ring: 'ring-green-500',  bg: 'bg-green-500',  text: 'text-green-700',  line: 'bg-green-500'  },
    Suspendu:          { ring: 'ring-amber-400',  bg: 'bg-amber-400',  text: 'text-amber-700',  line: 'bg-amber-400'  },
    Annulé:            { ring: 'ring-red-400',    bg: 'bg-red-400',    text: 'text-red-700',    line: 'bg-red-400'    },
  }

  return (
    <div className="w-full">
      {/* Special banners for terminal / side states */}
      {isCancelled && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          Cet ordre de réparation a été <strong className="ml-1">annulé</strong>.
        </div>
      )}
      {isSuspended && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <PauseCircle className="h-4 w-4 shrink-0" />
          Travaux <strong className="ml-1">suspendus</strong> — en attente de reprise.
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center w-full">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isDone    = !isCancelled && idx < currentIdx
          const isCurrent = !isCancelled && idx === currentIdx
          const isPending = isCancelled || idx > currentIdx
          const cfg       = stepColors[step]

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 transition-all',
                  isDone    && `${cfg.bg} ring-transparent text-white`,
                  isCurrent && `bg-white ${cfg.ring} ${cfg.text} ring-2 shadow-md`,
                  isPending && 'bg-muted ring-border text-muted-foreground',
                )}>
                  {isDone ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isDone    && cfg.text,
                  isCurrent && `${cfg.text} font-semibold`,
                  isPending && 'text-muted-foreground',
                )}>
                  {STATUT_LABELS[step]}
                </span>
              </div>

              {/* Connector line */}
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div className={cn(
                  'h-0.5 flex-1 mx-2 mb-5 rounded-full transition-all',
                  isDone ? cfg.line : 'bg-border',
                )}>
                  {isSuspended && idx === 1 && (
                    <div className="h-full bg-amber-300 rounded-full" />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Boutons d'action statut ────────────────────────────────────────────────────

function StatusActionButtons({
  or,
  onSuspend,
  onTransition,
  isPending,
}: {
  or: ORDetail
  onSuspend: () => void
  onTransition: (statut: ORStatut) => void
  isPending: boolean
}) {
  const transitions = TRANSITIONS[or.statut]
  if (transitions.length === 0) return null

  const mainTransitions = transitions.filter(s => s !== 'Annulé')
  const cancelTransition = transitions.includes('Annulé')

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Primary / secondary transitions */}
      {mainTransitions.map(targetStatut => {
        const cfg = TRANSITION_BTN[targetStatut]
        const Icon = cfg.icon
        return (
          <Button
            key={targetStatut}
            size="sm"
            disabled={isPending}
            className={cn('gap-1.5 font-semibold shadow-sm', cfg.className)}
            onClick={() => cfg.requiresComment ? onSuspend() : onTransition(targetStatut)}
          >
            <Icon className="h-4 w-4" />
            {cfg.shortLabel}
          </Button>
        )
      })}

      {/* Separator before destructive */}
      {cancelTransition && mainTransitions.length > 0 && (
        <div className="h-6 w-px bg-border mx-1" />
      )}

      {/* Annuler (destructive, always last) */}
      {cancelTransition && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          className={cn('gap-1.5', TRANSITION_BTN['Annulé'].className)}
          onClick={() => onTransition('Annulé')}
        >
          <XCircle className="h-4 w-4" />
          Annuler l'OR
        </Button>
      )}
    </div>
  )
}

// ── Modale : Commentaire de suspension ────────────────────────────────────────

function SuspendreModal({
  or, open, onClose,
}: { or: ORDetail; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { commentaire: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: { commentaire: string }) =>
      orService.changerStatut(or.id, 'Suspendu', data.commentaire),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['or', or.id] })
      qc.invalidateQueries({ queryKey: ['or', 'today'] })
      toast.success('Travaux suspendus')
      reset()
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur'),
  })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5 text-amber-500" />
            Suspendre les travaux
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>
              Motif de suspension <span className="text-destructive">*</span>
            </Label>
            <Textarea
              {...register('commentaire')}
              placeholder="Ex : En attente d'une pièce, client à rappeler…"
              rows={3}
              autoFocus
            />
            {errors.commentaire && (
              <p className="text-destructive text-xs">{errors.commentaire.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <PauseCircle className="h-4 w-4 mr-1.5" />
              Confirmer la suspension
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modale : Assigner technicien ───────────────────────────────────────────────

function AssignerModal({
  or, open, onClose,
}: { or: ORDetail; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [techId, setTechId] = useState('')

  const { data: employes = [] } = useQuery({
    queryKey: ['employes', 'actifs'],
    queryFn: () =>
      httpClient
        .get<{ items: { id: string; nomComplet: string; poste: string; isActif: boolean }[]; total: number }>(
          '/employes', { params: { actif: true, pageSize: 100 } }
        )
        .then(r => r.data.items.filter(e => e.isActif)),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: () => orService.assigner(or.id, techId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['or', or.id] })
      qc.invalidateQueries({ queryKey: ['or', 'today'] })
      toast.success('Technicien assigné')
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur'),
  })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assigner un technicien</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Technicien</Label>
            <Select value={techId} onValueChange={setTechId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un technicien…" />
              </SelectTrigger>
              <SelectContent>
                {employes.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nomComplet} — {e.poste}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button disabled={!techId || mutation.isPending} onClick={() => mutation.mutate()}>
              Assigner
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Modale : Ajouter une ligne ─────────────────────────────────────────────────

function AjouterLigneModal({
  orId, open, onClose,
}: { orId: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(ligneSchema),
    defaultValues: { type: 'MO' as LigneORType, description: '', quantité: 1, prixUnitaire: 0 },
  })

  const type = watch('type')
  const [articleSearch, setArticleSearch] = useState('')

  const { data: articles = [] } = useQuery({
    queryKey: ['articles', 'search', articleSearch],
    queryFn: () => stockService.search(articleSearch),
    enabled: type === 'Pièce' && articleSearch.length >= 2,
  })

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof ligneSchema>) =>
      orService.addLigne(orId, {
        type: data.type,
        articleId: data.articleId || undefined,
        description: data.description,
        quantité: data.quantité,
        prixUnitaire: data.prixUnitaire,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['or', orId] })
      toast.success('Ligne ajoutée')
      reset()
      setArticleSearch('')
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur'),
  })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); setArticleSearch(''); onClose() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une ligne</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={v => { setValue('type', v as LigneORType); setValue('articleId', '') }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MO">Main d'œuvre</SelectItem>
                <SelectItem value="Pièce">Pièce</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'Pièce' && (
            <div className="space-y-1.5">
              <Label>Article</Label>
              <Input
                placeholder="Rechercher par référence ou désignation…"
                value={articleSearch}
                onChange={e => setArticleSearch(e.target.value)}
              />
              {articles.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto divide-y text-sm">
                  {articles.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                      onClick={() => {
                        setValue('articleId', a.id)
                        setValue('description', a.désignation)
                        setValue('prixUnitaire', a.prixVente)
                        setArticleSearch(`${a.référence} — ${a.désignation}`)
                      }}
                    >
                      <span className="font-mono text-xs text-muted-foreground">{a.référence}</span>
                      {' '}
                      {a.désignation}
                      <span className="ml-2 text-muted-foreground text-xs">Stock: {a.stockActuel}</span>
                    </button>
                  ))}
                </div>
              )}
              <input type="hidden" {...register('articleId')} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Description {type === 'MO' && <span className="text-destructive">*</span>}</Label>
            <Input {...register('description')} placeholder="Ex : Vidange huile moteur" />
            {errors.description && <p className="text-destructive text-xs">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantité</Label>
              <Input type="number" step="0.01" min="0.01" {...register('quantité')} />
              {errors.quantité && <p className="text-destructive text-xs">{errors.quantité.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Prix unitaire (DA)</Label>
              <Input type="number" step="0.01" min="0" {...register('prixUnitaire')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); setArticleSearch(''); onClose() }}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function ORDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [suspendOpen, setSuspendOpen]   = useState(false)
  const [assignerOpen, setAssignerOpen] = useState(false)
  const [ligneOpen, setLigneOpen]       = useState(false)

  const { data: or, isLoading, isError } = useQuery<ORDetail>({
    queryKey: ['or', id],
    queryFn: () => orService.getById(id!),
    enabled: !!id,
  })

  const transitionMutation = useMutation({
    mutationFn: (statut: ORStatut) => orService.changerStatut(or!.id, statut),
    onSuccess: (_data, statut) => {
      qc.invalidateQueries({ queryKey: ['or', id] })
      qc.invalidateQueries({ queryKey: ['or', 'today'] })
      toast.success(`Statut mis à jour → ${STATUT_LABELS[statut]}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur'),
  })

  const removeLigneMutation = useMutation({
    mutationFn: (ligneId: string) => orService.removeLigne(id!, ligneId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['or', id] })
      toast.success('Ligne supprimée')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur'),
  })

  const genererFactureMutation = useMutation({
    mutationFn: () => factureService.createFromOR(id!),
    onSuccess: (facture) => {
      qc.invalidateQueries({ queryKey: ['or', id] })
      qc.invalidateQueries({ queryKey: ['or', 'today'] })
      toast.success(`Facture ${facture.numéro} générée — OR passé à Livré`)
      navigate(`/facturation/factures/${facture.id}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur lors de la génération'),
  })

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  )

  if (isError || !or) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-muted-foreground">OR introuvable.</p>
      <Button variant="outline" onClick={() => navigate('/or/kanban')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Retour Kanban
      </Button>
    </div>
  )

  const canEdit    = or.statut === 'EnCours'
  const transitions = TRANSITIONS[or.statut]

  return (
    <div className="space-y-6">

      {/* Header */}
      <PageHeader
        title={or.numéro}
        subtitle={
          <span className="flex items-center gap-3 flex-wrap">
            <StatutBadge statut={or.statut} />
            {or.priorité === 'Urgent' && (
              <Badge variant="destructive" className="text-xs">URGENT</Badge>
            )}
            <span className="text-muted-foreground text-sm">
              Ouvert le {new Date(or.dateOuverture).toLocaleString('fr-DZ')}
            </span>
          </span>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/or/kanban')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Kanban
          </Button>
        }
      />

      {/* ── Gestion du statut ── */}
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardContent className="pt-5 pb-5 space-y-5">

          {/* Stepper */}
          <WorkflowStepper statut={or.statut} />

          {/* Actions */}
          {(transitions.length > 0 || (!or.technicien && transitions.length > 0) || or.statut === 'TerminéTechnicien') && (
            <>
              <Separator />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">

                  {/* Assigner technicien */}
                  {!or.technicien && transitions.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setAssignerOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Assigner technicien
                    </Button>
                  )}

                  {/* Générer facture */}
                  {or.statut === 'TerminéTechnicien' && !or.factureId && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white gap-1.5 font-semibold shadow-sm"
                      disabled={genererFactureMutation.isPending || or.lignes.length === 0}
                      onClick={() => genererFactureMutation.mutate()}
                    >
                      <FileText className="h-4 w-4" />
                      {genererFactureMutation.isPending ? 'Génération…' : 'Générer la facture'}
                    </Button>
                  )}
                </div>

                {/* Transition buttons */}
                <StatusActionButtons
                  or={or}
                  onSuspend={() => setSuspendOpen(true)}
                  onTransition={s => transitionMutation.mutate(s)}
                  isPending={transitionMutation.isPending}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Véhicule */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="h-4 w-4" /> Véhicule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-2xl font-extrabold tracking-widest">{or.vehicule.immatriculation}</p>
            <p className="text-muted-foreground">{or.vehicule.marque} {or.vehicule.modele}</p>
            <p className="text-muted-foreground">{or.vehicule.km.toLocaleString('fr-DZ')} km</p>
            <button
              className="text-primary text-xs underline-offset-2 hover:underline"
              onClick={() => navigate(`/vehicules/${or.vehicule.id}`)}
            >
              Voir fiche véhicule →
            </button>
          </CardContent>
        </Card>

        {/* Client */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" /> Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{or.client.nom}</p>
            <a href={`tel:${or.client.téléphone}`} className="flex items-center gap-1.5 text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" />
              {or.client.téléphone}
            </a>
            <button
              className="text-primary text-xs underline-offset-2 hover:underline"
              onClick={() => navigate(`/clients`)}
            >
              Voir fiche client →
            </button>
          </CardContent>
        </Card>

        {/* Intervention */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Type : </span>{or.typeIntervention}</p>
            <p>
              <span className="text-muted-foreground">Technicien : </span>
              {or.technicien
                ? `${or.technicien.prénom} ${or.technicien.nom}`
                : <span className="text-orange-500 font-medium">Non assigné</span>
              }
            </p>
            <div className="pt-1">
              <ORTimer orId={or.id} startTime={or.heureDebut} statut={or.statut} />
            </div>
            {or.dateFermeture && (
              <p className="text-muted-foreground text-xs">
                Fermé le {new Date(or.dateFermeture).toLocaleString('fr-DZ')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diagnostic */}
      {or.diagnostic && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Diagnostic</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{or.diagnostic}</p>
          </CardContent>
        </Card>
      )}

      {/* Lignes OR */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">
            Lignes de travail
            <span className="ml-2 text-muted-foreground font-normal">({or.lignes.length})</span>
          </CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setLigneOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {or.lignes.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Aucune ligne pour l'instant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-24">Qté</TableHead>
                  <TableHead className="text-right w-32">PU</TableHead>
                  <TableHead className="text-right w-32">Total HT</TableHead>
                  {canEdit && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {or.lignes.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Badge variant={l.type === 'Pièce' ? 'secondary' : 'outline'} className="text-xs">
                        {l.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{l.description}</p>
                      {l.articleRéférence && (
                        <p className="text-xs text-muted-foreground font-mono">{l.articleRéférence}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">{l.quantité}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(l.prixUnitaire)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{fmt(l.totalHT)}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeLigneMutation.mutate(l.id)}
                          disabled={removeLigneMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {or.lignes.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-end px-4 py-3">
                <span className="text-sm font-semibold">
                  Total HT : <span className="text-base ml-2">{fmt(or.montantTotal)}</span>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Historique */}
      {or.historique.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Historique des statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <HistoriqueTimeline or={or} />
          </CardContent>
        </Card>
      )}

      {/* Modales */}
      <SuspendreModal    or={or}  open={suspendOpen}  onClose={() => setSuspendOpen(false)} />
      <AssignerModal     or={or}  open={assignerOpen} onClose={() => setAssignerOpen(false)} />
      <AjouterLigneModal orId={or.id} open={ligneOpen} onClose={() => setLigneOpen(false)} />

    </div>
  )
}
