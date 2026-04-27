import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { stockService } from '@/services/stockService'
import { StockBadge } from '@/components/stock/StockBadge'
import { AjustementModal } from '@/components/stock/AjustementModal'
import type { Article, ArticleCategorie } from '@/types/stock'

const CATEGORIES: ArticleCategorie[] = [
  'Filtres','Huiles','Freinage','Transmission','Suspension',
  'Moteur','Électrique','Carrosserie','Accessoires','Autre',
]

export function ArticlesPage() {
  const qc = useQueryClient()

  // Filtres
  const [search, setSearch]       = useState('')
  const [categorie, setCategorie] = useState<ArticleCategorie | ''>('')
  const [stockBas, setStockBas]   = useState(false)
  const [page, setPage]           = useState(1)
  const PAGE_SIZE = 20

  // Modal ajustement
  const [ajustArticle, setAjustArticle] = useState<Article | null>(null)

  // Query
  const { data, isLoading } = useQuery({
    queryKey: ['articles', { search, categorie, stockBas, page }],
    queryFn: () => stockService.getArticles({
      search: search || undefined,
      categorie: (categorie as ArticleCategorie) || undefined,
      stockBas,
      page,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: prev => prev,
  })

  // Alertes stock bas
  const { data: alertes = [] } = useQuery({
    queryKey: ['alertes-stock'],
    queryFn: () => stockService.getAlertesActives(),
    refetchInterval: 60_000,
  })

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['articles'] })
    qc.invalidateQueries({ queryKey: ['alertes-stock'] })
  }, [qc])

  const handleDelete = async (id: string, ref: string) => {
    if (!confirm(`Supprimer l'article ${ref} ?`)) return
    try {
      await stockService.delete(id)
      toast.success('Article supprimé')
      invalidate()
    } catch {
      toast.error('Impossible de supprimer (stock non vide ou OR actif)')
    }
  }

  const resetFiltres = () => {
    setSearch(''); setCategorie(''); setStockBas(false); setPage(1)
  }

  const articles = data?.items ?? []
  const total    = data?.total ?? 0

  return (
    <div style={{ padding: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📦 Stock — Articles</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{total} articles trouvés</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {alertes.length > 0 && (
            <span style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', borderRadius: 20, padding: '0.375rem 0.875rem',
              fontSize: 12, fontWeight: 700,
            }}>
              ⚠ {alertes.length} alerte{alertes.length > 1 ? 's' : ''} stock bas
            </span>
          )}
          <button style={btnPrimary}>+ Nouvel article</button>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '0.875rem', borderRadius: 8 }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Référence, désignation, OEM…"
          style={{ ...filterInput, minWidth: 220 }}
        />
        <select
          value={categorie}
          onChange={e => { setCategorie(e.target.value as ArticleCategorie | ''); setPage(1) }}
          style={filterInput}
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={stockBas}
            onChange={e => { setStockBas(e.target.checked); setPage(1) }}
          />
          Stock bas
          {stockBas && alertes.length > 0 && (
            <span style={{ background: '#dc2626', color: '#fff', borderRadius: 12, padding: '1px 6px', fontSize: 11 }}>
              {alertes.length}
            </span>
          )}
        </label>
        <button onClick={resetFiltres} style={{ ...filterInput, cursor: 'pointer', background: '#fff', color: '#64748b' }}>
          ✕ Réinitialiser
        </button>
      </div>

      {/* Tableau */}
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              {['Référence','Désignation','Catégorie','Stock','Min','PU HT vente','Emplacement','Statut','Actions'].map(h => (
                <th key={h} style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Chargement…</td></tr>
            ) : articles.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Aucun article trouvé</td></tr>
            ) : articles.map((a, i) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={td}><code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{a.référence}</code></td>
                <td style={{ ...td, maxWidth: 200 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.désignation}</div>
                  {a.référenceOEM && <div style={{ fontSize: 11, color: '#94a3b8' }}>OEM: {a.référenceOEM}</div>}
                </td>
                <td style={td}><span style={{ fontSize: 11, color: '#64748b' }}>{a.catégorie}</span></td>
                <td style={{ ...td, fontWeight: 700, color: a.stockBas ? '#dc2626' : '#0f172a' }}>
                  {a.stockActuel} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 11 }}>{a.unité}</span>
                </td>
                <td style={{ ...td, color: '#64748b' }}>{a.stockMinimum}</td>
                <td style={{ ...td, fontWeight: 600 }}>{a.prixVente.toLocaleString('fr-DZ')} DA</td>
                <td style={{ ...td, color: '#64748b', fontSize: 12 }}>{a.emplacementRayonnage ?? '—'}</td>
                <td style={td}><StockBadge stockActuel={a.stockActuel} stockMinimum={a.stockMinimum} /></td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button
                      onClick={() => setAjustArticle(a)}
                      style={actionBtn}
                      title="Ajuster le stock"
                    >
                      ±
                    </button>
                    <button
                      onClick={() => handleDelete(a.id, a.référence)}
                      style={{ ...actionBtn, color: '#dc2626' }}
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>
            Page {page} / {Math.ceil(total / PAGE_SIZE)}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={pageBtn}>← Précédent</button>
            <button disabled={page * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)} style={pageBtn}>Suivant →</button>
          </div>
        </div>
      )}

      {/* Modal ajustement */}
      {ajustArticle && (
        <AjustementModal
          article={ajustArticle}
          onClose={() => setAjustArticle(null)}
          onSuccess={invalidate}
        />
      )}
    </div>
  )
}

// Styles
const btnPrimary: React.CSSProperties = {
  padding: '0.5rem 1rem', background: '#2563eb', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
}
const filterInput: React.CSSProperties = {
  padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0',
  borderRadius: 6, fontSize: 13, background: '#fff',
}
const td: React.CSSProperties = { padding: '0.625rem 0.875rem', verticalAlign: 'middle' }
const actionBtn: React.CSSProperties = {
  padding: '0.25rem 0.5rem', background: '#f1f5f9',
  border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', fontSize: 13,
}
const pageBtn: React.CSSProperties = {
  padding: '0.375rem 0.75rem', border: '1px solid #e2e8f0',
  borderRadius: 6, cursor: 'pointer', background: '#fff', fontSize: 13,
}
