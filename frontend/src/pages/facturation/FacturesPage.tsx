import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { factureService } from '@/services/billingService'
import type { FactureSummary, FactureStatut, ModePaiement, EnregistrerPaiementDto } from '@/types/billing'

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUT_CONFIG: Record<FactureStatut, { label: string; color: string; bg: string }> = {
  Émise:             { label: 'Émise',             color: '#2563eb', bg: '#eff6ff' },
  PartiellemntPayée: { label: 'Part. payée',        color: '#d97706', bg: '#fffbeb' },
  Soldée:            { label: 'Soldée',             color: '#16a34a', bg: '#f0fdf4' },
  Annulée:           { label: 'Annulée',            color: '#6b7280', bg: '#f9fafb' },
}

const MODE_ICONS: Record<ModePaiement, string> = {
  Espèces: '💵',
  Virement: '🏦',
  Chèque: '📄',
  CB: '💳',
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(n) + ' DA'
}

// ── Modal paiement ────────────────────────────────────────────────────────────
function PaiementModal({
  facture,
  onClose,
}: {
  facture: FactureSummary
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<EnregistrerPaiementDto>({
    montant: facture.restantDû,
    modePaiement: 'Espèces',
    référence: '',
    datePaiement: new Date().toISOString().split('T')[0],
  })

  const mutation = useMutation({
    mutationFn: () => factureService.enregistrerPaiement(facture.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures'] })
      qc.invalidateQueries({ queryKey: ['factures-stats'] })
      onClose()
    },
  })

  const nouveauSolde = facture.montantDéjàPayé + form.montant

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
        width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
            Enregistrer un paiement
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 600 }}>{facture.numéro} — {facture.clientNom}</div>
          <div style={{ color: '#6b7280', marginTop: '0.2rem' }}>
            Total TTC : {fmt(facture.totalTTC)} · Restant dû : <strong style={{ color: '#dc2626' }}>{fmt(facture.restantDû)}</strong>
          </div>
        </div>

        {/* Montant */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
            Montant (DA)
          </label>
          <input
            type="number"
            value={form.montant}
            min={0.01}
            max={facture.restantDû}
            step="0.01"
            onChange={e => setForm(f => ({ ...f, montant: parseFloat(e.target.value) || 0 }))}
            style={{
              width: '100%', padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db', borderRadius: '0.375rem',
              fontSize: '1rem', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Mode de paiement */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
            Mode de paiement
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {(['Espèces', 'Virement', 'Chèque', 'CB'] as ModePaiement[]).map(mode => (
              <button
                key={mode}
                onClick={() => setForm(f => ({ ...f, modePaiement: mode }))}
                style={{
                  padding: '0.6rem',
                  border: '2px solid',
                  borderColor: form.modePaiement === mode ? '#2563eb' : '#e5e7eb',
                  borderRadius: '0.375rem',
                  background: form.modePaiement === mode ? '#eff6ff' : 'white',
                  color: form.modePaiement === mode ? '#2563eb' : '#374151',
                  cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem',
                }}
              >
                {MODE_ICONS[mode]} {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Référence (si virement ou chèque) */}
        {(form.modePaiement === 'Virement' || form.modePaiement === 'Chèque') && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Référence {form.modePaiement === 'Virement' ? '(n° virement)' : '(n° chèque)'}
            </label>
            <input
              type="text"
              value={form.référence}
              onChange={e => setForm(f => ({ ...f, référence: e.target.value }))}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db', borderRadius: '0.375rem',
                fontSize: '0.9rem', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Date paiement */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
            Date du paiement
          </label>
          <input
            type="date"
            value={form.datePaiement}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setForm(f => ({ ...f, datePaiement: e.target.value }))}
            style={{
              width: '100%', padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db', borderRadius: '0.375rem',
              fontSize: '0.9rem', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Résumé */}
        <div style={{
          background: form.montant >= facture.restantDû ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${form.montant >= facture.restantDû ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '1rem',
          fontSize: '0.85rem',
        }}>
          Nouveau solde : <strong>{fmt(nouveauSolde)}</strong> / {fmt(facture.totalTTC)}
          {' '}— {form.montant >= facture.restantDû ? '✅ Soldée' : `Reste : ${fmt(facture.restantDû - form.montant)}`}
        </div>

        {mutation.isError && (
          <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            Une erreur est survenue. Vérifiez le montant.
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.375rem',
              border: '1px solid #d1d5db', background: 'white',
              cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || form.montant <= 0}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '0.375rem',
              background: '#2563eb', color: 'white', border: 'none',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
              opacity: mutation.isPending || form.montant <= 0 ? 0.7 : 1,
            }}
          >
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export function FacturesPage() {
  const [statutFilter, setStatutFilter] = useState<FactureStatut | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [paiementModal, setPaiementModal] = useState<FactureSummary | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['factures-stats'],
    queryFn: factureService.getStats,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['factures', statutFilter, page],
    queryFn: () =>
      factureService.getList({
        statut: statutFilter || undefined,
        page,
        pageSize: 20,
      }),
  })

  const STAT_CARDS = [
    { label: 'CA du mois TTC',         value: stats ? fmt(stats.caMoisTTC)          : '—', color: '#2563eb', icon: '📈' },
    { label: 'Encaissé',               value: stats ? fmt(stats.encaissé)           : '—', color: '#16a34a', icon: '✅' },
    { label: 'Reste à encaisser',       value: stats ? fmt(stats.resteAEncaisser)    : '—', color: '#d97706', icon: '⏳' },
    { label: 'Factures en retard',      value: stats ? String(stats.nbEnRetard)      : '—', color: '#dc2626', icon: '⚠️' },
  ]

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageSize = 20

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#111827' }}>
        Facturation
      </h1>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {STAT_CARDS.map(({ label, value, color, icon }) => (
          <div key={label} style={{
            background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
            border: '1px solid #e5e7eb', borderLeft: `4px solid ${color}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.4rem' }}>{label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
              </div>
              <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{
        background: 'white', borderRadius: '0.75rem', padding: '1rem',
        border: '1px solid #e5e7eb', marginBottom: '1rem',
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Rechercher client, numéro…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem',
          }}
        />
        <select
          value={statutFilter}
          onChange={e => { setStatutFilter(e.target.value as FactureStatut | ''); setPage(1) }}
          style={{
            padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
            borderRadius: '0.375rem', fontSize: '0.875rem', background: 'white',
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="Émise">Émise</option>
          <option value="PartiellemntPayée">Partiellement payée</option>
          <option value="Soldée">Soldée</option>
          <option value="Annulée">Annulée</option>
        </select>
        {(statutFilter || search) && (
          <button
            onClick={() => { setStatutFilter(''); setSearch(''); setPage(1) }}
            style={{
              padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
              borderRadius: '0.375rem', background: 'white', cursor: 'pointer',
              fontSize: '0.875rem', color: '#6b7280',
            }}
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau */}
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['N°', 'Date', 'Échéance', 'Client', 'Véhicule', 'Total TTC', 'Statut', 'Actions'].map(h => (
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
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  Chargement…
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  Aucune facture trouvée.
                </td>
              </tr>
            )}
            {items.map((f, idx) => {
              const cfg = STATUT_CONFIG[f.statut] ?? STATUT_CONFIG.Émise
              const overdue = f.enRetard
              return (
                <tr key={f.id} style={{
                  borderBottom: '1px solid #f3f4f6',
                  background: idx % 2 === 0 ? 'white' : '#fafafa',
                }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                    {f.numéro}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#374151' }}>
                    {new Date(f.dateFacture).toLocaleDateString('fr-DZ')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: overdue ? '#dc2626' : '#374151', fontWeight: overdue ? 600 : 400 }}>
                    {new Date(f.dateEchéance).toLocaleDateString('fr-DZ')}
                    {overdue && <span style={{ marginLeft: '0.25rem' }}>⚠️</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{f.clientNom}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {f.immatriculationVehicule ?? '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>
                    {fmt(f.totalTTC)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      background: cfg.bg, color: cfg.color,
                      padding: '0.2rem 0.6rem', borderRadius: '9999px',
                      fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {cfg.label}
                    </span>
                    {f.restantDû > 0 && f.statut !== 'Annulée' && (
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        Reste : {fmt(f.restantDû)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {/* PDF */}
                      <a
                        href={factureService.getPdfUrl(f.id)}
                        target="_blank"
                        rel="noreferrer"
                        title="Télécharger PDF"
                        style={{
                          padding: '0.3rem 0.5rem', borderRadius: '0.25rem',
                          background: '#f3f4f6', color: '#374151', textDecoration: 'none',
                          fontSize: '0.8rem',
                        }}
                      >
                        📄
                      </a>
                      {/* Paiement */}
                      {(f.statut === 'Émise' || f.statut === 'PartiellemntPayée') && (
                        <button
                          onClick={() => setPaiementModal(f)}
                          title="Enregistrer paiement"
                          style={{
                            padding: '0.3rem 0.5rem', borderRadius: '0.25rem',
                            background: '#f0fdf4', color: '#16a34a', border: 'none',
                            cursor: 'pointer', fontSize: '0.8rem',
                          }}
                        >
                          💳
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {total > pageSize && (
          <div style={{
            padding: '0.75rem 1rem', borderTop: '1px solid #f3f4f6',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '0.85rem', color: '#6b7280',
          }}>
            <span>{total} factures trouvées</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{
                  padding: '0.3rem 0.75rem', border: '1px solid #d1d5db',
                  borderRadius: '0.375rem', background: 'white', cursor: 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                ←
              </button>
              <span style={{ padding: '0.3rem 0.5rem' }}>
                Page {page} / {Math.ceil(total / pageSize)}
              </span>
              <button
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage(p => p + 1)}
                style={{
                  padding: '0.3rem 0.75rem', border: '1px solid #d1d5db',
                  borderRadius: '0.375rem', background: 'white', cursor: 'pointer',
                  opacity: page >= Math.ceil(total / pageSize) ? 0.5 : 1,
                }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal paiement */}
      {paiementModal && (
        <PaiementModal
          facture={paiementModal}
          onClose={() => setPaiementModal(null)}
        />
      )}
    </div>
  )
}
