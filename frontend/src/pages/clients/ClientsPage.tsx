import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Search, PlusCircle, Phone, Pencil, Trash2 } from 'lucide-react'
import { clientService } from '../../services/vehiculeService'
import type { ClientResponse, CreateClientDto, ClientType } from '../../types/crm'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const WILAYAS = ['Alger','Oran','Constantine','Annaba','Blida','Batna','Sétif','Tizi Ouzou','Béjaïa','Médéa']

const schema = z.object({
  type: z.enum(['Particulier', 'Entreprise']),
  nom: z.string().min(1, 'Requis'),
  prénom: z.string().optional(),
  raisonSociale: z.string().optional(),
  téléphone: z.string().min(1, 'Requis'),
  téléphoneAlt: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  adresse: z.string().min(1, 'Requis'),
  wilaya: z.string().min(1, 'Requis'),
  nif: z.string().optional(),
  nrc: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function clientDisplayName(c: ClientResponse) {
  if (c.type === 'Entreprise') return c.raisonSociale || c.nom
  return [c.nom, c.prénom].filter(Boolean).join(' ')
}

export default function ClientsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ClientResponse | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, page],
    queryFn: () => clientService.getList({ search: search || undefined, page, pageSize: 20 }),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'Particulier', wilaya: 'Alger' },
  })
  const typeClient = form.watch('type')

  const createMut = useMutation({
    mutationFn: (dto: CreateClientDto) => clientService.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); closeModal() },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateClientDto> }) => clientService.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); closeModal() },
  })
  const deleteMut = useMutation({
    mutationFn: clientService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })

  function openCreate() { setEditing(null); form.reset({ type: 'Particulier', wilaya: 'Alger' }); setShowModal(true) }
  function openEdit(c: ClientResponse) {
    setEditing(c)
    form.reset({
      type: c.type as 'Particulier' | 'Entreprise',
      nom: c.nom, prénom: c.prénom ?? '',
      raisonSociale: c.raisonSociale ?? '',
      téléphone: c.téléphone, téléphoneAlt: c.téléphoneAlt ?? '',
      email: c.email ?? '', adresse: c.adresse, wilaya: c.wilaya,
    })
    setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditing(null); form.reset({}) }

  function onSubmit(data: FormData) {
    const dto: CreateClientDto = { ...data, type: data.type as ClientType, email: data.email || undefined }
    if (editing) updateMut.mutate({ id: editing.id, dto })
    else createMut.mutate(dto)
  }

  const clients = data?.items ?? []
  const total   = data?.total ?? 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        subtitle={`${total} client${total !== 1 ? 's' : ''}`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Nouveau client
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Nom, téléphone, immatriculation…"
          className="pl-8"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Wilaya</TableHead>
              <TableHead className="text-center">Véhicules</TableHead>
              <TableHead className="text-center">OR</TableHead>
              <TableHead className="text-right">CA Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Aucun client trouvé</TableCell>
              </TableRow>
            ) : clients.map(c => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/clients/${c.id}`)}>
                <TableCell>
                  <p className="font-medium">{clientDisplayName(c)}</p>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={c.type === 'Entreprise' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}>
                    {c.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.téléphone}</TableCell>
                <TableCell className="text-muted-foreground">{c.wilaya}</TableCell>
                <TableCell className="text-center font-medium">{c.nbVéhicules}</TableCell>
                <TableCell className="text-center">{c.nbOR}</TableCell>
                <TableCell className="text-right font-medium text-green-700 dark:text-green-400">
                  {c.caTotalHT.toLocaleString('fr-DZ')} DA
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end">
                    <a href={`tel:${c.téléphone}`} onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Phone className="h-3.5 w-3.5" /></Button>
                    </a>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
                      title="Supprimer ce client"
                      description="Cette action est irréversible. Le client sera supprimé (soft delete)."
                      variant="destructive"
                      confirmLabel="Supprimer"
                      onConfirm={() => deleteMut.mutateAsync(c.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</Button>
          <span className="px-3 py-1 text-sm text-muted-foreground">Page {page}</span>
          <Button variant="outline" size="sm" disabled={clients.length < 20} onClick={() => setPage(p => p + 1)}>›</Button>
        </div>
      )}

      {/* Modal création/édition */}
      <Dialog open={showModal} onOpenChange={open => { if (!open) closeModal() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Particulier">Particulier</SelectItem>
                        <SelectItem value="Entreprise">Entreprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="nom" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {typeClient === 'Particulier' && (
                  <FormField control={form.control} name="prénom" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                )}

                {typeClient === 'Entreprise' && (<>
                  <FormField control={form.control} name="raisonSociale" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raison sociale</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nif" render={({ field }) => (
                    <FormItem><FormLabel>NIF</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="nrc" render={({ field }) => (
                    <FormItem><FormLabel>NRC</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </>)}

                <FormField control={form.control} name="téléphone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="wilaya" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wilaya *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{WILAYAS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="adresse" render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>Annuler</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {editing ? 'Enregistrer' : 'Créer'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
