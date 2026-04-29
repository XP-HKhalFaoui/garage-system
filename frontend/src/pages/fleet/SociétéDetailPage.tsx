import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, FileText, AlertTriangle,
  Car, Receipt, History, Settings,
} from 'lucide-react'
import { fleetService } from '@/services/fleetService'
import type { TypeTarif } from '@/types/fleet'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('fr-DZ').format(n) + ' DA'

const TARIF_LABELS: Record<TypeTarif, string> = {
  TarifNormal: 'Tarif normal',
  PrixRéduit:  'Prix réduit',
  Forfait:     'Forfait',
}

const MOIS_LABELS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

// ── Modal : Nouveau contrat ────────────────────────────────────────────────────

const contratSchema = z.object({
  dateDébut:               z.string().min(1, 'Requis'),
  dateFin:                 z.string().optional(),
  typeTarif:               z.enum(['TarifNormal', 'PrixRéduit', 'Forfait']),
  plafondMensuelDZD:       z.string().optional(),
  remisePourcentage:       z.string().optional(),
  conditionsParticulières: z.string().optional(),
})
type ContratForm = z.infer<typeof contratSchema>

function ContratModal({ sociétéId, open, onClose }: {
  sociétéId: string; open: boolean; onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<ContratForm>({
    resolver: zodResolver(contratSchema),
    defaultValues: { typeTarif: 'TarifNormal' },
  })
  const typeTarif = watch('typeTarif')

  const mutation = useMutation({
    mutationFn: (d: ContratForm) => fleetService.créerContrat(sociétéId, {
      dateDébut:               d.dateDébut,
      dateFin:                 d.dateFin || undefined,
      typeTarif:               d.typeTarif,
      plafondMensuelDZD:       d.plafondMensuelDZD ? Number(d.plafondMensuelDZD) : undefined,
      remisePourcentage:       d.remisePourcentage ? Number(d.remisePourcentage) : undefined,
      conditionsParticulières: d.conditionsParticulières || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['société', sociétéId] })
      qc.invalidateQueries({ queryKey: ['contrats', sociétéId] })
      toast.success('Contrat créé — l\'ancien contrat a été archivé')
      reset()
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur'),
  })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Nouveau contrat tarifaire</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date début</Label>
              <Input type="date" {...register('dateDébut')} />
              {errors.dateDébut && <p className="text-destructive text-xs">{errors.dateDébut.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Date fin (optionnel)</Label>
              <Input type="date" {...register('dateFin')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Type de tarif</Label>
              <Select value={typeTarif} onValueChange={v => setValue('typeTarif', v as TypeTarif)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TarifNormal">Tarif normal (pas de remise)</SelectItem>
                  <SelectItem value="PrixRéduit">Prix réduit (remise %)</SelectItem>
                  <SelectItem value="Forfait">Forfait</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {typeTarif === 'PrixRéduit' && (
              <div className="col-span-2 space-y-1.5">
                <Label>Remise (%)</Label>
                <Input type="number" min={0} max={100} step={0.5} {...register('remisePourcentage')} placeholder="ex: 15" />
                {errors.remisePourcentage && <p className="text-destructive text-xs">{errors.remisePourcentage.message}</p>}
              </div>
            )}
            <div className="col-span-2 space-y-1.5">
              <Label>Plafond mensuel DZD (optionnel)</Label>
              <Input type="number" min={0} step={1000} {...register('plafondMensuelDZD')} placeholder="ex: 500000" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Conditions particulières</Label>
              <Textarea rows={3} {...register('conditionsParticulières')} placeholder="Conditions spécifiques au contrat…" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>Créer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal : Affecter un véhicule ──────────────────────────────────────────────

const véhiculeSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('existant'),
    véhiculeId: z.string().uuid('ID invalide'),
    numéroFlotte: z.string().optional(),
    conducteurHabituel: z.string().optional(),
  }),
  z.object({
    mode: z.literal('nouveau'),
    immatriculation: z.string().min(2, 'Requis'),
    marque: z.string().min(1, 'Requis'),
    modele: z.string().min(1, 'Requis'),
    année: z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
    numéroFlotte: z.string().optional(),
    conducteurHabituel: z.string().optional(),
  }),
])

function VéhiculeModal({ sociétéId, open, onClose }: {
  sociétéId: string; open: boolean; onClose: () => void
}) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'existant' | 'nouveau'>('nouveau')

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(véhiculeSchema),
    defaultValues: { mode: 'nouveau' as const, année: new Date().getFullYear() },
  })

  const mutation = useMutation({
    mutationFn: (d: any) => fleetService.affecterVéhicule(sociétéId, {
      véhiculeId: mode === 'existant' ? d.véhiculeId : undefined,
      immatriculation: mode === 'nouveau' ? d.immatriculation : undefined,
      marque: mode === 'nouveau' ? d.marque : undefined,
      modele: mode === 'nouveau' ? d.modele : undefined,
      année: mode === 'nouveau' ? d.année : undefined,
      numéroFlotte: d.numéroFlotte || undefined,
      conducteurHabituel: d.conducteurHabituel || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flotte', sociétéId] })
      toast.success('Véhicule affecté à la flotte')
      reset()
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur'),
  })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Affecter un véhicule</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
          {/* Mode */}
          <div className="flex gap-2">
            {(['nouveau', 'existant'] as const).map(m => (
              <button key={m} type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 py-2 rounded-md border-2 text-sm font-medium transition-colors',
                  mode === m ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted'
                )}
              >
                {m === 'nouveau' ? 'Nouveau véhicule' : 'Véhicule existant'}
              </button>
            ))}
          </div>

          <input type="hidden" value={mode} {...register('mode')} />

          {mode === 'existant' ? (
            <div className="space-y-1.5">
              <Label>ID du véhicule</Label>
              <Input {...register('véhiculeId')} placeholder="UUID du véhicule" />
              {(errors as any).véhiculeId && <p className="text-destructive text-xs">{(errors as any).véhiculeId.message}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Immatriculation</Label>
                <Input {...register('immatriculation')} placeholder="16-ALG-100" className="uppercase" />
                {(errors as any).immatriculation && <p className="text-destructive text-xs">{(errors as any).immatriculation.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Marque</Label>
                <Input {...register('marque')} placeholder="Toyota" />
                {(errors as any).marque && <p className="text-destructive text-xs">{(errors as any).marque.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Modèle</Label>
                <Input {...register('modele')} placeholder="Hilux" />
                {(errors as any).modele && <p className="text-destructive text-xs">{(errors as any).modele.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Année</Label>
                <Input type="number" {...register('année')} />
                {(errors as any).année && <p className="text-destructive text-xs">{(errors as any).année.message}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>N° flotte (optionnel)</Label>
              <Input {...register('numéroFlotte')} placeholder="FL-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Conducteur habituel</Label>
              <Input {...register('conducteurHabituel')} placeholder="Prénom Nom" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>Affecter</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal : Facturation groupée ───────────────────────────────────────────────

function FacturationModal({ sociétéId, open, onClose }: {
  sociétéId: string; open: boolean; onClose: () => void
}) {
  const qc = useQueryClient()
  const now = new Date()
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [année, setAnnée] = useState(now.getFullYear())

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['preview-facture', sociétéId, mois, année],
    queryFn: () => fleetService.previewFacture(sociétéId, mois, année),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: () => fleetService.créerFactureMensuelle(sociétéId, { mois, année }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['historique-factures', sociétéId] })
      toast.success('Facture groupée créée')
      onClose()
      
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur'),
  })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose() } }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Facturation mensuelle groupée</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Sélection période */}
          <div className="flex items-center gap-3">
            <div className="space-y-1.5 flex-1">
              <Label>Mois</Label>
              <Select value={String(mois)} onValueChange={v => { setMois(Number(v)) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOIS_LABELS.slice(1).map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-28">
              <Label>Année</Label>
              <Input
                type="number"
                value={année}
                min={2020}
                max={now.getFullYear()}
                onChange={e => { setAnnée(Number(e.target.value)) }}
              />
            </div>
          </div>

          {/* Preview */}
          {previewLoading ? (
            <Skeleton className="h-40" />
          ) : preview ? (
            <div className="space-y-3">
              {preview.nbOR === 0 ? (
                <div className="rounded-lg bg-muted/50 p-6 text-center text-muted-foreground">
                  Aucun OR livré non encore facturé pour cette période.
                </div>
              ) : (
                <>
                  {/* Résumé financier */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'OR éligibles', value: String(preview.nbOR) },
                      { label: 'Sous-total HT',  value: fmt(preview.sousTotalHT) },
                      { label: 'Total TTC',       value: fmt(preview.totalTTC) },
                    ].map(c => (
                      <div key={c.label} className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className="font-bold">{c.value}</p>
                      </div>
                    ))}
                  </div>

                  {preview.dépassementPlafond && (
                    <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 p-3 text-sm text-orange-700 dark:text-orange-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Dépassement du plafond mensuel ({fmt(preview.plafondMensuel ?? 0)})
                    </div>
                  )}

                  {/* Liste OR */}
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N°</TableHead>
                          <TableHead>Immat.</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Montant HT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.oRsÉligibles.map(or => (
                          <TableRow key={or.id}>
                            <TableCell className="font-mono text-xs">{or.numéro}</TableCell>
                            <TableCell className="font-mono text-xs">{or.immatriculation}</TableCell>
                            <TableCell className="text-xs">{or.typeIntervention}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{fmt(or.montantHT)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose() }}>Annuler</Button>
          {preview && preview.nbOR > 0 && (
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              <Receipt className="h-4 w-4 mr-1.5" />
              Générer la facture
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page Détail ────────────────────────────────────────────────────────────────

export default function SociétéDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [contratOpen, setContratOpen] = useState(false)
  const [véhiculeOpen, setVéhiculeOpen] = useState(false)
  const [factureOpen, setFactureOpen] = useState(false)

  const { data: société, isLoading } = useQuery({
    queryKey: ['société', id],
    queryFn: () => fleetService.getSociété(id!),
    enabled: !!id,
  })

  const { data: flotte = [] } = useQuery({
    queryKey: ['flotte', id],
    queryFn: () => fleetService.getFlotte(id!),
    enabled: !!id,
  })

  const { data: contrats = [] } = useQuery({
    queryKey: ['contrats', id],
    queryFn: () => fleetService.getContrats(id!),
    enabled: !!id,
  })

  const { data: historique = [] } = useQuery({
    queryKey: ['historique-factures', id],
    queryFn: () => fleetService.getHistoriqueFactures(id!),
    enabled: !!id,
  })

  const retirerMutation = useMutation({
    mutationFn: (véhiculeId: string) => fleetService.retirerVéhicule(id!, véhiculeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flotte', id] })
      toast.success('Véhicule retiré de la flotte')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur'),
  })

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-64" />
    </div>
  )

  if (!société) return (
    <div className="flex flex-col items-center py-24 gap-4 text-muted-foreground">
      <p>Société introuvable.</p>
      <Button variant="outline" onClick={() => navigate('/fleet')}>
        <ArrowLeft className="h-4 w-4 mr-2" />Retour
      </Button>
    </div>
  )

  const c = société.contratActif

  return (
    <div className="space-y-6">
      <PageHeader
        title={société.raisonSociale}
        subtitle={
          <span className="flex items-center gap-2 flex-wrap text-muted-foreground">
            <span className="font-mono text-xs">NRC : {société.nrc}</span>
            <span>·</span>
            <span className="font-mono text-xs">NIF : {société.nif}</span>
            {!société.isActif && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/fleet')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />Retour
            </Button>
            <Button size="sm" onClick={() => setFactureOpen(true)}>
              <Receipt className="h-4 w-4 mr-1.5" />Facturer le mois
            </Button>
          </div>
        }
      />

      {/* Infos + contrat actif */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" />Contact</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">{société.adresseSiège}</p>
            <p>{société.téléphoneRespAchats}</p>
            <a href={`mailto:${société.emailFacturation}`} className="text-primary hover:underline">{société.emailFacturation}</a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Contrat actif</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {c ? (
              <>
                <p><span className="text-muted-foreground">Type : </span><span className="font-semibold">{TARIF_LABELS[c.typeTarif]}</span></p>
                {c.remisePourcentage && <p><span className="text-muted-foreground">Remise : </span>{c.remisePourcentage} %</p>}
                {c.plafondMensuelDZD && <p><span className="text-muted-foreground">Plafond : </span>{fmt(c.plafondMensuelDZD)}</p>}
                <p className="text-xs text-muted-foreground">Depuis {new Date(c.dateDébut).toLocaleDateString('fr-DZ')}{c.dateFin ? ` → ${new Date(c.dateFin).toLocaleDateString('fr-DZ')}` : ' (illimité)'}</p>
              </>
            ) : (
              <p className="text-orange-500 font-medium">Aucun contrat actif</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4" />Flotte</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p className="text-3xl font-bold">{société.nbVéhiculesActifs}</p>
            <p className="text-muted-foreground">véhicule{société.nbVéhiculesActifs !== 1 ? 's' : ''} actif{société.nbVéhiculesActifs !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="flotte">
        <TabsList>
          <TabsTrigger value="flotte" className="flex items-center gap-1.5">
            <Car className="h-3.5 w-3.5" />Flotte ({flotte.length})
          </TabsTrigger>
          <TabsTrigger value="contrats" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />Contrats ({contrats.length})
          </TabsTrigger>
          <TabsTrigger value="historique" className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />Factures ({historique.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Onglet Flotte ── */}
        <TabsContent value="flotte" className="mt-4">
          <div className="rounded-md border bg-card">
            <div className="flex items-center justify-between p-3 border-b">
              <p className="text-sm font-medium">Véhicules de la flotte</p>
              <Button size="sm" variant="outline" onClick={() => setVéhiculeOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />Affecter
              </Button>
            </div>
            {flotte.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">Aucun véhicule dans la flotte.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Immat.</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>N° Flotte</TableHead>
                    <TableHead>Conducteur</TableHead>
                    <TableHead className="text-right">OR (mois)</TableHead>
                    <TableHead className="text-right">Montant (mois)</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flotte.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-bold tracking-wider">{v.immatriculation}</TableCell>
                      <TableCell className="text-muted-foreground">{v.marque} {v.modele} {v.année}</TableCell>
                      <TableCell className="font-mono text-xs">{v.numéroFlotte ?? '—'}</TableCell>
                      <TableCell>{v.conducteurHabituel ?? '—'}</TableCell>
                      <TableCell className="text-right">{v.nbOR}</TableCell>
                      <TableCell className="text-right font-semibold">{v.montantMois > 0 ? fmt(v.montantMois) : '—'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => retirerMutation.mutate(v.véhiculeId)}
                          disabled={retirerMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── Onglet Contrats ── */}
        <TabsContent value="contrats" className="mt-4">
          <div className="rounded-md border bg-card">
            <div className="flex items-center justify-between p-3 border-b">
              <p className="text-sm font-medium">Historique des contrats</p>
              <Button size="sm" variant="outline" onClick={() => setContratOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />Nouveau contrat
              </Button>
            </div>
            {contrats.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">Aucun contrat.</p>
            ) : (
              <div className="divide-y">
                {contrats.map(c => (
                  <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-sm">{TARIF_LABELS[c.typeTarif]}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.dateDébut).toLocaleDateString('fr-DZ')}
                        {c.dateFin ? ` → ${new Date(c.dateFin).toLocaleDateString('fr-DZ')}` : ' → illimité'}
                      </p>
                      {c.remisePourcentage && <p className="text-xs">Remise : {c.remisePourcentage} %</p>}
                      {c.plafondMensuelDZD && <p className="text-xs">Plafond : {fmt(c.plafondMensuelDZD)}</p>}
                    </div>
                    {c.isActif
                      ? <Badge className="bg-green-100 text-green-700 text-xs">Actif</Badge>
                      : <Badge variant="secondary" className="text-xs">Archivé</Badge>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Onglet Historique factures ── */}
        <TabsContent value="historique" className="mt-4">
          <div className="rounded-md border bg-card">
            <div className="p-3 border-b">
              <p className="text-sm font-medium">Factures groupées</p>
            </div>
            {historique.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">Aucune facture groupée.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">OR</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historique.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono font-semibold text-primary text-xs">{f.numéro}</TableCell>
                      <TableCell>{MOIS_LABELS[f.périodeMois]} {f.périodeAnnée}</TableCell>
                      <TableCell className="text-right">{f.nbOR}</TableCell>
                      <TableCell className="text-right font-bold">{fmt(f.totalTTC)}</TableCell>
                      <TableCell>
                        <Badge variant={f.statut === 'Soldée' ? 'default' : 'secondary'} className="text-xs">
                          {f.statut}
                        </Badge>
                        {f.dépassementPlafond && (
                          <AlertTriangle className="inline ml-1.5 h-3.5 w-3.5 text-orange-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => navigate(`/fleet/factures/${f.id}`)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modales */}
      <ContratModal sociétéId={id!} open={contratOpen} onClose={() => setContratOpen(false)} />
      <VéhiculeModal sociétéId={id!} open={véhiculeOpen} onClose={() => setVéhiculeOpen(false)} />
      <FacturationModal sociétéId={id!} open={factureOpen} onClose={() => setFactureOpen(false)} />
    </div>
  )
}
