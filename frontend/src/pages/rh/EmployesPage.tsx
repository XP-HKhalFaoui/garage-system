import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, UserX, UserPlus, Link2, LinkIcon, Unlink } from 'lucide-react'
import { employeService } from '../../services/rhService'
import type { EmployeResponse, TypePoste, TypeContrat } from '../../types/rh'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import api from '../../services/httpClient'
import { toast } from 'sonner'

// ── Auth types ──────────────────────────────────────────────────────────────
interface UserAccount {
  userId: string
  email: string
  roles: string[]
  employeId: string | null
  nom: string | null
  prenom: string | null
  isActif: boolean
}

async function fetchUsers(): Promise<UserAccount[]> {
  const res = await api.get<UserAccount[]>('/auth/users')
  return res.data
}

async function lierEmploye(userId: string, employeId: string): Promise<void> {
  await api.patch(`/auth/users/${userId}/lier-employe`, { employeId })
}

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

// ── LierCompteDialog ────────────────────────────────────────────────────────
function LierCompteDialog({ employe, onClose }: { employe: EmployeResponse; onClose: () => void }) {
  const qc = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['auth-users'],
    queryFn: fetchUsers,
  })

  // Find user currently linked to this employee
  const linkedUser = users.find(u => u.employeId === employe.id)

  // Available users: not linked to any other employee (but allow selecting the already-linked one)
  const available = users.filter(u => !u.employeId || u.employeId === employe.id)

  const lierMut = useMutation({
    mutationFn: () => lierEmploye(selectedUserId, employe.id),
    onSuccess: () => {
      toast.success('Compte lié avec succès')
      qc.invalidateQueries({ queryKey: ['auth-users'] })
      qc.invalidateQueries({ queryKey: ['employes'] })
      onClose()
    },
    onError: () => toast.error('Erreur lors de la liaison'),
  })

  return (
    <div className="space-y-5">
      {/* Current state */}
      <div className="rounded-lg border p-4 bg-muted/40">
        <p className="text-xs text-muted-foreground mb-1">Compte actuellement lié</p>
        {linkedUser ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{linkedUser.email}</span>
            {linkedUser.roles.map(r => (
              <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
            ))}
            <Badge variant="secondary" className={cn('text-xs', linkedUser.isActif ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
              {linkedUser.isActif ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic flex items-center gap-1.5">
            <Unlink className="h-3.5 w-3.5" /> Aucun compte lié
          </p>
        )}
      </div>

      {/* Select new user */}
      <div className="space-y-2">
        <Label>Sélectionner un compte utilisateur</Label>
        {isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un compte…" />
            </SelectTrigger>
            <SelectContent>
              {available.map(u => (
                <SelectItem key={u.userId} value={u.userId}>
                  <span className="flex items-center gap-2">
                    {u.email}
                    {u.roles.length > 0 && (
                      <span className="text-xs text-muted-foreground">({u.roles.join(', ')})</span>
                    )}
                    {u.employeId === employe.id && (
                      <span className="text-xs text-green-600 font-medium">• lié</span>
                    )}
                  </span>
                </SelectItem>
              ))}
              {available.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">Aucun compte disponible</div>
              )}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          Seuls les comptes non liés à un autre employé sont affichés.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button
          disabled={!selectedUserId || lierMut.isPending}
          onClick={() => lierMut.mutate()}
        >
          <Link2 className="h-4 w-4 mr-1.5" />
          {lierMut.isPending ? 'Liaison…' : 'Lier le compte'}
        </Button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function EmployesPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<EmployeResponse | null>(null)
  const [filterPoste, setFilterPoste] = useState<string>('all')
  const [filterActif, setFilterActif] = useState<string>('all')
  const [lierTarget, setLierTarget] = useState<EmployeResponse | null>(null)

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
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Lier un compte" onClick={() => setLierTarget(e)}>
                      <LinkIcon className="h-3.5 w-3.5" />
                    </Button>
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

      {/* ── Lier compte dialog ── */}
      <Dialog open={!!lierTarget} onOpenChange={open => { if (!open) setLierTarget(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Lier un compte utilisateur
            </DialogTitle>
            <DialogDescription>
              Employé : <span className="font-semibold">{lierTarget?.nomComplet}</span> — {lierTarget?.poste}
            </DialogDescription>
          </DialogHeader>
          {lierTarget && (
            <LierCompteDialog employe={lierTarget} onClose={() => setLierTarget(null)} />
          )}
        </DialogContent>
      </Dialog>

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
