import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OffreEntretien, OffreEnvoyeeHist } from '@/types/crm'
import { crmService } from '@/services/crmService'

interface Props {
  vehiculeId: string
  offres: OffreEntretien[]
}

const URGENCE_CONFIG = {
  Immédiat: { color: '#dc2626', bg: '#fef2f2', label: 'Immédiat', icon: '🔴' },
  Bientôt:  { color: '#d97706', bg: '#fffbeb', label: 'Bientôt',  icon: '🟠' },
  Préventif: { color: '#2563eb', bg: '#eff6ff', label: 'Préventif', icon: '🔵' },
}

export function OffresEntretien({ vehiculeId, offres }: Props) {
  const [envoi, setEnvoi] = useState<{ canal: 'SMS' | 'Email' | 'LesDeux' } | null>(null)
  const queryClient = useQueryClient()

  const { data: historique = [] } = useQuery({
    queryKey: ['offres-vehicule', vehiculeId],
    queryFn: () => crmService.getOffresVehicule(vehiculeId),
  })

  const envoyerMutation = useMutation({
    mutationFn: () =>
      crmService.envoyer({ vehiculeIds: [vehiculeId], canal: envoi!.canal }),
    onSuccess: () => {
      setEnvoi(null)
      queryClient.invalidateQueries({ queryKey: ['offres-vehicule', vehiculeId] })
    },
  })

  return (
    <div>
      {/* Offres dues */}
      {offres.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#16a34a' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
          <p style={{ fontWeight: 500 }}>Aucun entretien en attente.</p>
          <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Ce véhicule est à jour sur tous ses entretiens.</p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
              {offres.length} entretien{offres.length > 1 ? 's' : ''} recommandé{offres.length > 1 ? 's' : ''}
            </h3>
            <button
              onClick={() => setEnvoi({ canal: 'SMS' })}
              style={{
                padding: '0.4rem 1rem', borderRadius: '0.375rem',
                background: '#2563eb', color: 'white', border: 'none',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
              }}
            >
              📤 Envoyer offre
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {offres.map((offre, i) => {
              const cfg = URGENCE_CONFIG[offre.urgence] ?? URGENCE_CONFIG.Préventif
              return (
                <div key={i} style={{
                  background: cfg.bg, border: `1px solid ${cfg.color}33`,
                  borderRadius: '0.5rem', padding: '0.875rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: cfg.color }}>
                        {offre.type}
                      </span>
                    </div>
                    <span style={{
                      background: cfg.color, color: 'white',
                      padding: '0.15rem 0.5rem', borderRadius: '9999px',
                      fontSize: '0.7rem', fontWeight: 600,
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: '#374151' }}>
                    {offre.messageSuggéré}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.78rem', color: '#6b7280' }}>
                    {offre.kmRestants !== undefined && offre.kmRestants !== null && (
                      <span>📍 {offre.kmRestants.toLocaleString('fr-DZ')} km restants</span>
                    )}
                    {offre.joursRestants !== undefined && offre.joursRestants !== null && (
                      <span>📅 {offre.joursRestants} jours restants</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal d'envoi */}
      {envoi && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
            width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem' }}>Envoyer offre d'entretien</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Canal d'envoi
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['SMS', 'Email', 'LesDeux'] as const).map(canal => (
                  <button
                    key={canal}
                    onClick={() => setEnvoi({ canal })}
                    style={{
                      flex: 1, padding: '0.5rem',
                      border: '2px solid',
                      borderColor: envoi.canal === canal ? '#2563eb' : '#e5e7eb',
                      borderRadius: '0.375rem',
                      background: envoi.canal === canal ? '#eff6ff' : 'white',
                      color: envoi.canal === canal ? '#2563eb' : '#374151',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                    }}
                  >
                    {canal === 'LesDeux' ? 'SMS + Email' : canal}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEnvoi(null)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.375rem',
                  border: '1px solid #d1d5db', background: 'white',
                  cursor: 'pointer', fontSize: '0.85rem',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => envoyerMutation.mutate()}
                disabled={envoyerMutation.isPending}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.375rem',
                  background: '#2563eb', color: 'white', border: 'none',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                }}
              >
                {envoyerMutation.isPending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historique des envois */}
      {historique.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
            Historique des offres envoyées
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {historique.map(o => (
              <div key={o.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem',
                border: '1px solid #e5e7eb', fontSize: '0.82rem',
              }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{o.types.join(', ')}</span>
                  <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>via {o.canal}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: '#6b7280' }}>
                    {new Date(o.dateEnvoi).toLocaleDateString('fr-DZ')}
                  </span>
                  <span style={{
                    padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem',
                    background: o.statut === 'Acceptée' ? '#dcfce7'
                              : o.statut === 'Refusée' ? '#fee2e2'
                              : '#f3f4f6',
                    color: o.statut === 'Acceptée' ? '#16a34a'
                         : o.statut === 'Refusée' ? '#dc2626'
                         : '#6b7280',
                    fontWeight: 500,
                  }}>
                    {o.statut}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
