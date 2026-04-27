import { useState } from 'react'
import { toast } from 'sonner'
import { stockService } from '@/services/stockService'
import type { Article } from '@/types/stock'

interface Props {
  article: Article
  onClose: () => void
  onSuccess: () => void
}

export function AjustementModal({ article, onClose, onSuccess }: Props) {
  const [quantité, setQuantité] = useState(0)
  const [motif, setMotif]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motif.trim()) { toast.error('Le motif est obligatoire'); return }
    setLoading(true)
    try {
      await stockService.ajusterStock(article.id, quantité, 'AjustementManuel', motif)
      toast.success('Stock ajusté avec succès')
      onSuccess()
      onClose()
    } catch {
      toast.error('Erreur lors de l\'ajustement')
    } finally {
      setLoading(false)
    }
  }

  const nouveau = article.stockActuel + quantité

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ margin: '0 0 1rem' }}>Ajustement stock — {article.référence}</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 1.5rem' }}>
          {article.désignation} — Stock actuel : <strong>{article.stockActuel} {article.unité}</strong>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={lbl}>Variation (positif = ajout, négatif = retrait)</label>
            <input
              type="number"
              value={quantité}
              onChange={e => setQuantité(Number(e.target.value))}
              style={inp}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: nouveau < 0 ? '#dc2626' : '#64748b' }}>
              Nouveau stock : <strong>{nouveau}</strong> {article.unité}
            </p>
          </div>

          <div>
            <label style={lbl}>Motif *</label>
            <input
              value={motif}
              onChange={e => setMotif(e.target.value)}
              placeholder="Ex: Correction inventaire mensuel"
              style={inp}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '0.625rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
              Annuler
            </button>
            <button type="submit" disabled={loading || nouveau < 0}
              style={{ flex: 1, padding: '0.625rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Enregistrement…' : 'Valider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '1.5rem',
  width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,.15)',
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }
const inp: React.CSSProperties = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
