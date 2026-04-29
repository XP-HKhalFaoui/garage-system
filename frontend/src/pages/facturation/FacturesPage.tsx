import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, FileText, CreditCard, X, TrendingUp, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { factureService } from '@/services/billingService'
import type { FactureSummary, FactureStatut, ModePaiement, EnregistrerPaiementDto } from '@/types/billing'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const FMT = (n: number) => new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA'

const MODES: ModePaiement[] = ['Espèces', 'Virement', 'Chèque', 'CB']
const MODE_ICONS: Record<ModePaiement, string> = { Espèces: '💵', Virement: '🏦', Chèque: '📄', CB: '💳' }

function statutVariant(s: FactureStatut) {
  const map: Record<FactureStatut, 'invoice-Emise' | 'invoice-PartiellemntPayée' | 'invoice-Soldée' | 'invoice-EnRetard' | 'invoice-Annulée'> = {
    'Émise':             'invoice-Emise',
    'PartiellemntPayée': 'invoice-PartiellemntPayée',
    'Soldée':            'invoice-Soldée',
    'Annulée':           'invoice-Annulée',
  }
  return map[s] ?? 'invoice-Emise'
}

// ── Modal paiement ────────────────────────────────────────────────────────────
function PaiementModal({ facture, onClose }: { facture: FactureSummary; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<EnregistrerPaiementDto>({
    montant: facture.restantDû,
    modePaiement: 'Espèces',
    référence: '',
    datePaiement: new Date().toISOString().split('T')[0],
  })

  const mutation = useMutation({
    mutationFn: () => factureService.enregistrerPaiement(facture.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['factures'] }); qc.invalidateQueries({ queryKey: ['factures-stats'] }); onClose() },
  })

  const nouveauSolde = facture.montantDéjàPayé + form.montant
  const soldé = form.montant >= facture.restantDû

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Enregistrer un paiement</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-semibold">{facture.numéro} — {facture.clientNom}</p>
          <p className="text-muted-foreground mt-0.5">
            Total TTC : {FMT(facture.totalTTC)} · Restant dû : <span className="font-semibold text-destructive">{FMT(facture.restantDû)}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Montant (DA)</Label>
          <Input
            type="number"
            value={form.montant}
            min={0.01}
            max={facture.restantDû}
            step="0.01"
            onChange={e => setForm(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Mode de paiement</Label>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setForm(f => ({ ...f, modePaiement: mode }))}
                className={cn(
                  'rounded-md border-2 p-2.5 text-sm font-medium transition-colors',
                  form.modePaiement === mode
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                )}
              >
                {MODE_ICONS[mode]} {mode}
              </button>
            ))}
          </div>
        </div>

        {(form.modePaiement === 'Virement' || form.modePaiement === 'Chèque') && (
          <div className="space-y-1.5">
            <Label>Référence ({form.modePaiement === 'Virement' ? 'n° virement' : 'n° chèque'})</Label>
            <Input value={form.référence} onChange={e => setForm(f => ({ ...f, référence: e.target.value }))} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Date du paiement</Label>
          <Input type="date" value={form.datePaiement} max={new Date().toISOString().split('T')[0]} onChange={e => setForm(f => ({ ...f, datePaiement: e.target.value }))} />
        </div>

        <div className={cn('rounded-md border p-3 text-sm', soldé ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800')}>
          Nouveau solde : <span className="font-semibold">{FMT(nouveauSolde)}</span> / {FMT(facture.totalTTC)}
          {' — '}{soldé ? '✅ Soldée' : `Reste : ${FMT(facture.restantDû - form.montant)}`}
        </div>

        {mutation.isError && <p className="text-sm text-destructive">Une erreur est survenue. Vérifiez le montant.</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || form.montant <= 0}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function FacturesPage() {
  const [statutFilter, setStatutFilter] = useState<FactureStatut | 'all'>('all')
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(1)
  const [paiementModal, setPaiementModal] = useState<FactureSummary | null>(null)

  const { data: stats } = useQuery({ queryKey: ['factures-stats'], queryFn: factureService.getStats })

  const { data, isLoading } = useQuery({
    queryKey: ['factures', statutFilter, page],
    queryFn: () => factureService.getList({ statut: statutFilter !== 'all' ? statutFilter : undefined, page, pageSize: 20 }),
  })

  const items     = data?.items ?? []
  const total     = data?.total ?? 0
  const pageSize  = 20
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title="Facturation" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CA du mois TTC"       value={stats ? FMT(stats.caMoisTTC)       : '—'} icon={TrendingUp} />
        <StatCard label="Encaissé"              value={stats ? FMT(stats.encaissé)        : '—'} icon={CheckCircle} />
        <StatCard label="Reste à encaisser"     value={stats ? FMT(stats.resteAEncaisser) : '—'} icon={Clock} />
        <StatCard
          label="Factures en retard"
          value={stats ? String(stats.nbEnRetard) : '—'}
          icon={AlertTriangle}
          className={stats?.nbEnRetard ? 'border-red-200 dark:border-red-800' : ''}
        />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center rounded-lg border bg-muted/40 p-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Client, numéro…" className="pl-8 bg-background" />
        </div>
        <Select value={statutFilter} onValueChange={v => { setStatutFilter(v as FactureStatut | 'all'); setPage(1) }}>
          <SelectTrigger className="w-48 bg-background"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="Émise">Émise</SelectItem>
            <SelectItem value="PartiellemntPayée">Partiellement payée</SelectItem>
            <SelectItem value="Soldée">Soldée</SelectItem>
            <SelectItem value="Annulée">Annulée</SelectItem>
          </SelectContent>
        </Select>
        {(statutFilter !== 'all' || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatutFilter('all'); setSearch(''); setPage(1) }} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />Réinitialiser
          </Button>
        )}
      </div>

      {/* Tableau */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead className="text-right">Total TTC</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Aucune facture trouvée.</TableCell></TableRow>
            ) : items.map(f => (
              <TableRow key={f.id}>
                <TableCell className="font-mono font-semibold text-primary">{f.numéro}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(f.dateFacture).toLocaleDateString('fr-DZ')}</TableCell>
                <TableCell className={cn(f.enRetard && 'font-semibold text-destructive')}>
                  {new Date(f.dateEchéance).toLocaleDateString('fr-DZ')}
                  {f.enRetard && <span className="ml-1 text-xs">⚠</span>}
                </TableCell>
                <TableCell className="font-medium">{f.clientNom}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{f.immatriculationVehicule ?? '—'}</TableCell>
                <TableCell className="text-right font-bold">{FMT(f.totalTTC)}</TableCell>
                <TableCell>
                  <StatusBadge variant={statutVariant(f.statut)} />
                  {f.restantDû > 0 && f.statut !== 'Annulée' && (
                    <p className="text-xs text-muted-foreground mt-0.5">Reste : {FMT(f.restantDû)}</p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7" title="Télécharger PDF"
                      onClick={() => factureService.downloadPdf(f.id, f.numéro)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    {(f.statut === 'Émise' || f.statut === 'PartiellemntPayée') && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="Paiement" onClick={() => setPaiementModal(f)}>
                        <CreditCard className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>{total} factures trouvées</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</Button>
              <span className="px-2 py-1">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!paiementModal} onOpenChange={open => { if (!open) setPaiementModal(null) }}>
        {paiementModal && <PaiementModal facture={paiementModal} onClose={() => setPaiementModal(null)} />}
      </Dialog>
    </div>
  )
}
