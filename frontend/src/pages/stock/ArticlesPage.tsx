import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, AlertTriangle, PlusCircle, X } from 'lucide-react'
import { stockService } from '@/services/stockService'
import { AjustementModal } from '@/components/stock/AjustementModal'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { Article, ArticleCategorie } from '@/types/stock'

const CATEGORIES: ArticleCategorie[] = [
  'Filtres','Huiles','Freinage','Transmission','Suspension',
  'Moteur','Électrique','Carrosserie','Accessoires','Autre',
]

function stockVariant(actuel: number, min: number) {
  if (actuel <= min) return 'stock-critical' as const
  if (actuel <= min * 1.5) return 'stock-low' as const
  return 'stock-ok' as const
}

export function ArticlesPage() {
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [categorie, setCategorie] = useState<ArticleCategorie | 'all'>('all')
  const [stockBas, setStockBas]   = useState(false)
  const [page, setPage]           = useState(1)
  const [ajustArticle, setAjustArticle] = useState<Article | null>(null)
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['articles', { search, categorie, stockBas, page }],
    queryFn: () => stockService.getArticles({
      search: search || undefined,
      categorie: categorie !== 'all' ? categorie : undefined,
      stockBas,
      page,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: prev => prev,
  })

  const { data: alertes = [] } = useQuery({
    queryKey: ['alertes-stock'],
    queryFn: () => stockService.getAlertesActives(),
    refetchInterval: 60_000,
  })

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['articles'] })
    qc.invalidateQueries({ queryKey: ['alertes-stock'] })
  }, [qc])

  const handleDelete = async (id: string) => {
    try {
      await stockService.delete(id)
      toast.success('Article supprimé')
      invalidate()
    } catch {
      toast.error('Impossible de supprimer (stock non vide ou OR actif)')
    }
  }

  const resetFiltres = () => {
    setSearch(''); setCategorie('all'); setStockBas(false); setPage(1)
  }

  const articles = data?.items ?? []
  const total    = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock — Articles"
        subtitle={`${total} article${total !== 1 ? 's' : ''} trouvé${total !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {alertes.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {alertes.length} alerte{alertes.length > 1 ? 's' : ''}
              </Badge>
            )}
            <Button size="sm">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Nouvel article
            </Button>
          </div>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center rounded-lg border bg-muted/40 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Référence, désignation, OEM…"
            className="pl-8 bg-background"
          />
        </div>

        <Select value={categorie} onValueChange={v => { setCategorie(v as ArticleCategorie | 'all'); setPage(1) }}>
          <SelectTrigger className="w-44 bg-background">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="stock-bas"
            checked={stockBas}
            onCheckedChange={v => { setStockBas(v); setPage(1) }}
          />
          <Label htmlFor="stock-bas" className="text-sm cursor-pointer">
            Stock bas
            {stockBas && alertes.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0">{alertes.length}</Badge>
            )}
          </Label>
        </div>

        {(search || categorie !== 'all' || stockBas) && (
          <Button variant="ghost" size="sm" onClick={resetFiltres} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Tableau */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">PU HT vente</TableHead>
              <TableHead>Emplacement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  Aucun article trouvé
                </TableCell>
              </TableRow>
            ) : articles.map(a => (
              <TableRow key={a.id}>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{a.référence}</code>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="font-medium truncate">{a.désignation}</p>
                  {a.référenceOEM && <p className="text-xs text-muted-foreground">OEM: {a.référenceOEM}</p>}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">{a.catégorie}</span>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {a.stockActuel}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{a.unité}</span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{a.stockMinimum}</TableCell>
                <TableCell className="text-right font-medium">
                  {a.prixVente.toLocaleString('fr-DZ')} DA
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{a.emplacementRayonnage ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge variant={stockVariant(a.stockActuel, a.stockMinimum)} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAjustArticle(a)}>
                      ± Ajust.
                    </Button>
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">Suppr.</Button>}
                      title="Supprimer l'article"
                      description={`Supprimer définitivement l'article ${a.référence} ? Cette action est irréversible.`}
                      variant="destructive"
                      confirmLabel="Supprimer"
                      onConfirm={() => handleDelete(a.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Précédent</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Suivant →</Button>
          </div>
        </div>
      )}

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
