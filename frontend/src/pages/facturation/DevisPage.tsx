import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { devisService } from '@/services/billingService'
import type { DevisResponse, DevisStatut } from '@/types/billing'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const FMT = (n: number) => new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA'

const STATUT_VARIANT: Record<DevisStatut, string> = {
  Brouillon:    'bg-muted text-muted-foreground',
  Validé:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  EnvoyéClient: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Accepté:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Refusé:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Expiré:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

const STATUT_LABEL: Record<DevisStatut, string> = {
  Brouillon: 'Brouillon', Validé: 'Validé', EnvoyéClient: 'Envoyé client',
  Accepté: 'Accepté', Refusé: 'Refusé', Expiré: 'Expiré',
}

const FILTER_STATUTS: { label: string; value: DevisStatut | '' }[] = [
  { label: 'Tous', value: '' },
  { label: 'Brouillons', value: 'Brouillon' },
  { label: 'Validés', value: 'Validé' },
  { label: 'Envoyés', value: 'EnvoyéClient' },
  { label: 'Acceptés', value: 'Accepté' },
]

// ── Modal détail ──────────────────────────────────────────────────────────────
function DevisDetailModal({ devis, onClose }: { devis: DevisResponse; onClose: () => void }) {
  const qc = useQueryClient()
  const [refusMotif, setRefusMotif] = useState('')
  const [showRefusForm, setShowRefusForm] = useState(false)

  const mutValider  = useMutation({ mutationFn: () => devisService.valider(devis.id),  onSuccess: () => { qc.invalidateQueries({ queryKey: ['devis'] }); onClose() } })
  const mutEnvoyer  = useMutation({ mutationFn: () => devisService.envoyer(devis.id),  onSuccess: () => { qc.invalidateQueries({ queryKey: ['devis'] }); onClose() } })
  const mutAccepter = useMutation({ mutationFn: () => devisService.accepter(devis.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['devis'] }); onClose() } })
  const mutRefuser  = useMutation({ mutationFn: () => devisService.refuser(devis.id, refusMotif), onSuccess: () => { qc.invalidateQueries({ queryKey: ['devis'] }); onClose() } })

  const isExpired = new Date(devis.dateExpiration) < new Date()

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-mono">{devis.numéro}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn('text-xs', STATUT_VARIANT[devis.statut])}>
            {STATUT_LABEL[devis.statut]}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <div><span className="text-muted-foreground">Client : </span><strong>{devis.clientNom}</strong></div>
          <div><span className="text-muted-foreground">Créé le : </span>{new Date(devis.dateCreation).toLocaleDateString('fr-DZ')}</div>
          <div>
            <span className="text-muted-foreground">Expire le : </span>
            <span className={cn(isExpired && 'font-semibold text-destructive')}>
              {new Date(devis.dateExpiration).toLocaleDateString('fr-DZ')}
              {isExpired && ' ⚠'}
            </span>
          </div>
          {devis.dateEnvoi && (
            <div><span className="text-muted-foreground">Envoyé le : </span>{new Date(devis.dateEnvoi).toLocaleDateString('fr-DZ')}</div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">P.U. HT</TableHead>
              <TableHead className="text-right">TVA</TableHead>
              <TableHead className="text-right">Total TTC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devis.lignes.map(l => (
              <TableRow key={l.id}>
                <TableCell>{l.description}</TableCell>
                <TableCell className="text-right">{l.quantité}</TableCell>
                <TableCell className="text-right">{FMT(l.prixUnitaireHT)}</TableCell>
                <TableCell className="text-right">{l.tauxTVA}%</TableCell>
                <TableCell className="text-right font-semibold">{FMT(l.totalTTC)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-col items-end gap-1 text-sm">
          <p className="text-muted-foreground">Sous-total HT : {FMT(devis.sousTotalHT)}</p>
          <p className="text-muted-foreground">TVA : {FMT(devis.montantTVA)}</p>
          <p className="text-lg font-bold border-t pt-1">Total TTC : {FMT(devis.totalTTC)}</p>
        </div>

        {showRefusForm && (
          <div className="space-y-1.5">
            <Label>Motif du refus</Label>
            <Textarea value={refusMotif} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRefusMotif(e.target.value)} rows={3} />
          </div>
        )}

        <div className="flex gap-2 flex-wrap justify-end pt-1">
          <Button variant="outline" size="sm" onClick={() => devisService.downloadPdf(devis.id, devis.numéro)}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />PDF
          </Button>

          {devis.statut === 'Brouillon' && (
            <Button size="sm" onClick={() => mutValider.mutate()} disabled={mutValider.isPending}>
              {mutValider.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Valider
            </Button>
          )}

          {devis.statut === 'Validé' && (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => mutEnvoyer.mutate()} disabled={mutEnvoyer.isPending}>
              {mutEnvoyer.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Envoyer au client
            </Button>
          )}

          {devis.statut === 'EnvoyéClient' && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => mutAccepter.mutate()} disabled={mutAccepter.isPending}>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Accepté
              </Button>
              {!showRefusForm ? (
                <Button size="sm" variant="destructive" onClick={() => setShowRefusForm(true)}>
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />Refusé
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => mutRefuser.mutate()} disabled={mutRefuser.isPending || !refusMotif.trim()}>
                  {mutRefuser.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Confirmer refus
                </Button>
              )}
            </>
          )}

          <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </DialogContent>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export function DevisPage() {
  const [statutFilter, setStatutFilter] = useState<DevisStatut | ''>('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<DevisResponse | null>(null)
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['devis', statutFilter, page],
    queryFn: () => devisService.getList({ statut: statutFilter || undefined, page, pageSize }),
  })

  const items: DevisResponse[] = Array.isArray(data) ? data : []

  return (
    <div className="space-y-6">
      <PageHeader title="Devis" />

      <div className="flex gap-2 flex-wrap">
        {FILTER_STATUTS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => { setStatutFilter(value); setPage(1) }}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-colors',
              statutFilter === value
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead>Expire le</TableHead>
              <TableHead className="text-right">Total TTC</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Aucun devis trouvé.</TableCell></TableRow>
            ) : items.map(d => {
              const expired = new Date(d.dateExpiration) < new Date() && d.statut !== 'Accepté'
              return (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => setSelected(d)}>
                  <TableCell className="font-mono font-semibold text-primary">{d.numéro}</TableCell>
                  <TableCell className="font-medium">{d.clientNom}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(d.dateCreation).toLocaleDateString('fr-DZ')}</TableCell>
                  <TableCell className={cn(expired && 'font-semibold text-destructive')}>
                    {new Date(d.dateExpiration).toLocaleDateString('fr-DZ')}
                    {expired && <span className="ml-1 text-xs">⚠</span>}
                  </TableCell>
                  <TableCell className="text-right font-bold">{FMT(d.totalTTC)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('text-xs', STATUT_VARIANT[d.statut])}>
                      {STATUT_LABEL[d.statut]}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7" title="Télécharger PDF"
                      onClick={() => devisService.downloadPdf(d.id, d.numéro)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {items.length === pageSize && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t text-sm text-muted-foreground">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</Button>
            <span className="px-2">Page {page}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>→</Button>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
        {selected && <DevisDetailModal devis={selected} onClose={() => setSelected(null)} />}
      </Dialog>
    </div>
  )
}
