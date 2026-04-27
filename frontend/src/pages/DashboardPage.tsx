import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import api from '../services/api'
import type { DashboardStats, CaMensuel } from '../types/stats'

export function DashboardPage() {
  const { user } = useAuth()

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/stats/dashboard').then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: caMensuel } = useQuery<CaMensuel[]>({
    queryKey: ['ca-mensuel'],
    queryFn: () => api.get('/stats/ca-mensuel', { params: { nbMois: 6 } }).then(r => r.data),
  })

  const cards = [
    { label: 'CA ce mois', value: stats?.caMoisCourant != null ? `${stats.caMoisCourant.toLocaleString('fr-DZ')} DA` : '—',
      sub: stats?.evolutionCa != null ? `${stats.evolutionCa > 0 ? '+' : ''}${stats.evolutionCa}% vs mois préc.` : '',
      color: 'bg-blue-500' },
    { label: 'OR en cours', value: stats?.nbOREnCours ?? '—', sub: `${stats?.nbORTerminés ?? 0} livrés aujourd'hui`, color: 'bg-orange-500' },
    { label: 'Clients actifs', value: stats?.nbClientsActifs ?? '—', sub: '', color: 'bg-green-500' },
    { label: 'Alertes stock', value: stats?.nbArticlesSousMin ?? '—', sub: 'Articles sous seuil min', color: stats?.nbArticlesSousMin ? 'bg-red-500' : 'bg-gray-400' },
    { label: 'Factures en retard', value: stats?.nbFacturesEnRetard ?? '—', sub: '', color: stats?.nbFacturesEnRetard ? 'bg-red-500' : 'bg-gray-400' },
    { label: 'Présents / RH', value: stats ? `${stats.nbPrésentsAujourdHui} / ${stats.nbEmployésActifs}` : '—', sub: "aujourd'hui", color: 'bg-purple-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
        <span className="text-sm text-gray-400">{user?.email} — {user?.roles.join(', ')}</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`${c.color} rounded-xl p-4 text-white`}>
            <p className="text-sm opacity-80">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
            {c.sub && <p className="text-xs opacity-70 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* CA mensuel chart */}
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Chiffre d'affaires mensuel</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={caMensuel ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [`${v.toLocaleString('fr-DZ')} DA`]} />
            <Bar dataKey="ca" name="CA TTC" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="encaissé" name="Encaissé" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
