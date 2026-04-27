import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { stockService } from '@/services/stockService'

export function AlertesStockPage() {
  const qc = useQueryClient()
  const [résolutionId, setRésolutionId] = useState<string | null>(null)
  const [commentaire, setCommentaire]   = useState('')

  const { data: alertes = [], isLoading } = useQuery({
    queryKey: ['alertes-stock'],
    queryFn:  () => stockService.getAlertesActives(),
    refetchInterval: 30_000,
  })

  const handleRésoudre = async () => {
    if (!résolutionId || !commentaire.trim()) return
    try {
      await stockService.résoudreAlerte(résolutionId, commentaire)
      toast.success('Alerte résolue')
      qc.invalidateQueries({ queryKey: ['alertes-stock'] })
      setRésolutionId(null)
      setCommentaire('')
    } catch {
      toast.error('Erreur lors de la résolution')
    }
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: 20, fontWeight: 700 }}>
        ⚠ Alertes — Stock bas
        {alertes.length > 0 && (
          <span style={{ marginLeft: 8, background: '#dc2626', color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 13 }}>
            {alertes.length}
          </span>
        )}
      </h1>

      {isLoading ? (
        <p style={{ color: '#94a3b8' }}>Chargement…</p>
      ) : alertes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#16a34a' }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <p style={{ fontWeight: 600 }}>Aucune alerte active — tous les stocks sont suffisants</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alertes.map(a => (
            <div key={a.id} style={{
              background: '#fff', border: '1px solid #fecaca', borderRadius: 8,
              padding: '1rem 1.25rem', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  <code style={{ background: '#fef2f2', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>
                    {a.articleRéférence}
                  </code>
                  {' '}{a.articleDésignation}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Stock actuel : <strong style={{ color: '#dc2626' }}>{a.stockActuel}</strong>
                  {' / Min : '}<strong>{a.stockMinimum}</strong>
                  {' — Détectée le '}{new Date(a.dateDetection).toLocaleDateString('fr-DZ')}
                </div>
              </div>
              <button
                onClick={() => setRésolutionId(a.id)}
                style={{ padding: '0.375rem 0.875rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                Résoudre
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal résolution */}
      {résolutionId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 1rem' }}>Résoudre l'alerte</h3>
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              placeholder="Ex: Commande passée au fournisseur le 25/01"
              rows={3}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setRésolutionId(null)} style={{ flex: 1, padding: '0.625rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={handleRésoudre} disabled={!commentaire.trim()} style={{ flex: 1, padding: '0.625rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
