import { useState } from 'react'
import type { InterventionHistorique } from '@/types/crm'

interface Props {
  interventions: InterventionHistorique[]
}

const STATUT_COLORS: Record<string, string> = {
  Livré: '#16a34a',
  TerminéTechnicien: '#2563eb',
  EnCours: '#d97706',
  Suspendu: '#9333ea',
  Annulé: '#dc2626',
  EnAttente: '#6b7280',
}

const TYPE_COLORS: Record<string, string> = {
  Vidange: '#0891b2',
  Révision: '#7c3aed',
  Diagnostic: '#d97706',
  Freinage: '#dc2626',
  Distribution: '#059669',
  Climatisation: '#2563eb',
  Électrique: '#f59e0b',
  Carrosserie: '#6b7280',
  Autre: '#9ca3af',
}

export function VehiculeTimeline({ interventions }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('')

  const types = Array.from(new Set(interventions.map(i => i.typeIntervention)))
  const filtered = filter ? interventions.filter(i => i.typeIntervention === filter) : interventions

  if (interventions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔧</div>
        <p>Aucune intervention enregistrée.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filtres par type */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setFilter('')}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            border: '1px solid',
            borderColor: filter === '' ? '#2563eb' : '#d1d5db',
            background: filter === '' ? '#eff6ff' : 'white',
            color: filter === '' ? '#2563eb' : '#374151',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 500,
          }}
        >
          Tous ({interventions.length})
        </button>
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t === filter ? '' : t)}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: filter === t ? TYPE_COLORS[t] ?? '#6b7280' : '#d1d5db',
              background: filter === t ? '#f0f9ff' : 'white',
              color: filter === t ? (TYPE_COLORS[t] ?? '#6b7280') : '#374151',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            {t} ({interventions.filter(i => i.typeIntervention === t).length})
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: '2rem' }}>
        {/* Ligne verticale */}
        <div style={{
          position: 'absolute', left: '0.5rem', top: 0, bottom: 0,
          width: '2px', background: '#e5e7eb',
        }} />

        {filtered.map(intervention => {
          const isExpanded = expanded === intervention.orId
          const couleurType = TYPE_COLORS[intervention.typeIntervention] ?? '#6b7280'
          const couleurStatut = STATUT_COLORS[intervention.statut] ?? '#6b7280'

          return (
            <div key={intervention.orId} style={{ position: 'relative', marginBottom: '1.5rem' }}>
              {/* Point de la timeline */}
              <div style={{
                position: 'absolute', left: '-1.6rem', top: '0.9rem',
                width: '1rem', height: '1rem', borderRadius: '50%',
                background: couleurType, border: '2px solid white',
                boxShadow: '0 0 0 2px ' + couleurType,
              }} />

              <div
                style={{
                  background: 'white', border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem', padding: '1rem',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onClick={() => setExpanded(isExpanded ? null : intervention.orId)}
              >
                {/* En-tête */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      background: couleurType + '1a', color: couleurType,
                      padding: '0.15rem 0.6rem', borderRadius: '9999px',
                      fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {intervention.typeIntervention}
                    </span>
                    <span style={{
                      background: couleurStatut + '1a', color: couleurStatut,
                      padding: '0.15rem 0.6rem', borderRadius: '9999px',
                      fontSize: '0.75rem', fontWeight: 500,
                    }}>
                      {intervention.statut}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280', fontFamily: 'monospace' }}>
                      {intervention.numéro}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                      {intervention.montantHT.toLocaleString('fr-DZ')} DA
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {new Date(intervention.date).toLocaleDateString('fr-DZ', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>

                {intervention.technicienNom && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    👨‍🔧 {intervention.technicienNom}
                  </div>
                )}

                {/* Détail expandable */}
                {isExpanded && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                    {intervention.pièces.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Pièces
                        </div>
                        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#6b7280' }}>
                              <th style={{ textAlign: 'left', paddingBottom: '0.25rem' }}>Désignation</th>
                              <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Qté</th>
                              <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>PU HT</th>
                              <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {intervention.pièces.map((p, i) => (
                              <tr key={i} style={{ borderTop: '1px solid #f9fafb' }}>
                                <td style={{ padding: '0.2rem 0' }}>
                                  {p.référence && <span style={{ color: '#9ca3af', marginRight: '0.5rem' }}>{p.référence}</span>}
                                  {p.description}
                                </td>
                                <td style={{ textAlign: 'right' }}>{p.quantité}</td>
                                <td style={{ textAlign: 'right' }}>{p.puHT.toLocaleString('fr-DZ')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 500 }}>{p.totalHT.toLocaleString('fr-DZ')} DA</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {intervention.mainOeuvre.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Main d'œuvre
                        </div>
                        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#6b7280' }}>
                              <th style={{ textAlign: 'left', paddingBottom: '0.25rem' }}>Description</th>
                              <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Qté</th>
                              <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Taux</th>
                              <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {intervention.mainOeuvre.map((mo, i) => (
                              <tr key={i} style={{ borderTop: '1px solid #f9fafb' }}>
                                <td style={{ padding: '0.2rem 0' }}>{mo.description}</td>
                                <td style={{ textAlign: 'right' }}>{mo.quantité}h</td>
                                <td style={{ textAlign: 'right' }}>{mo.puHT.toLocaleString('fr-DZ')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 500 }}>{mo.totalHT.toLocaleString('fr-DZ')} DA</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'right' }}>
                  {isExpanded ? '▲ Réduire' : '▼ Détails'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
