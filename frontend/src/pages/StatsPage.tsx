import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import api from '@/services/httpClient'
import type { CaMensuel, StatsTechnicien, StatsArticle } from '@/types/stats'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const FMT = (n: number) => new Intl.NumberFormat('fr-DZ').format(n) + ' DA'

// ── CA mensuel (bar) ──────────────────────────────────────────────────────────
function CaMensuelChart() {
  const [nbMois, setNbMois] = useState('6')
  const { data = [], isLoading } = useQuery<CaMensuel[]>({
    queryKey: ['ca-mensuel', nbMois],
    queryFn: () => api.get('/stats/ca-mensuel', { params: { nbMois } }).then(r => r.data),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Chiffre d'affaires mensuel</CardTitle>
        <Select value={nbMois} onValueChange={setNbMois}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 mois</SelectItem>
            <SelectItem value="6">6 mois</SelectItem>
            <SelectItem value="12">12 mois</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={data} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [FMT(v)]} contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Bar dataKey="ca"       name="CA TTC"   fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="encaissé" name="Encaissé" fill="#10b981"              radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Tendance 12 mois (line) ───────────────────────────────────────────────────
function CaLineChart() {
  const { data = [], isLoading } = useQuery<CaMensuel[]>({
    queryKey: ['ca-mensuel', '12'],
    queryFn: () => api.get('/stats/ca-mensuel', { params: { nbMois: 12 } }).then(r => r.data),
  })

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Tendance 12 mois</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-52 w-full" /> : (
          <ResponsiveContainer width="100%" height={208}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [FMT(v)]} contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }} />
              <Line type="monotone" dataKey="ca"       name="CA TTC"   stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="encaissé" name="Encaissé" stroke="#10b981"              strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Performance techniciens ───────────────────────────────────────────────────
function TechniciensTable() {
  const now = new Date()
  const [annee, setAnnee] = useState(String(now.getFullYear()))
  const [mois,  setMois]  = useState(String(now.getMonth() + 1))

  const { data = [], isLoading } = useQuery<StatsTechnicien[]>({
    queryKey: ['stats-techniciens', annee, mois],
    queryFn: () => api.get('/stats/techniciens', { params: { annee, mois } }).then(r => r.data),
  })

  const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Performance techniciens</CardTitle>
        <div className="flex gap-2">
          <Select value={mois} onValueChange={setMois}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOIS_LABELS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={annee} onValueChange={setAnnee}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getFullYear(), now.getFullYear() - 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full" /> : data.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">Aucune donnée.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Technicien</TableHead>
                <TableHead className="text-center">OR</TableHead>
                <TableHead className="text-right">Main d'œuvre</TableHead>
                <TableHead>Taux occupation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(t => (
                <TableRow key={t.nom}>
                  <TableCell className="font-semibold">{t.nom}</TableCell>
                  <TableCell className="text-center">{t.nbOR}</TableCell>
                  <TableCell className="text-right font-medium">{FMT(t.totalMO)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(t.tauxOccupation, 100)}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs font-semibold w-10 text-right">{t.tauxOccupation}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// ── Rotation stock ────────────────────────────────────────────────────────────
function StockRotationTable() {
  const { data = [], isLoading } = useQuery<StatsArticle[]>({
    queryKey: ['stats-stock'],
    queryFn: () => api.get('/stats/stock-rotation').then(r => r.data),
  })

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Top articles (rotation stock)</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full" /> : data.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">Aucune donnée.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Réf.</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead className="text-center">Mouvements</TableHead>
                <TableHead className="text-right">Valeur sortie HT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(a => (
                <TableRow key={a.référence}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{a.référence}</TableCell>
                  <TableCell className="font-medium">{a.désignation}</TableCell>
                  <TableCell className="text-center">{a.nbMouvements}</TableCell>
                  <TableCell className="text-right font-semibold">{FMT(a.valeurSortie)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function StatsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CaMensuelChart />
        <CaLineChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TechniciensTable />
        <StockRotationTable />
      </div>
    </div>
  )
}
