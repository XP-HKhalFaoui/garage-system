import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import http from '@/services/httpClient'
import type { VehiculeAvecOffresDto, OffreEntretienDto } from '@/types/crm'

const URGENCE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  Immédiat: { color: '#dc2626', bg: '#fef2f2', label: '🔴 Immédiat' },
  Bientôt:  { color: '#d97706', bg: '#fffbeb', label: '🟡 Bientôt' },
  Planifié: { color: '#2563eb', bg: '#eff6ff', label: '🔵 Planifié' },
}

function OffreBadge({ offre }: { offre: OffreEntretienDto }) {
  const cfg = URGENCE_CFG[offre.urgence] ?? URGENCE_CFG.Planifié
  return (
    <span style={{
      display: 'inline-block', background: cfg.bg, color: cfg.color,
      padding: '0.15rem 0.5rem', borderRadius: '9999px',
      fontSize: '0.72rem', fontWeight: 600, margin: '0.15rem',
    }} title={offre.messageSuggéré}>
      {cfg.label} {offre.type}
      {offre.kmRestants != null && ` (${offre.kmRestants.toLocaleString()} km)`}
    </span>
  )
}

export function OffresPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [canal, setCanal] = useState<'SMS' | 'Email'>('SMS')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data = [], isLoading, refetch } = useQuery<VehiculeAvecOffresDto[]>({
    queryKey: ['offres-a-envoyer', page],
    queryFn: () => http.get('/offres/a-envoyer', { params: { page, pageSize } }).then(r => r.data),
  })

  const mutEnvoyer = useMutation({
    mutationFn: () => http.post('/offres/envoyer', { vehiculeIds: Array.from(selected), canal }).then(r => r.data),
    onSuccess: (result) => {
      toast.success(`${result.envoyées} offre(s) envoyée(s) sur ${result.véhiculesTraités}`)
      if (result.echecs?.length) {
        result.echecs.forEach((e: { vehiculeId: string; raison: string }) =>
          toast.error(`Échec : ${e.raison}`)
        )
      }
      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ['offres-a-envoyer'] })
    },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  })

  const mutScan = useMutation({
    mutationFn: () => http.post('/offres/scan-maintenant').then(r => r.data),
    onSuccess: () => { toast.success('Scan déclenché — résultats dans quelques secondes…'); setTimeout(() => refetch(), 3000) },
    onError: () => toast.error('Erreur lors du scan'),
  })

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(data.map(v => v.vehiculeId)))
    }
  }

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const urgentCount = data.filter(v => v.offres.some(o => o.urgence === 'Immédiat')).length

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>Offres d'entretien</h1>
          {urgentCount > 0 && (
            <div style={{ marginTop: '0.25rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
              ⚠️ {urgentCount} véhicule{urgentCount > 1 ? 's' : ''} nécessite{urgentCount === 1 ? '' : 'nt'} une intervention immédiate
            </div>
          )}
        </div>
        <button
          onClick={() => mutScan.mutate()}
          disabled={mutScan.isPending}
          style={{
            padding: '0.5rem 1rem', borderRadius: '0.375rem',
            border: '1px solid #d1d5db', background: 'white',
            cursor: 'pointer', fontSize: '0.875rem', color: '#374151',
            opacity: mutScan.isPending ? 0.7 : 1,
          }}
        >
          {mutScan.isPending ? '⏳ Scan en cours…' : '🔍 Scanner maintenant'}
        </button>
      </div>

      {/* Barre d'envoi */}
      {selected.size > 0 && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem',
          padding: '0.75rem 1rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 600, color: '#1d4ed8', fontSize: '0.875rem' }}>
            {selected.size} véhicule{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {(['SMS', 'Email'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCanal(c)}
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem',
                  fontWeight: 500, cursor: 'pointer', border: '2px solid',
                  borderColor: canal === c ? '#2563eb' : '#d1d5db',
                  background: canal === c ? '#2563eb' : 'white',
                  color: canal === c ? 'white' : '#374151',
                }}
              >
                {c === 'SMS' ? '📱 SMS' : '📧 Email'}
              </button>
            ))}
          </div>
          <button
            onClick={() => mutEnvoyer.mutate()}
            disabled={mutEnvoyer.isPending}
            style={{
              padding: '0.4rem 1.25rem', borderRadius: '0.375rem',
              background: '#2563eb', color: 'white', border: 'none',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              opacity: mutEnvoyer.isPending ? 0.7 : 1,
            }}
          >
            {mutEnvoyer.isPending ? 'Envoi…' : `Envoyer via ${canal}`}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.85rem' }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Tableau */}
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '0.65rem 1rem', width: '40px' }}>
                <input type="checkbox" checked={selected.size === data.length && data.length > 0}
                  onChange={toggleAll} style={{ cursor: 'pointer' }} />
              </th>
              {['Véhicule', 'Client', 'Offres dues', 'Dernier envoi'].map(h => (
                <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Chargement…</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  ✅ Aucun véhicule ne nécessite d'offre d'entretien pour le moment.
                </td>
              </tr>
            )}
            {data.map((v, i) => (
              <tr
                key={v.vehiculeId}
                onClick={() => toggle(v.vehiculeId)}
                style={{
                  borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                  background: selected.has(v.vehiculeId) ? '#eff6ff' : i % 2 === 0 ? 'white' : '#fafafa',
                }}
              >
                <td style={{ padding: '0.65rem 1rem' }} onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(v.vehiculeId)}
                    onChange={() => toggle(v.vehiculeId)} style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '0.65rem 1rem' }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{v.immatriculation}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{v.marque} {v.modele}</div>
                </td>
                <td style={{ padding: '0.65rem 1rem' }}>
                  <div style={{ fontWeight: 500 }}>{v.client.nom}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{v.client.téléphone}</div>
                </td>
                <td style={{ padding: '0.65rem 1rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.1rem' }}>
                    {v.offres.map((o, idx) => <OffreBadge key={idx} offre={o} />)}
                  </div>
                </td>
                <td style={{ padding: '0.65rem 1rem', color: '#6b7280', fontSize: '0.85rem' }}>
                  {v.dernierEnvoi
                    ? new Date(v.dernierEnvoi).toLocaleDateString('fr-DZ')
                    : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Jamais</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {(data.length === pageSize || page > 1) && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', fontSize: '0.85rem' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              style={{ padding: '0.3rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', opacity: page === 1 ? 0.5 : 1 }}>←</button>
            <span style={{ padding: '0.3rem 0.5rem' }}>Page {page}</span>
            <button disabled={data.length < pageSize} onClick={() => setPage(p => p + 1)}
              style={{ padding: '0.3rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', opacity: data.length < pageSize ? 0.5 : 1 }}>→</button>
          </div>
        )}
      </div>
    </div>
  )
}
