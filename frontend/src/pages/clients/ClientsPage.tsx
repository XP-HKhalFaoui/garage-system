import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { clientService } from '../../services/vehiculeService'
import { useNavigate } from 'react-router-dom'
import type { ClientResponse, CreateClientDto, ClientType } from '../../types/crm'

const WILAYAS = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna', 'Sétif', 'Tizi Ouzou', 'Béjaïa', 'Médéa']

const schema = z.object({
  type: z.enum(['Particulier', 'Entreprise']),
  nom: z.string().min(1),
  prénom: z.string().optional(),
  raisonSociale: z.string().optional(),
  téléphone: z.string().min(1),
  téléphoneAlt: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  adresse: z.string().min(1),
  wilaya: z.string().min(1),
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

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'Particulier', wilaya: 'Alger' },
  })
  const typeClient = watch('type')

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

  function openCreate() { setEditing(null); reset({ type: 'Particulier', wilaya: 'Alger' }); setShowModal(true) }
  function openEdit(c: ClientResponse) {
    setEditing(c)
    reset({
      type: c.type as 'Particulier' | 'Entreprise',
      nom: c.nom, prénom: c.prénom ?? '',
      raisonSociale: c.raisonSociale ?? '',
      téléphone: c.téléphone, téléphoneAlt: c.téléphoneAlt ?? '',
      email: c.email ?? '', adresse: c.adresse, wilaya: c.wilaya,
    })
    setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditing(null); reset({}) }

  function onSubmit(data: FormData) {
    const dto: CreateClientDto = {
      ...data,
      type: data.type as ClientType,
      email: data.email || undefined,
    }
    if (editing) updateMut.mutate({ id: editing.id, dto })
    else createMut.mutate(dto)
  }

  const clients = data?.items ?? []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Nouveau client
        </button>
      </div>

      <div className="flex gap-3">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Rechercher par nom, téléphone..."
          className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-sm"
        />
        <span className="ml-auto text-sm text-gray-500 self-center">{data?.total ?? 0} client(s)</span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Client', 'Type', 'Téléphone', 'Wilaya', 'Véhicules', 'OR', 'CA Total', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/clients/${c.id}`)}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{clientDisplayName(c)}</div>
                    {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${c.type === 'Entreprise' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.téléphone}</td>
                  <td className="px-4 py-3 text-gray-500">{c.wilaya}</td>
                  <td className="px-4 py-3 text-center font-medium">{c.nbVéhicules}</td>
                  <td className="px-4 py-3 text-center">{c.nbOR}</td>
                  <td className="px-4 py-3 font-medium text-green-700">
                    {c.caTotalHT.toLocaleString('fr-DZ')} DA
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs">Modifier</button>
                      <button onClick={() => confirm('Supprimer ce client ?') && deleteMut.mutate(c.id)}
                        className="text-red-500 hover:text-red-700 text-xs">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && (
            <div className="text-center py-12 text-gray-400">Aucun client trouvé</div>
          )}
        </div>
      )}

      {(data?.total ?? 0) > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-40">‹</button>
          <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
          <button disabled={clients.length < 20} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-40">›</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Modifier client' : 'Nouveau client'}</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select {...register('type')} className="w-full border rounded-lg px-3 py-2">
                    <option value="Particulier">Particulier</option>
                    <option value="Entreprise">Entreprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input {...register('nom')} className="w-full border rounded-lg px-3 py-2" />
                  {errors.nom && <p className="text-red-500 text-xs mt-1">Requis</p>}
                </div>
                {typeClient === 'Particulier' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Prénom</label>
                    <input {...register('prénom')} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                )}
                {typeClient === 'Entreprise' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Raison sociale</label>
                      <input {...register('raisonSociale')} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">NIF</label>
                      <input {...register('nif')} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">NRC</label>
                      <input {...register('nrc')} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone *</label>
                  <input {...register('téléphone')} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" {...register('email')} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Wilaya *</label>
                  <select {...register('wilaya')} className="w-full border rounded-lg px-3 py-2">
                    {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adresse *</label>
                <input {...register('adresse')} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
