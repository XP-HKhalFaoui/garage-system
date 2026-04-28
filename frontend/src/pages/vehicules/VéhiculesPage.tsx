import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { vehiculeService } from '../../services/vehiculeService'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const CARBURANT_COLORS: Record<string, string> = {
  Essence:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Diesel:     'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  GPL:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Hybride:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Électrique: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

export default function VéhiculesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['vehicules', search, page],
    queryFn: () => vehiculeService.getList({ search: search || undefined, page, pageSize: 20 }),
  })

  const vehicules = data?.items ?? []
  const total     = data?.total ?? 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Véhicules"
        subtitle={`${total} véhicule${total !== 1 ? 's' : ''}`}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Immatriculation, marque, VIN…"
          className="pl-8"
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Marque / Modèle</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead className="text-right">Kilométrage</TableHead>
              <TableHead>Carburant</TableHead>
              <TableHead>Dernière visite</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : vehicules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Aucun véhicule trouvé
                </TableCell>
              </TableRow>
            ) : vehicules.map(v => (
              <TableRow
                key={v.id}
                className="cursor-pointer"
                onClick={() => navigate(`/vehicules/${v.id}`)}
              >
                <TableCell>
                  <span className="font-mono font-bold text-primary">{v.immatriculation}</span>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{v.marque} {v.modele}</p>
                  <p className="text-xs text-muted-foreground">{v.annee}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{v.clientNom}</TableCell>
                <TableCell className="text-right font-medium">
                  {v.kilométrageActuel.toLocaleString('fr-DZ')} km
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={CARBURANT_COLORS[v.carburant] ?? ''}>
                    {v.carburant}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {v.dateDernièreVisite ? v.dateDernièreVisite.slice(0, 10) : '—'}
                </TableCell>
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</Button>
          <span className="px-3 py-1 text-sm text-muted-foreground">Page {page}</span>
          <Button variant="outline" size="sm" disabled={vehicules.length < 20} onClick={() => setPage(p => p + 1)}>›</Button>
        </div>
      )}
    </div>
  )
}
