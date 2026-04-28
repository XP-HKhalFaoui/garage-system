import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import { employeService, paieService } from '@/services/rhService'
import type { BulletinPaie, EmployeResponse } from '@/types/rh'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function moisLabel(mois: string) {
  const [y, m] = mois.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-DZ', { month: 'long', year: 'numeric' })
}

function PaieStatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    Calculé: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    Payé:    'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300',
    Annulé:  'bg-red-100    text-red-600    dark:bg-red-900/30    dark:text-red-300',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', map[statut] ?? 'bg-muted text-muted-foreground')}>
      {statut}
    </span>
  )
}

export default function PaiePage() {
  const qc = useQueryClient()
  const now = new Date()
  const defaultMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [selectedEmployeId, setSelectedEmployeId] = useState('')
  const [mois, setMois]                           = useState(defaultMois)
  const [selectedBulletin, setSelectedBulletin]   = useState<BulletinPaie | null>(null)

  const { data: employesData } = useQuery({
    queryKey: ['employes-actifs'],
    queryFn: () => employeService.getList({ actif: true, pageSize: 100 }),
  })
  const employes: EmployeResponse[] = employesData?.items ?? []

  const { data: bulletins, isLoading } = useQuery({
    queryKey: ['bulletins', selectedEmployeId],
    queryFn: () => paieService.getBulletins(selectedEmployeId),
    enabled: !!selectedEmployeId,
  })

  const calculerMut = useMutation({
    mutationFn: () => paieService.calculer(selectedEmployeId, mois),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bulletins', selectedEmployeId] }); toast.success('Bulletin calculé') },
    onError: () => toast.error('Erreur calcul bulletin'),
  })

  const payerMut = useMutation({
    mutationFn: ({ id }: { id: string }) => paieService.marquerPaye(id, new Date().toISOString(), 'Virement'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bulletins', selectedEmployeId] }); toast.success('Bulletin marqué payé'); setSelectedBulletin(null) },
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Bulletins de paie" />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedEmployeId} onValueChange={setSelectedEmployeId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="— Sélectionner un employé —" />
          </SelectTrigger>
          <SelectContent>
            {employes.map(e => <SelectItem key={e.id} value={e.id}>{e.nomComplet}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          type="month"
          value={mois}
          onChange={e => setMois(e.target.value)}
          className="w-44"
        />

        <Button
          onClick={() => calculerMut.mutate()}
          disabled={!selectedEmployeId || calculerMut.isPending}
        >
          {calculerMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Calculer bulletin
        </Button>
      </div>

      {/* Contenu */}
      {!selectedEmployeId ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground border rounded-lg border-dashed">
          Sélectionnez un employé pour voir ses bulletins
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : !bulletins?.length ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground border rounded-lg border-dashed">
          Aucun bulletin pour cet employé
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mois</TableHead>
                <TableHead className="text-right">Jours</TableHead>
                <TableHead className="text-right">Salaire brut</TableHead>
                <TableHead className="text-right">Cotisations</TableHead>
                <TableHead className="text-right">Salaire net</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bulletins.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium capitalize">{moisLabel(b.mois)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{b.joursTravaillés}/{b.joursOuvrablesMois}</TableCell>
                  <TableCell className="text-right">{b.salaireBrut.toLocaleString('fr-DZ')} DA</TableCell>
                  <TableCell className="text-right text-red-500">-{b.totalCotisations.toLocaleString('fr-DZ')} DA</TableCell>
                  <TableCell className="text-right font-semibold text-green-700 dark:text-green-400">{b.salaireNet.toLocaleString('fr-DZ')} DA</TableCell>
                  <TableCell><PaieStatutBadge statut={b.statut} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedBulletin(b)}>
                        Détail
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Télécharger PDF">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog détail */}
      <Dialog open={!!selectedBulletin} onOpenChange={open => { if (!open) setSelectedBulletin(null) }}>
        <DialogContent className="max-w-lg">
          {selectedBulletin && (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize">
                  Bulletin — {selectedBulletin.employeNom} — {moisLabel(selectedBulletin.mois)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <BulletinSection title="Présence">
                  <BulletinRow label="Jours ouvrables"  value={String(selectedBulletin.joursOuvrablesMois)} />
                  <BulletinRow label="Jours travaillés" value={String(selectedBulletin.joursTravaillés)} />
                </BulletinSection>

                <BulletinSection title="Éléments du salaire brut">
                  <BulletinRow label="Salaire de base" value={`${selectedBulletin.salaireBase.toLocaleString('fr-DZ')} DA`} />
                  {selectedBulletin.salaireBasePropratisé !== selectedBulletin.salaireBase && (
                    <BulletinRow label="Salaire proratisé" value={`${selectedBulletin.salaireBasePropratisé.toLocaleString('fr-DZ')} DA`} />
                  )}
                  {selectedBulletin.majHeuresSup > 0 && (
                    <BulletinRow label="Maj. heures sup." value={`+${selectedBulletin.majHeuresSup.toLocaleString('fr-DZ')} DA`} valueClass="text-blue-600" />
                  )}
                  {selectedBulletin.totalPrimes > 0 && (
                    <BulletinRow label="Primes" value={`+${selectedBulletin.totalPrimes.toLocaleString('fr-DZ')} DA`} valueClass="text-blue-600" />
                  )}
                  <BulletinRow label="Salaire brut" value={`${selectedBulletin.salaireBrut.toLocaleString('fr-DZ')} DA`} bold />
                </BulletinSection>

                <BulletinSection title="Cotisations sociales">
                  <BulletinRow label="CNAS (9%)"   value={`-${selectedBulletin.cotisationCNAS.toLocaleString('fr-DZ')} DA`}       valueClass="text-red-500" />
                  <BulletinRow label="Retraite (2%)" value={`-${selectedBulletin.cotisationRetraite.toLocaleString('fr-DZ')} DA`} valueClass="text-red-500" />
                  <BulletinRow label="IRG"          value={`-${selectedBulletin.irg.toLocaleString('fr-DZ')} DA`}                  valueClass="text-red-500" />
                  <BulletinRow label="Total cotisations" value={`-${selectedBulletin.totalCotisations.toLocaleString('fr-DZ')} DA`} bold valueClass="text-red-600" />
                </BulletinSection>

                <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                  <span className="font-semibold text-green-800 dark:text-green-300">Salaire net à payer</span>
                  <span className="text-xl font-bold text-green-700 dark:text-green-400">
                    {selectedBulletin.salaireNet.toLocaleString('fr-DZ')} DA
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <PaieStatutBadge statut={selectedBulletin.statut} />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedBulletin(null)}>Fermer</Button>
                    {selectedBulletin.statut === 'Calculé' && (
                      <Button
                        onClick={() => payerMut.mutate({ id: selectedBulletin.id })}
                        disabled={payerMut.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {payerMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                        Marquer payé
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BulletinSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">{children}</div>
    </div>
  )
}

function BulletinRow({ label, value, bold, valueClass }: { label: string; value: string; bold?: boolean; valueClass?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(bold && 'font-semibold', valueClass ?? 'text-foreground')}>{value}</span>
    </div>
  )
}
