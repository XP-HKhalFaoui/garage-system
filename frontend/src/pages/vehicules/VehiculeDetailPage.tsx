import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { vehiculeService } from '@/services/vehiculeService'
import { VehiculeTimeline } from '@/components/vehicules/VehiculeTimeline'
import { OffresEntretien } from '@/components/vehicules/OffresEntretien'

type Tab = 'timeline' | 'offres' | 'statistiques'

const CARBURANT_COLORS: Record<string, string> = {
  Essence: '#f59e0b',
  Diesel: '#374151',
  GPL: '#10b981',
  Hybride: '#3b82f6',
  Électrique: '#8b5cf6',
}

const CARBURANT_ICONS: Record<string, string> = {
  Essence: '⛽',
  Diesel: '🛢️',
  GPL: '🌿',
  Hybride: '⚡',
  Électrique: '🔋',
}

export function VehiculeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('timeline')

  const { data: historique, isLoading, error } = useQuery({
    queryKey: ['vehicule-historique', id],
    queryFn: () => vehiculeService.getHistorique(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: '#6b7280' }}>
        <div>Chargement…</div>
      </div>
    )
  }

  if (error || !historique) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <p>Impossible de charger les données du véhicule.</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '1rem', cursor: 'pointer' }}>
          ← Retour
        </button>
      </div>
    )
  }

  const { vehicule, client, statistiques, interventions } = historique
  const couleurCarb = CARBURANT_COLORS[vehicule.carburant] ?? '#6b7280'
  const iconCarb = CARBURANT_ICONS[vehicule.carburant] ?? '🚗'
  const offres = interventions.length > 0 ? [] : [] // will be loaded by OffresEntretien via query

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
        <Link to="/vehicules" style={{ color: '#2563eb', textDecoration: 'none' }}>Véhicules</Link>
        {' › '}
        <span>{vehicule.immatriculation}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        {/* ── Colonne gauche ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Carte véhicule */}
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
            border: '1px solid #e5e7eb', textAlign: 'center',
          }}>
            {/* Icône voiture colorée selon carburant */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: couleurCarb + '1a', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2.5rem',
            }}>
              {iconCarb}
            </div>

            <div style={{
              fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.05em',
              color: '#111827', fontFamily: 'monospace',
            }}>
              {vehicule.immatriculation}
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#f3f4f6', borderRadius: '9999px',
              padding: '0.25rem 0.75rem', marginTop: '0.5rem',
              fontSize: '0.85rem', color: '#374151',
            }}>
              {vehicule.marque} {vehicule.modele} {vehicule.version && `• ${vehicule.version}`} • {vehicule.annee}
            </div>

            {vehicule.vin && (
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                VIN: {vehicule.vin}
              </div>
            )}

            <div style={{
              display: 'flex', justifyContent: 'center', gap: '1.5rem',
              marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                  {vehicule.kilométrageActuel.toLocaleString('fr-DZ')}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>km</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: couleurCarb }}>
                  {vehicule.carburant}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>carburant</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                  {vehicule.transmission === 'Manuelle' ? 'M' : 'A'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>boîte</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => navigate(`/or/nouveau?vehiculeId=${vehicule.id}&clientId=${client.id}`)}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '0.375rem',
                  background: '#2563eb', color: 'white', border: 'none',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                }}
              >
                🔧 Créer OR
              </button>
              <button
                onClick={() => setTab('offres')}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '0.375rem',
                  background: '#f0fdf4', color: '#16a34a',
                  border: '1px solid #bbf7d0', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 500,
                }}
              >
                📤 Offre
              </button>
            </div>
          </div>

          {/* Carte client */}
          <Link
            to={`/clients/${client.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
              border: '1px solid #e5e7eb', cursor: 'pointer',
              transition: 'box-shadow 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: '#eff6ff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, color: '#2563eb', fontSize: '1rem',
                  flexShrink: 0,
                }}>
                  {(client.nom[0] + (client.prénom?.[0] ?? '')).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                    {client.raisonSociale ?? `${client.nom} ${client.prénom ?? ''}`.trim()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{client.wilaya}</div>
                </div>
                <span style={{ color: '#9ca3af', fontSize: '1rem' }}>›</span>
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                <a
                  href={`tel:${client.téléphone}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1, padding: '0.35rem',
                    background: '#f0fdf4', color: '#16a34a',
                    border: '1px solid #bbf7d0', borderRadius: '0.375rem',
                    textAlign: 'center', textDecoration: 'none', fontWeight: 500,
                  }}
                >
                  📞 {client.téléphone}
                </a>
              </div>
            </div>
          </Link>

          {/* Statistiques rapides */}
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Statistiques
            </div>
            {[
              { label: 'Interventions', value: statistiques.nbInterventions },
              { label: 'CA total HT', value: `${statistiques.montantTotalHT.toLocaleString('fr-DZ')} DA` },
              { label: 'Km parcourus', value: `${statistiques.kmParcourus.toLocaleString('fr-DZ')} km` },
              {
                label: 'Première visite',
                value: statistiques.premièreVisite
                  ? new Date(statistiques.premièreVisite).toLocaleDateString('fr-DZ')
                  : '—',
              },
              {
                label: 'Dernière visite',
                value: statistiques.dernièreVisite
                  ? new Date(statistiques.dernièreVisite).toLocaleDateString('fr-DZ')
                  : '—',
              },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.4rem 0', borderBottom: '1px solid #f9fafb',
                fontSize: '0.85rem',
              }}>
                <span style={{ color: '#6b7280' }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Colonne droite ────────────────────────────────────────────────── */}
        <div style={{
          background: 'white', borderRadius: '0.75rem',
          border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          {/* Onglets */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {(
              [
                { key: 'timeline', label: `Timeline (${interventions.length})` },
                { key: 'offres', label: 'Offres entretien' },
                { key: 'statistiques', label: 'Statistiques' },
              ] as { key: Tab; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '0.875rem 1.25rem',
                  border: 'none', background: 'transparent',
                  borderBottom: tab === key ? '2px solid #2563eb' : '2px solid transparent',
                  color: tab === key ? '#2563eb' : '#6b7280',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                  marginBottom: '-1px',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '1.5rem' }}>
            {tab === 'timeline' && (
              <VehiculeTimeline interventions={interventions} />
            )}

            {tab === 'offres' && (
              <OffresEntretien
                vehiculeId={vehicule.id}
                offres={[]}
              />
            )}

            {tab === 'statistiques' && (
              <StatsTab stats={statistiques} interventions={interventions} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Onglet statistiques ───────────────────────────────────────────────────────
function StatsTab({
  stats,
  interventions,
}: {
  stats: { nbInterventions: number; montantTotalHT: number; kmParcourus: number }
  interventions: { typeIntervention: string; montantHT: number }[]
}) {
  const byType = interventions.reduce<Record<string, { count: number; total: number }>>((acc, i) => {
    if (!acc[i.typeIntervention]) acc[i.typeIntervention] = { count: 0, total: 0 }
    acc[i.typeIntervention].count++
    acc[i.typeIntervention].total += i.montantHT
    return acc
  }, {})

  const sorted = Object.entries(byType).sort((a, b) => b[1].total - a[1].total)
  const maxTotal = sorted[0]?.[1].total ?? 1

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Interventions', value: stats.nbInterventions, color: '#2563eb' },
          { label: 'CA total HT', value: `${stats.montantTotalHT.toLocaleString('fr-DZ')} DA`, color: '#16a34a' },
          { label: 'Km parcourus', value: `${stats.kmParcourus.toLocaleString('fr-DZ')} km`, color: '#d97706' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: color + '0d', border: `1px solid ${color}33`,
            borderRadius: '0.5rem', padding: '1rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Répartition par type */}
      {sorted.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
            Répartition par type d'intervention
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sorted.map(([type, { count, total }]) => (
              <div key={type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{type}</span>
                  <span style={{ color: '#6b7280' }}>
                    {count} intervention{count > 1 ? 's' : ''} — {total.toLocaleString('fr-DZ')} DA HT
                  </span>
                </div>
                <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px' }}>
                  <div style={{
                    height: '100%', borderRadius: '3px', background: '#2563eb',
                    width: `${(total / maxTotal) * 100}%`, transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
