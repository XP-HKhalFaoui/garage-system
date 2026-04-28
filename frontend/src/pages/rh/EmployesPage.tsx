import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, UserX, UserPlus } from 'lucide-react'
import { employeService } from '../../services/rhService'
import type { EmployeResponse, TypePoste, TypeContrat } from '../../types/rh'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const schema = z.object({
  nom: z.string().min(1),
  prénom: z.string().min(1),
  dateNaissance: z.string().min(1),
  téléphone: z.string().min(1),
  email: z.string().email(),
  adresse: z.string().min(1),
  poste: z.enum(['Technicien', 'Caissier', 'RH', 'Admin', 'Receptionniste']),
  département: z.string().optional(),
  salaireBase: z.number().positive(),
  typeContrat: z.enum(['CDI', 'CDD', 'Temporaire']),
  dateEmbauche: z.string().min(1),
  dateFinContrat: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const POSTES: TypePoste[] = ['Technicien', 'Caissier', 'RH', 'Admin', 'Receptionniste']
const CONTRATS: TypeContrat[] = ['CDI', 'CDD', 'Temporaire']

const POSTE_CLASS: Record<TypePoste, string> = {
  Technicien:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Caissier:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  RH:            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Admin:         'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Receptionniste:'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
}

export default function EmployesPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<EmployeResponse | null>(null)
  const [filterPoste, setFilterPoste] = useState<string>('all')
  const [filterActif, setFilterActif] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['employes', filterPoste, filterActif],
    queryFn: () => employeService.getList({
      poste: filterPoste !== 'all' ? filterPoste : undefined,
      actif: filterActif === 'all' ? undefined : filterActif === 'true',
    }),
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const createMut = useMutation({
    mutationFn: employeService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employes'] }); closeModal() },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<FormData> }) => employeService.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employes'] }); closeModal() },
  })

  const desactiverMut = useMutation({
    mutationFn: employeService.desactiver,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employes'] }),
  })

  function openCreate() { setEditing(null); reset({}); setShowModal(true) }
  function openEdit(e: EmployeResponse) {
    setEditing(e)
    reset({
      nom: e.nom, prénom: e.prénom, téléphone: e.téléphone,
      email: e.email, adresse: e.adresse, poste: e.poste,
      département: e.département, salaireBase: e.salaireBase,
      typeContrat: e.typeContrat,
      dateEmbauche: e.dateEmbauche.slice(0, 10),
      dateFinContrat: e.dateFinContrat?.slice(0, 10),
    })
    setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditing(null); reset({}) }

  function onSubmit(data: FormData) {
    if (editing) updateMut.mutate({ id: editing.id, dto: data })
    else createMut.mutate(data)
  }

  const employes = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employés"
        subtitle={`${data?.total ?? 0} employé(s)`}
        actions={
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Nouvel employé
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Select value={filterPoste} onValueChange={setFilterPoste}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tous les postes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les postes</SelectItem>
            {POSTES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterActif} onValueChange={setFilterActif}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tous" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="true">Actifs</SelectItem>
            <SelectItem value="false">Inactifs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead>Embauche</TableHead>
              <TableHead className="text-right">Salaire</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : employes.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Aucun employé trouvé</TableCell></TableRow>
            ) : employes.map(e => (
              <TableRow key={e.id}>
                <TableCell>
                  <p className="font-semibold">{e.nomComplet}</p>
                  <p className="text-xs text-muted-foreground">{e.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cn('text-xs', POSTE_CLASS[e.poste])}>{e.poste}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{e.typeContrat}</TableCell>
                <TableCell className="text-muted-foreground">{e.dateEmbauche.slice(0, 10)}</TableCell>
                <TableCell className="text-right font-medium">
                  {e.salaireBase != null ? `${e.salaireBase.toLocaleString('fr-DZ')} DA` : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cn('text-xs', e.isActif ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
                    {e.isActif ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {e.isActif && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => desactiverMut.mutate(e.id)}>
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={open => { if (!open) closeModal() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier employé' : 'Nouvel employé'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input {...register('nom')} />
              {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Prénom</Label>
              <Input {...register('prénom')} />
            </div>
            <div className="space-y-1.5">
              <Label>Date naissance</Label>
              <Input type="date" {...register('dateNaissance')} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input {...register('téléphone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Poste</Label>
              <Select defaultValue={editing?.poste} onValueChange={v => setValue('poste', v as TypePoste)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSTES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type contrat</Label>
              <Select defaultValue={editing?.typeContrat} onValueChange={v => setValue('typeContrat', v as TypeContrat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Salaire de base (DA)</Label>
              <Input type="number" {...register('salaireBase', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date embauche</Label>
              <Input type="date" {...register('dateEmbauche')} />
            </div>
            <div className="space-y-1.5">
              <Label>Date fin contrat</Label>
              <Input type="date" {...register('dateFinContrat')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Adresse</Label>
              <Input {...register('adresse')} />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeModal}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {editing ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
