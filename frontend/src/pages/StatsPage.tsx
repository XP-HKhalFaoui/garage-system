import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import api from '@/services/api'
import type { CaMensuel, StatsTechnicien, StatsArticle } from '@/types/stats'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0 }).format(n) + ' DA'
}

// ── CA mensuel ────────────────────────────────────────────────────────────────
function CaMensuelChart() {
  const [nbMois, setNbMois] = useState(6)
  const { data = [], isLoading } = useQuery<CaMensuel[]>({
    queryKey: ['ca-mensuel', nbMois],
    queryFn: () => api.get('/stats/ca-mensuel', { params: { nbMois } }).then(r => r.data),
  })

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Chiffre d'affaires mensuel</h2>
        <select
          value={nbMois}
          onChange={e => setNbMois(Number(e.target.value))}
          style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.85rem', background: 'white' }}
        >
          <option value={3}>3 mois</option>
          <option value={6}>6 mois</option>
          <option value={12}>12 mois</option>
        </select>
      </div>
      {isLoading ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Chargement…</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [fmt(v)]} />
            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
            <Bar dataKey="ca"        name="CA TTC"   fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="encaissé"  name="Encaissé" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ── Évolution CA (line) ───────────────────────────────────────────────────────
function CaLineChart() {
  const { data = [] } = useQuery<CaMensuel[]>({
    queryKey: ['ca-mensuel', 12],
    queryFn: () => api.get('/stats/ca-mensuel', { params: { nbMois: 12 } }).then(r => r.data),
  })

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Tendance 12 mois</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => [fmt(v)]} />
          <Line type="monotone" dataKey="ca"       name="CA TTC"   stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="encaissé" name="Encaissé" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Techniciens ───────────────────────────────────────────────────────────────
function TechniciensChart() {
  const now = new Date()
  const [annee, setAnnee] = useState(now.getFullYear())
  const [mois, setMois] = useState(now.getMonth() + 1)

  const { data = [], isLoading } = useQuery<StatsTechnicien[]>({
    queryKey: ['stats-techniciens', annee, mois],
    queryFn: () => api.get('/stats/techniciens', { params: { annee, mois } }).then(r => r.data),
  })

  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Performance techniciens</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={mois} onChange={e => setMois(Number(e.target.value))}
            style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.85rem', background: 'white' }}>
            {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={annee} onChange={e => setAnnee(Number(e.target.value))}
            style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.85rem', background: 'white' }}>
            {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Chargement…</div>
      ) : data.length === 0 ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Aucune donnée.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Technicien', 'OR réalisés', 'Main d\'œuvre HT', 'Taux occupation'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((t, i) => (
                <tr key={t.nom} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{t.nom}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{t.nbOR}</td>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{fmt(t.totalMO)}</td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(t.tauxOccupation, 100)}%`, background: t.tauxOccupation >= 80 ? '#16a34a' : t.tauxOccupation >= 50 ? '#d97706' : '#dc2626', borderRadius: '9999px' }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '2.5rem', textAlign: 'right' }}>{t.tauxOccupation}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Rotation stock ────────────────────────────────────────────────────────────
function StockRotationTable() {
  const { data = [], isLoading } = useQuery<StatsArticle[]>({
    queryKey: ['stats-stock'],
    queryFn: () => api.get('/stats/stock-rotation').then(r => r.data),
  })

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Top articles (rotation stock)</h2>
      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Chargement…</div>
      ) : data.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Aucune donnée.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Réf.', 'Désignation', 'Mouvements', 'Valeur sortie HT'].map(h => (
                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((a, i) => (
              <tr key={a.référence} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', color: '#6b7280', fontSize: '0.8rem' }}>{a.référence}</td>
                <td style={{ padding: '0.65rem 0.75rem', fontWeight: 500 }}>{a.désignation}</td>
                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{a.nbMouvements}</td>
                <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{fmt(a.valeurSortie)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function StatsPage() {
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#111827' }}>
        Statistiques
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <CaMensuelChart />
        <CaLineChart />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <TechniciensChart />
        <StockRotationTable />
      </div>
    </div>
  )
}
