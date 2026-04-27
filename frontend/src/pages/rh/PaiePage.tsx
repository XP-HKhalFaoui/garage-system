import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { employeService, paieService } from '@/services/rhService'
import type { BulletinPaie, EmployeResponse } from '@/types/rh'

// ── Helpers ───────────────────────────────────────────────────────────────────

function moisLabel(mois: string) {
  const [y, m] = mois.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-DZ', { month: 'long', year: 'numeric' })
}

function StatutBadge({ statut }: { statut: string }) {
  const cfg: Record<string, string> = {
    Calculé:  'bg-yellow-100 text-yellow-700',
    Payé:     'bg-green-100 text-green-700',
    Annulé:   'bg-red-100 text-red-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg[statut] ?? 'bg-gray-100 text-gray-500'}`}>
      {statut}
    </span>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function PaiePage() {
  const qc = useQueryClient()
  const now = new Date()
  const defaultMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [selectedEmployeId, setSelectedEmployeId] = useState<string>('')
  const [mois, setMois] = useState(defaultMois)
  const [selectedBulletin, setSelectedBulletin] = useState<BulletinPaie | null>(null)

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulletins', selectedEmployeId] })
      toast.success('Bulletin calculé')
    },
    onError: () => toast.error('Erreur calcul bulletin'),
  })

  const payerMut = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      paieService.marquerPaye(id, new Date().toISOString(), 'Virement'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulletins', selectedEmployeId] })
      toast.success('Bulletin marqué payé')
      setSelectedBulletin(null)
    },
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bulletins de paie</h1>

      {/* Sélecteur employé + mois */}
      <div className="flex gap-3 mb-6">
        <select
          value={selectedEmployeId}
          onChange={e => setSelectedEmployeId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">— Sélectionner un employé —</option>
          {employes.map(e => (
            <option key={e.id} value={e.id}>{e.nomComplet}</option>
          ))}
        </select>

        <input
          type="month"
          value={mois}
          onChange={e => setMois(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        />

        <button
          onClick={() => calculerMut.mutate()}
          disabled={!selectedEmployeId || calculerMut.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {calculerMut.isPending ? 'Calcul…' : 'Calculer bulletin'}
        </button>
      </div>

      {/* Liste des bulletins */}
      {!selectedEmployeId ? (
        <div className="text-center py-16 text-gray-400">Sélectionnez un employé pour voir ses bulletins</div>
      ) : isLoading ? (
        <div className="text-center py-16 text-gray-400">Chargement…</div>
      ) : !bulletins?.length ? (
        <div className="text-center py-16 text-gray-400">Aucun bulletin pour cet employé</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Mois</th>
                <th className="text-right px-4 py-3">Jours</th>
                <th className="text-right px-4 py-3">Salaire brut</th>
                <th className="text-right px-4 py-3">Cotisations</th>
                <th className="text-right px-4 py-3">Salaire net</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bulletins.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800 capitalize">{moisLabel(b.mois)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{b.joursTravaillés}/{b.joursOuvrablesMois}</td>
                  <td className="px-4 py-3 text-right">{b.salaireBrut.toLocaleString('fr-DZ')} DA</td>
                  <td className="px-4 py-3 text-right text-red-500">-{b.totalCotisations.toLocaleString('fr-DZ')} DA</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{b.salaireNet.toLocaleString('fr-DZ')} DA</td>
                  <td className="px-4 py-3"><StatutBadge statut={b.statut} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedBulletin(b)}
                      className="text-xs text-blue-600 hover:underline mr-3"
                    >
                      Détail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal détail bulletin */}
      {selectedBulletin && (
        <BulletinModal
          bulletin={selectedBulletin}
          onClose={() => setSelectedBulletin(null)}
          onPayer={() => payerMut.mutate({ id: selectedBulletin.id })}
          isPaying={payerMut.isPending}
        />
      )}
    </div>
  )
}

// ── Modal détail bulletin ─────────────────────────────────────────────────────

function BulletinModal({
  bulletin: b,
  onClose,
  onPayer,
  isPaying,
}: {
  bulletin: BulletinPaie
  onClose: () => void
  onPayer: () => void
  isPaying: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            Bulletin — {b.employeNom} — <span className="capitalize">{moisLabel(b.mois)}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          {/* Présence */}
          <Section title="Présence">
            <Row label="Jours ouvrables" value={String(b.joursOuvrablesMois)} />
            <Row label="Jours travaillés" value={String(b.joursTravaillés)} />
          </Section>

          {/* Éléments brut */}
          <Section title="Éléments du salaire brut">
            <Row label="Salaire de base" value={`${b.salaireBase.toLocaleString('fr-DZ')} DA`} />
            {b.salaireBasePropratisé !== b.salaireBase && (
              <Row label="Salaire proratisé" value={`${b.salaireBasePropratisé.toLocaleString('fr-DZ')} DA`} />
            )}
            {b.majHeuresSup > 0 && (
              <Row label="Maj. heures sup." value={`+${b.majHeuresSup.toLocaleString('fr-DZ')} DA`} cls="text-blue-600" />
            )}
            {b.totalPrimes > 0 && (
              <Row label="Primes" value={`+${b.totalPrimes.toLocaleString('fr-DZ')} DA`} cls="text-blue-600" />
            )}
            <Row label="Salaire brut" value={`${b.salaireBrut.toLocaleString('fr-DZ')} DA`} bold />
          </Section>

          {/* Cotisations */}
          <Section title="Cotisations sociales">
            <Row label="CNAS (9%)" value={`-${b.cotisationCNAS.toLocaleString('fr-DZ')} DA`} cls="text-red-500" />
            <Row label="Retraite (2%)" value={`-${b.cotisationRetraite.toLocaleString('fr-DZ')} DA`} cls="text-red-500" />
            <Row label="IRG" value={`-${b.irg.toLocaleString('fr-DZ')} DA`} cls="text-red-500" />
            <Row label="Total cotisations" value={`-${b.totalCotisations.toLocaleString('fr-DZ')} DA`} bold cls="text-red-600" />
          </Section>

          {/* Net */}
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex justify-between items-center">
            <span className="font-semibold text-green-800">Salaire net à payer</span>
            <span className="text-xl font-bold text-green-700">{b.salaireNet.toLocaleString('fr-DZ')} DA</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <StatutBadge statut={b.statut} />
            <div className="flex gap-2">
              <button onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Fermer
              </button>
              {b.statut === 'Calculé' && (
                <button
                  onClick={onPayer}
                  disabled={isPaying}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {isPaying ? 'Traitement…' : 'Marquer payé'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{title}</p>
      <div className="bg-gray-50 rounded-lg p-3 space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value, bold, cls }: { label: string; value: string; bold?: boolean; cls?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${cls ?? 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

function StatutBadge({ statut }: { statut: string }) {
  const cfg: Record<string, string> = {
    Calculé: 'bg-yellow-100 text-yellow-700',
    Payé:    'bg-green-100 text-green-700',
    Annulé:  'bg-red-100 text-red-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg[statut] ?? 'bg-gray-100 text-gray-500'}`}>
      {statut}
    </span>
  )
}
