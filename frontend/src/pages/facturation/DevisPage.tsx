import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { devisService } from '@/services/billingService'
import type { DevisResponse, DevisStatut } from '@/types/billing'

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUT_CONFIG: Record<DevisStatut, { label: string; color: string; bg: string }> = {
  Brouillon:     { label: 'Brouillon',       color: '#6b7280', bg: '#f9fafb' },
  Validé:        { label: 'Validé',          color: '#2563eb', bg: '#eff6ff' },
  EnvoyéClient:  { label: 'Envoyé client',   color: '#7c3aed', bg: '#f5f3ff' },
  Accepté:       { label: 'Accepté',         color: '#16a34a', bg: '#f0fdf4' },
  Refusé:        { label: 'Refusé',          color: '#dc2626', bg: '#fef2f2' },
  Expiré:        { label: 'Expiré',          color: '#d97706', bg: '#fffbeb' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA'
}

// ── Modal détail / actions ────────────────────────────────────────────────────
function DevisDetailModal({
  devis,
  onClose,
}: {
  devis: DevisResponse
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [refusMotif, setRefusMotif] = useState('')
  const [showRefusForm, setShowRefusForm] = useState(false)

  const mutValider  = useMutation({ mutationFn: () => devisService.valider(devis.id),  onSuccess: () => { qc.invalidateQueries({ queryKey: ['devis'] }); onClose() } })
  const mutEnvoyer  = useMutation({ mutationFn: () => devisService.envoyer(devis.id),  onSuccess: () => { qc.invalidateQueries({ queryKey: ['devis'] }); onClose() } })
  const mutAccepter = useMutation({ mutationFn: () => devisService.accepter(devis.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['devis'] }); onClose() } })
  const mutRefuser  = useMutation({ mutationFn: () => devisService.refuser(devis.id, refusMotif), onSuccess: () => { qc.invalidateQueries({ queryKey: ['devis'] }); onClose() } })

  const cfg = STATUT_CONFIG[devis.statut]
  const isExpired = new Date(devis.dateExpiration) < new Date()

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
        width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>{devis.numéro}</h2>
            <div style={{ marginTop: '0.3rem' }}>
              <span style={{
                background: cfg.bg, color: cfg.color,
                padding: '0.2rem 0.6rem', borderRadius: '9999px',
                fontSize: '0.75rem', fontWeight: 600,
              }}>
                {cfg.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#6b7280' }}>✕</button>
        </div>

        {/* Infos */}
        <div style={{
          background: '#f9fafb', borderRadius: '0.5rem', padding: '0.75rem',
          marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
          fontSize: '0.85rem',
        }}>
          <div><span style={{ color: '#6b7280' }}>Client : </span><strong>{devis.clientNom}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Créé le : </span>{new Date(devis.dateCreation).toLocaleDateString('fr-DZ')}</div>
          <div>
            <span style={{ color: '#6b7280' }}>Expire le : </span>
            <span style={{ color: isExpired ? '#dc2626' : '#374151', fontWeight: isExpired ? 600 : 400 }}>
              {new Date(devis.dateExpiration).toLocaleDateString('fr-DZ')}
              {isExpired && ' ⚠️'}
            </span>
          </div>
          {devis.dateEnvoi && (
            <div><span style={{ color: '#6b7280' }}>Envoyé le : </span>{new Date(devis.dateEnvoi).toLocaleDateString('fr-DZ')}</div>
          )}
        </div>

        {/* Lignes */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              {['Description', 'Qté', 'P.U. HT', 'TVA', 'Total TTC'].map(h => (
                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.78rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devis.lignes.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.5rem 0.75rem' }}>{l.description}</td>
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>{l.quantité}</td>
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>{fmt(l.prixUnitaireHT)}</td>
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>{l.tauxTVA}%</td>
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>{fmt(l.totalTTC)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          gap: '0.25rem', fontSize: '0.875rem', marginBottom: '1.25rem',
        }}>
          <div style={{ color: '#6b7280' }}>Sous-total HT : {fmt(devis.sousTotalHT)}</div>
          <div style={{ color: '#6b7280' }}>TVA : {fmt(devis.montantTVA)}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', borderTop: '1px solid #e5e7eb', paddingTop: '0.4rem' }}>
            Total TTC : {fmt(devis.totalTTC)}
          </div>
        </div>

        {/* Formulaire refus */}
        {showRefusForm && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Motif du refus
            </label>
            <textarea
              value={refusMotif}
              onChange={e => setRefusMotif(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db', borderRadius: '0.375rem',
                fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical',
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* PDF */}
          <a
            href={devisService.getPdfUrl(devis.id)}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.375rem',
              border: '1px solid #d1d5db', background: 'white',
              textDecoration: 'none', color: '#374151', fontSize: '0.875rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            📄 PDF
          </a>

          {devis.statut === 'Brouillon' && (
            <button
              onClick={() => mutValider.mutate()}
              disabled={mutValider.isPending}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: mutValider.isPending ? 0.7 : 1 }}
            >
              ✅ Valider
            </button>
          )}

          {devis.statut === 'Validé' && (
            <button
              onClick={() => mutEnvoyer.mutate()}
              disabled={mutEnvoyer.isPending}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: mutEnvoyer.isPending ? 0.7 : 1 }}
            >
              📤 Envoyer au client
            </button>
          )}

          {devis.statut === 'EnvoyéClient' && (
            <>
              <button
                onClick={() => mutAccepter.mutate()}
                disabled={mutAccepter.isPending}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
              >
                👍 Accepté
              </button>
              {!showRefusForm ? (
                <button
                  onClick={() => setShowRefusForm(true)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                >
                  👎 Refusé
                </button>
              ) : (
                <button
                  onClick={() => mutRefuser.mutate()}
                  disabled={mutRefuser.isPending || !refusMotif.trim()}
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: mutRefuser.isPending || !refusMotif.trim() ? 0.7 : 1 }}
                >
                  {mutRefuser.isPending ? 'Enregistrement…' : 'Confirmer refus'}
                </button>
              )}
            </>
          )}

          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
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
    queryFn: () =>
      devisService.getList({
        statut: statutFilter || undefined,
        page,
        pageSize,
      }),
  })

  const items: DevisResponse[] = Array.isArray(data) ? data : []

  const STATS = [
    { label: 'Brouillons',    statut: 'Brouillon'    as DevisStatut, color: '#6b7280' },
    { label: 'Validés',       statut: 'Validé'       as DevisStatut, color: '#2563eb' },
    { label: 'Envoyés',       statut: 'EnvoyéClient' as DevisStatut, color: '#7c3aed' },
    { label: 'Acceptés',      statut: 'Accepté'      as DevisStatut, color: '#16a34a' },
  ]

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#111827' }}>
        Devis
      </h1>

      {/* Filtres rapides */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setStatutFilter(''); setPage(1) }}
          style={{
            padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.85rem',
            fontWeight: 500, cursor: 'pointer', border: '2px solid',
            borderColor: statutFilter === '' ? '#2563eb' : '#e5e7eb',
            background: statutFilter === '' ? '#eff6ff' : 'white',
            color: statutFilter === '' ? '#2563eb' : '#374151',
          }}
        >
          Tous
        </button>
        {STATS.map(({ label, statut, color }) => (
          <button
            key={statut}
            onClick={() => { setStatutFilter(statut); setPage(1) }}
            style={{
              padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.85rem',
              fontWeight: 500, cursor: 'pointer', border: '2px solid',
              borderColor: statutFilter === statut ? color : '#e5e7eb',
              background: statutFilter === statut ? STATUT_CONFIG[statut].bg : 'white',
              color: statutFilter === statut ? color : '#374151',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['N°', 'Client', 'Créé le', 'Expire le', 'Total TTC', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '0.75rem 1rem', textAlign: 'left',
                  fontSize: '0.78rem', fontWeight: 600, color: '#374151',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Chargement…</td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  Aucun devis trouvé.
                </td>
              </tr>
            )}
            {items.map((d, idx) => {
              const cfg = STATUT_CONFIG[d.statut]
              const expired = new Date(d.dateExpiration) < new Date()
              return (
                <tr key={d.id} style={{
                  borderBottom: '1px solid #f3f4f6',
                  background: idx % 2 === 0 ? 'white' : '#fafafa',
                  cursor: 'pointer',
                }}
                  onClick={() => setSelected(d)}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>{d.numéro}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{d.clientNom}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#374151' }}>
                    {new Date(d.dateCreation).toLocaleDateString('fr-DZ')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: expired && d.statut !== 'Accepté' ? '#dc2626' : '#374151', fontWeight: expired && d.statut !== 'Accepté' ? 600 : 400 }}>
                    {new Date(d.dateExpiration).toLocaleDateString('fr-DZ')}
                    {expired && d.statut !== 'Accepté' && ' ⚠️'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>{fmt(d.totalTTC)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      background: cfg.bg, color: cfg.color,
                      padding: '0.2rem 0.6rem', borderRadius: '9999px',
                      fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => setSelected(d)}
                        title="Voir le détail"
                        style={{
                          padding: '0.3rem 0.6rem', borderRadius: '0.25rem',
                          background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                        }}
                      >
                        🔍
                      </button>
                      <a
                        href={devisService.getPdfUrl(d.id)}
                        target="_blank"
                        rel="noreferrer"
                        title="Télécharger PDF"
                        style={{
                          padding: '0.3rem 0.6rem', borderRadius: '0.25rem',
                          background: '#f3f4f6', color: '#374151', textDecoration: 'none', fontSize: '0.8rem',
                        }}
                      >
                        📄
                      </a>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {items.length === pageSize && (
          <div style={{
            padding: '0.75rem 1rem', borderTop: '1px solid #f3f4f6',
            display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
            fontSize: '0.85rem',
          }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '0.3rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            >
              ←
            </button>
            <span style={{ padding: '0.3rem 0.5rem' }}>Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '0.3rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer' }}
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Modal détail */}
      {selected && (
        <DevisDetailModal devis={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
