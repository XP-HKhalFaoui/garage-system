import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PortailVehicule {
  id: string; immatriculation: string; marque: string
  modele: string; année: number; kilométrageActuel: number
}

interface PortailClient {
  id: string; nomComplet: string; téléphone: string; email?: string
  véhicules: PortailVehicule[]
}

interface PortailOR {
  id: string; numéro: string; statut: string; typeIntervention: string
  dateCreation: string; dateeFermeture?: string; montantTotal: number; nbLignes: number
}

interface PortailFacture {
  id: string; numéro: string; statut: string
  totalTTC: number; montantDéjàPayé: number; restantDû: number
  dateFacture: string; dateEchéance: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA'
}

const STATUT_OR: Record<string, { label: string; color: string; bg: string }> = {
  EnAttente: { label: 'En attente', color: '#d97706', bg: '#fffbeb' },
  EnCours:   { label: 'En cours',   color: '#2563eb', bg: '#eff6ff' },
  Terminé:   { label: 'Terminé',    color: '#16a34a', bg: '#f0fdf4' },
  Livré:     { label: 'Livré',      color: '#6b7280', bg: '#f9fafb' },
  Annulé:    { label: 'Annulé',     color: '#dc2626', bg: '#fef2f2' },
}

const STATUT_FAC: Record<string, { label: string; color: string }> = {
  Émise:              { label: 'Émise',          color: '#2563eb' },
  PartiellemntPayée:  { label: 'Part. payée',    color: '#d97706' },
  Soldée:             { label: 'Soldée',         color: '#16a34a' },
  Annulée:            { label: 'Annulée',        color: '#6b7280' },
}

// ── Sections ──────────────────────────────────────────────────────────────────
function ORSection({ token, vehiculeId }: { token: string; vehiculeId: string }) {
  const { data = [], isLoading } = useQuery<PortailOR[]>({
    queryKey: ['portail-or', token, vehiculeId],
    queryFn: () => axios.get(`/api/portail/${token}/vehicule/${vehiculeId}/or`).then(r => r.data),
  })

  if (isLoading) return <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Chargement…</div>
  if (!data.length) return <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: '0.75rem 0' }}>Aucune intervention enregistrée.</div>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['N°', 'Type', 'Date', 'Montant', 'Statut'].map(h => (
              <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((or, i) => {
            const cfg = STATUT_OR[or.statut] ?? STATUT_OR.Livré
            return (
              <tr key={or.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>{or.numéro}</td>
                <td style={{ padding: '0.5rem 0.75rem' }}>{or.typeIntervention}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280' }}>{new Date(or.dateCreation).toLocaleDateString('fr-DZ')}</td>
                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{fmt(or.montantTotal)}</td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <span style={{ background: cfg.bg, color: cfg.color, padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600 }}>{cfg.label}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FacturesSection({ token }: { token: string }) {
  const { data = [], isLoading } = useQuery<PortailFacture[]>({
    queryKey: ['portail-factures', token],
    queryFn: () => axios.get(`/api/portail/${token}/factures`).then(r => r.data),
  })

  if (isLoading) return <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Chargement…</div>
  if (!data.length) return <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: '0.75rem 0' }}>Aucune facture.</div>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['N°', 'Date', 'Total TTC', 'Payé', 'Restant', 'Statut'].map(h => (
              <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((f, i) => {
            const cfg = STATUT_FAC[f.statut] ?? STATUT_FAC.Émise
            return (
              <tr key={f.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>{f.numéro}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280' }}>{new Date(f.dateFacture).toLocaleDateString('fr-DZ')}</td>
                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>{fmt(f.totalTTC)}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: '#16a34a' }}>{fmt(f.montantDéjàPayé)}</td>
                <td style={{ padding: '0.5rem 0.75rem', color: f.restantDû > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{fmt(f.restantDû)}</td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <span style={{ color: cfg.color, fontSize: '0.75rem', fontWeight: 600 }}>{cfg.label}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PortailClientPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [activeVehicule, setActiveVehicule] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<'or' | 'factures'>('or')

  const { data: client, isLoading, isError } = useQuery<PortailClient>({
    queryKey: ['portail', token],
    queryFn: () => axios.get(`/api/portail/${token}`).then(r => r.data),
    enabled: !!token,
    retry: false,
  })

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ color: '#6b7280' }}>Chargement de votre espace client…</div>
      </div>
    )
  }

  if (isError || !client) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', border: '1px solid #e5e7eb', maxWidth: '360px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ margin: '0 0 0.5rem', color: '#111827' }}>Lien invalide</h2>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Ce lien de portail est invalide ou a expiré. Contactez le garage.</p>
        </div>
      </div>
    )
  }

  const selectedVehicule = client.véhicules.find(v => v.id === activeVehicule) ?? client.véhicules[0]

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Header */}
      <header style={{ background: '#111827', color: 'white', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem' }}>🔩</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Espace client — Garage</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.6 }}>Portail privé</div>
        </div>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Bienvenue */}
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid #e5e7eb' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 700 }}>Bonjour, {client.nomComplet} 👋</h1>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>{client.téléphone}{client.email && ` · ${client.email}`}</div>
        </div>

        {/* Sélecteur véhicule */}
        {client.véhicules.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {client.véhicules.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveVehicule(v.id)}
                style={{
                  padding: '0.4rem 0.9rem', borderRadius: '9999px', fontSize: '0.85rem',
                  fontWeight: 500, cursor: 'pointer', border: '2px solid',
                  borderColor: (activeVehicule ?? client.véhicules[0]?.id) === v.id ? '#2563eb' : '#e5e7eb',
                  background: (activeVehicule ?? client.véhicules[0]?.id) === v.id ? '#eff6ff' : 'white',
                  color: (activeVehicule ?? client.véhicules[0]?.id) === v.id ? '#2563eb' : '#374151',
                }}
              >
                🚗 {v.immatriculation} — {v.marque} {v.modele}
              </button>
            ))}
          </div>
        )}

        {/* Carte véhicule */}
        {selectedVehicule && (
          <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedVehicule.marque} {selectedVehicule.modele} ({selectedVehicule.année})</div>
                <div style={{ fontFamily: 'monospace', color: '#6b7280', fontSize: '0.85rem', marginTop: '0.15rem' }}>{selectedVehicule.immatriculation}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                <div style={{ color: '#6b7280' }}>Kilométrage</div>
                <div style={{ fontWeight: 700, color: '#111827' }}>{selectedVehicule.kilométrageActuel.toLocaleString('fr-DZ')} km</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
              {(['or', 'factures'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.65rem 1.25rem', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                    borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeTab === tab ? '#2563eb' : '#6b7280',
                    marginBottom: '-1px',
                  }}
                >
                  {tab === 'or' ? '🔧 Interventions' : '🧾 Factures'}
                </button>
              ))}
            </div>

            <div style={{ padding: '1rem 1.25rem' }}>
              {activeTab === 'or'
                ? <ORSection token={token} vehiculeId={selectedVehicule.id} />
                : <FacturesSection token={token} />
              }
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: '2rem' }}>
          Portail client sécurisé — Garage Alteqia
        </div>
      </div>
    </div>
  )
}

// React import needed for useState
import React from 'react'
