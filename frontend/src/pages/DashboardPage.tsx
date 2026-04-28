import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, Wrench, Users, AlertTriangle, Receipt, UserCheck,
} from 'lucide-react'
import api from '../services/httpClient'
import type { DashboardStats, CaMensuel } from '../types/stats'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const FMT = (v: number) =>
  new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 0 }).format(v) + ' DA'

export function DashboardPage() {
  const { user } = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/stats/dashboard').then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: caMensuel, isLoading: caLoading } = useQuery<CaMensuel[]>({
    queryKey: ['ca-mensuel'],
    queryFn: () => api.get('/stats/ca-mensuel', { params: { nbMois: 6 } }).then(r => r.data),
  })

  const today = new Date().toLocaleDateString('fr-DZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle={`${today} — ${user?.roles.join(', ')}`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="CA ce mois"
              value={stats?.caMoisCourant != null ? FMT(stats.caMoisCourant) : '—'}
              delta={stats?.evolutionCa}
              icon={TrendingUp}
            />
            <StatCard
              label="OR en cours"
              value={stats?.nbOREnCours ?? '—'}
              deltaLabel={` livrés aujourd'hui`}
              delta={stats?.nbORTerminés ?? 0}
              icon={Wrench}
            />
            <StatCard
              label="Clients actifs"
              value={stats?.nbClientsActifs ?? '—'}
              icon={Users}
            />
            <StatCard
              label="Alertes stock"
              value={stats?.nbArticlesSousMin ?? '—'}
              icon={AlertTriangle}
              className={stats?.nbArticlesSousMin ? 'border-red-200 dark:border-red-800' : ''}
            />
            <StatCard
              label="Factures en retard"
              value={stats?.nbFacturesEnRetard ?? '—'}
              icon={Receipt}
              className={stats?.nbFacturesEnRetard ? 'border-red-200 dark:border-red-800' : ''}
            />
            <StatCard
              label="Présents / RH"
              value={stats ? `${stats.nbPrésentsAujourdHui} / ${stats.nbEmployésActifs}` : '—'}
              icon={UserCheck}
            />
          </>
        )}
      </div>

      {/* CA mensuel chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chiffre d'affaires — 6 derniers mois</CardTitle>
        </CardHeader>
        <CardContent>
          {caLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={caMensuel ?? []} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => [FMT(v)]}
                  contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }}
                />
                <Bar dataKey="ca"       name="CA TTC"  fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="encaissé" name="Encaissé" fill="#10b981"              radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
