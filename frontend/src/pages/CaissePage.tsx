import { useQuery } from '@tanstack/react-query'
import { caisseService, factureService } from '@/services/billingService'
import type { FactureSummary } from '@/types/billing'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA'
}

const today = new Date().toISOString().split('T')[0]

export function CaissePage() {
  const { data: recap, isLoading: recapLoading } = useQuery({
    queryKey: ['caisse-recap'],
    queryFn: caisseService.getRecapJour,
    refetchInterval: 30_000,
  })

  const { data: facturesData, isLoading: facturesLoading } = useQuery({
    queryKey: ['factures-jour'],
    queryFn: () => factureService.getList({ statut: 'Soldee', dateFrom: today, dateTo: today, pageSize: 50 }),
    refetchInterval: 30_000,
  })

  const facturesSoldées: FactureSummary[] = facturesData?.items ?? []

  const MODES = [
    { label: 'Espèces',  key: 'totalEspèces'  as const, icon: '💵', color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Virement', key: 'totalVirement' as const, icon: '🏦', color: '#2563eb', bg: '#eff6ff' },
    { label: 'Chèque',   key: 'totalChèque'   as const, icon: '📄', color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'CB',       key: 'totalCB'       as const, icon: '💳', color: '#d97706', bg: '#fffbeb' },
  ]

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>Caisse du jour</h1>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {new Date().toLocaleDateString('fr-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Total général */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
        borderRadius: '0.75rem', padding: '1.5rem',
        color: 'white', marginBottom: '1rem', textAlign: 'center',
      }}>
        {recapLoading ? (
          <div style={{ fontSize: '1rem', opacity: 0.7 }}>Chargement…</div>
        ) : (
          <>
            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.5rem' }}>Total encaissé aujourd'hui</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{recap ? fmt(recap.totalGeneral) : '—'}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.4rem' }}>
              {recap?.nbFacturesSoldées ?? 0} facture{(recap?.nbFacturesSoldées ?? 0) > 1 ? 's' : ''} soldée{(recap?.nbFacturesSoldées ?? 0) > 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {/* Répartition par mode */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {MODES.map(({ label, key, icon, color, bg }) => (
          <div key={key} style={{
            background: 'white', borderRadius: '0.75rem', padding: '1rem',
            border: '1px solid #e5e7eb', borderTop: `3px solid ${color}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{icon}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color }}>
              {recapLoading ? '—' : recap ? fmt(recap[key]) : '—'}
            </div>
            {!recapLoading && recap && recap.totalGeneral > 0 && (
              <div style={{
                marginTop: '0.5rem', height: '4px', background: '#e5e7eb',
                borderRadius: '9999px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(recap[key] / recap.totalGeneral * 100).toFixed(0)}%`,
                  background: color, borderRadius: '9999px',
                }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Liste des factures soldées aujourd'hui */}
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: '0.95rem' }}>
          Factures soldées aujourd'hui
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['N°', 'Client', 'Véhicule', 'Total TTC'].map(h => (
                <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facturesLoading && (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Chargement…</td></tr>
            )}
            {!facturesLoading && facturesSoldées.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '2.5rem', textAlign: 'center', color: '#6b7280' }}>Aucune facture soldée aujourd'hui.</td></tr>
            )}
            {facturesSoldées.map((f, i) => (
              <tr key={f.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>{f.numéro}</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 500 }}>{f.clientNom}</td>
                <td style={{ padding: '0.65rem 1rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.8rem' }}>{f.immatriculationVehicule ?? '—'}</td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 700, textAlign: 'right' }}>{fmt(f.totalTTC)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
