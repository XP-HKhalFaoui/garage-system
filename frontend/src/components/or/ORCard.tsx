import { Phone, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ORSummary } from '@/types/or'
import { ORTimer } from './ORTimer'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  or: ORSummary
  onClick?: () => void
  onAssigner?: (orId: string) => void
}

function techInitials(prénom: string, nom: string) {
  return `${prénom[0]}${nom[0]}`.toUpperCase()
}

export function ORCard({ or, onClick, onAssigner }: Props) {
  const navigate = useNavigate()
  const isUrgentWaiting = or.priorité === 'Urgent' && or.statut === 'EnAttente'
  const handleClick = onClick ?? (() => navigate(`/or/${or.id}`))

  return (
    <Card
      onClick={handleClick}
      className={cn(
        'shadow-sm transition-shadow hover:shadow-md cursor-pointer',
        isUrgentWaiting && 'border-red-400 dark:border-red-600',
      )}
    >
      <CardContent className="p-3 flex flex-col gap-2">

        {/* Row 1 — Numéro + badge Urgent */}
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant={or.priorité === 'Urgent' ? 'destructive' : 'default'}
            className="font-mono text-xs"
          >
            {or.numéro}
          </Badge>
          {or.priorité === 'Urgent' && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
              <Zap className="h-3 w-3" />
              URGENT
            </span>
          )}
        </div>

        {/* Row 2 — Immatriculation */}
        <p className="text-lg font-extrabold tracking-widest text-foreground leading-none">
          {or.vehicule.immatriculation}
        </p>

        {/* Row 3 — Marque/Modèle + heure */}
        <p className="text-xs text-muted-foreground">
          {or.vehicule.marque} {or.vehicule.modele}
          <span className="mx-1">·</span>
          {or.heureOuverture}
        </p>

        {/* Row 4 — Client + téléphone */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{or.client.nom}</span>
          <a
            href={`tel:${or.client.téléphone}`}
            onClick={e => e.stopPropagation()}
            title={or.client.téléphone}
          >
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" tabIndex={-1}>
              <Phone className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>

        {/* Row 5 — Timer + Avatar technicien */}
        <div className="flex items-center justify-between">
          <ORTimer orId={or.id} startTime={null} statut={or.statut} />
          {or.technicien ? (
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                {techInitials(or.technicien.prénom, or.technicien.nom)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-[11px] font-medium text-orange-500">Non assigné</span>
          )}
        </div>

        {/* Row 6 — Nb lignes + montant */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{or.nbLignes} ligne{or.nbLignes !== 1 ? 's' : ''}</span>
          {or.montantEstimé > 0 && (
            <span className="font-semibold text-foreground">
              {or.montantEstimé.toLocaleString('fr-DZ')} DA
            </span>
          )}
        </div>

        {/* Bouton Assigner */}
        {or.statut === 'EnAttente' && onAssigner && (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 h-7 text-xs w-full"
            onClick={e => { e.stopPropagation(); onAssigner(or.id) }}
          >
            Assigner technicien →
          </Button>
        )}

      </CardContent>
    </Card>
  )
}
