import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Wrench, Send, Phone, ChevronRight } from 'lucide-react'
import { vehiculeService } from '@/services/vehiculeService'
import { VehiculeTimeline } from '@/components/vehicules/VehiculeTimeline'
import { OffresEntretien } from '@/components/vehicules/OffresEntretien'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

const CARBURANT_CLASS: Record<string, string> = {
  Essence:    'bg-amber-100 text-amber-700',
  Diesel:     'bg-slate-100 text-slate-700',
  GPL:        'bg-green-100 text-green-700',
  Hybride:    'bg-blue-100 text-blue-700',
  Électrique: 'bg-purple-100 text-purple-700',
}

export function VehiculeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('timeline')

  const { data: historique, isLoading, error } = useQuery({
    queryKey: ['vehicule-historique', id],
    queryFn: () => vehiculeService.getHistorique(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !historique) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <p>Impossible de charger les données du véhicule.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>← Retour</Button>
      </div>
    )
  }

  const { vehicule, client, statistiques, interventions } = historique
  const carbClass = CARBURANT_CLASS[vehicule.carburant] ?? 'bg-slate-100 text-slate-700'
  const clientInitials = (client.nom[0] + (client.prénom?.[0] ?? '')).toUpperCase()

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/vehicules" className="hover:text-foreground transition-colors">Véhicules</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{vehicule.immatriculation}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne gauche ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Carte véhicule */}
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center text-3xl ${carbClass} bg-opacity-20`}>
                🚗
              </div>

              <p className="text-2xl font-extrabold tracking-widest font-mono">{vehicule.immatriculation}</p>

              <Badge variant="secondary" className="text-xs">
                {vehicule.marque} {vehicule.modele}
                {vehicule.version && ` • ${vehicule.version}`}
                {` • ${vehicule.annee}`}
              </Badge>

              {vehicule.vin && (
                <p className="text-xs text-muted-foreground font-mono">VIN: {vehicule.vin}</p>
              )}

              <Separator />

              <div className="grid grid-cols-3 w-full gap-2 text-center">
                {[
                  { label: 'km', value: vehicule.kilométrageActuel.toLocaleString('fr-DZ') },
                  { label: 'carburant', value: vehicule.carburant },
                  { label: 'boîte', value: vehicule.transmission === 'Manuelle' ? 'M' : 'A' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="font-bold text-sm">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 w-full">
                <Button
                  className="flex-1"
                  size="sm"
                  onClick={() => navigate(`/or/nouveau?vehiculeId=${vehicule.id}&clientId=${client.id}`)}
                >
                  <Wrench className="h-3.5 w-3.5 mr-1.5" />
                  Créer OR
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setTab('offres')}>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Offre
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Carte client */}
          <Link to={`/clients/${client.id}`} className="no-underline">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {clientInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {client.raisonSociale ?? `${client.nom} ${client.prénom ?? ''}`.trim()}
                    </p>
                    <p className="text-xs text-muted-foreground">{client.wilaya}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                <a
                  href={`tel:${client.téléphone}`}
                  onClick={e => e.stopPropagation()}
                  className="mt-3 flex items-center justify-center gap-2 w-full rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 no-underline transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {client.téléphone}
                </a>
              </CardContent>
            </Card>
          </Link>

          {/* Statistiques rapides */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Interventions',  value: statistiques.nbInterventions },
                { label: 'CA total HT',    value: `${statistiques.montantTotalHT.toLocaleString('fr-DZ')} DA` },
                { label: 'Km parcourus',   value: `${statistiques.kmParcourus.toLocaleString('fr-DZ')} km` },
                { label: 'Première visite', value: statistiques.premièreVisite ? new Date(statistiques.premièreVisite).toLocaleDateString('fr-DZ') : '—' },
                { label: 'Dernière visite', value: statistiques.dernièreVisite ? new Date(statistiques.dernièreVisite).toLocaleDateString('fr-DZ') : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center text-sm py-0.5 border-b border-muted last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">{String(value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Colonne droite ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0">
                {[
                  { value: 'timeline',     label: `Timeline (${interventions.length})` },
                  { value: 'offres',       label: 'Offres entretien' },
                  { value: 'statistiques', label: 'Statistiques' },
                ].map(t => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <CardContent className="pt-4">
                <TabsContent value="timeline" className="mt-0">
                  <VehiculeTimeline interventions={interventions} />
                </TabsContent>
                <TabsContent value="offres" className="mt-0">
                  <OffresEntretien vehiculeId={vehicule.id} offres={[]} />
                </TabsContent>
                <TabsContent value="statistiques" className="mt-0">
                  <StatsTab stats={statistiques} interventions={interventions} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatsTab({
  stats,
  interventions,
}: {
  stats: { nbInterventions: number; montantTotalHT: number; kmParcourus: number }
  interventions: { typeIntervention: string; montantHT: number }[]
}) {
  const byType = interventions.reduce<Record<string, { count: number; total: number }>>((acc, i) => {
    if (!acc[i.typeIntervention]) acc[i.typeIntervention] = { count: 0, total: 0 }
    acc[i.typeIntervention].count++
    acc[i.typeIntervention].total += i.montantHT
    return acc
  }, {})

  const sorted  = Object.entries(byType).sort((a, b) => b[1].total - a[1].total)
  const maxTotal = sorted[0]?.[1].total ?? 1

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Interventions', value: stats.nbInterventions,                                    className: 'text-primary' },
          { label: 'CA total HT',   value: `${stats.montantTotalHT.toLocaleString('fr-DZ')} DA`,   className: 'text-green-600 dark:text-green-400' },
          { label: 'Km parcourus',  value: `${stats.kmParcourus.toLocaleString('fr-DZ')} km`,       className: 'text-amber-600 dark:text-amber-400' },
        ].map(({ label, value, className }) => (
          <div key={label} className="text-center rounded-lg border p-4">
            <p className={`text-xl font-extrabold ${className}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {sorted.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Répartition par type
          </p>
          {sorted.map(([type, { count, total }]) => (
            <div key={type} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{type}</span>
                <span className="text-muted-foreground">
                  {count} intervention{count > 1 ? 's' : ''} — {total.toLocaleString('fr-DZ')} DA HT
                </span>
              </div>
              <Progress value={(total / maxTotal) * 100} className="h-1.5" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default VehiculeDetailPage
