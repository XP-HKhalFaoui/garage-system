import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Building2, Car, ChevronRight, BadgeCheck, Ban } from 'lucide-react'
import { fleetService } from '@/services/fleetService'
import type { TypeTarif } from '@/types/fleet'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────────

const TARIF_LABELS: Record<TypeTarif, string> = {
  TarifNormal: 'Tarif normal',
  PrixRéduit:  'Prix réduit',
  Forfait:     'Forfait',
}

const TARIF_COLOR: Record<TypeTarif, string> = {
  TarifNormal: 'bg-slate-100 text-slate-700',
  PrixRéduit:  'bg-blue-100 text-blue-700',
  Forfait:     'bg-purple-100 text-purple-700',
}

// ── Schéma ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  raisonSociale:       z.string().min(2, 'Requis'),
  nrc:                 z.string().min(1, 'Requis'),
  nif:                 z.string().min(1, 'Requis'),
  adresseSiège:        z.string().min(1, 'Requis'),
  téléphoneRespAchats: z.string().min(1, 'Requis'),
  emailFacturation:    z.string().email('Email invalide'),
})
type FormData = z.infer<typeof schema>

// ── Modal création ─────────────────────────────────────────────────────────────

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (d: FormData) => fleetService.createSociété(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sociétés'] })
      toast.success('Société créée')
      reset()
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Erreur'),
  })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Nouvelle société abonnée</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Raison sociale</Label>
              <Input {...register('raisonSociale')} placeholder="SARL Exemple" />
              {errors.raisonSociale && <p className="text-destructive text-xs">{errors.raisonSociale.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>NRC</Label>
              <Input {...register('nrc')} placeholder="16B1234567" />
              {errors.nrc && <p className="text-destructive text-xs">{errors.nrc.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>NIF</Label>
              <Input {...register('nif')} placeholder="000016001234567" />
              {errors.nif && <p className="text-destructive text-xs">{errors.nif.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Adresse siège</Label>
              <Input {...register('adresseSiège')} placeholder="Rue, Commune, Wilaya" />
              {errors.adresseSiège && <p className="text-destructive text-xs">{errors.adresseSiège.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tél. resp. achats</Label>
              <Input {...register('téléphoneRespAchats')} placeholder="0555 xx xx xx" />
              {errors.téléphoneRespAchats && <p className="text-destructive text-xs">{errors.téléphoneRespAchats.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email facturation</Label>
              <Input type="email" {...register('emailFacturation')} placeholder="compta@sarl.dz" />
              {errors.emailFacturation && <p className="text-destructive text-xs">{errors.emailFacturation.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>Créer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SociétésPage() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [filterActif, setFilterActif] = useState<boolean | undefined>(true)

  const { data: sociétés = [], isLoading } = useQuery({
    queryKey: ['sociétés', filterActif],
    queryFn: () => fleetService.getSociétés(filterActif),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sociétés abonnées"
        subtitle="Gestion des sociétés clientes avec contrats et flotte"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nouvelle société
          </Button>
        }
      />

      {/* Filtres */}
      <div className="flex gap-2">
        {[
          { label: 'Actives', value: true },
          { label: 'Toutes', value: undefined },
          { label: 'Inactives', value: false },
        ].map(f => (
          <button
            key={String(f.label)}
            onClick={() => setFilterActif(f.value as boolean | undefined)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-colors',
              filterActif === f.value
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grille sociétés */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : sociétés.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Building2 className="h-12 w-12 opacity-20" />
          <p>Aucune société trouvée.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sociétés.map(s => (
            <Card
              key={s.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/fleet/${s.id}`)}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.raisonSociale}</p>
                    <p className="text-xs text-muted-foreground font-mono">NRC : {s.nrc}</p>
                  </div>
                  {s.isActif
                    ? <BadgeCheck className="h-5 w-5 text-green-500 shrink-0" />
                    : <Ban className="h-5 w-5 text-red-400 shrink-0" />
                  }
                </div>

                {/* Infos */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Car className="h-3.5 w-3.5" />
                    {s.nbVéhiculesActifs} véhicule{s.nbVéhiculesActifs !== 1 ? 's' : ''}
                  </span>
                  {s.tarifActif && (
                    <Badge className={cn('text-xs', TARIF_COLOR[s.tarifActif])}>
                      {TARIF_LABELS[s.tarifActif]}
                    </Badge>
                  )}
                  {!s.tarifActif && (
                    <span className="text-xs text-orange-500 font-medium">Sans contrat</span>
                  )}
                </div>

                {/* Contact */}
                <p className="text-xs text-muted-foreground truncate">{s.emailFacturation}</p>

                {/* Arrow */}
                <div className="flex justify-end">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
