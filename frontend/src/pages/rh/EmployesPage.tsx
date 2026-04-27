import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { employeService } from '../../services/rhService'
import type { EmployeResponse, TypePoste, TypeContrat } from '../../types/rh'

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

const posteColor: Record<TypePoste, string> = {
  Technicien: 'bg-blue-100 text-blue-700',
  Caissier: 'bg-green-100 text-green-700',
  RH: 'bg-purple-100 text-purple-700',
  Admin: 'bg-red-100 text-red-700',
  Receptionniste: 'bg-yellow-100 text-yellow-700',
}

export default function EmployesPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EmployeResponse | null>(null)
  const [filterPoste, setFilterPoste] = useState<string>('')
  const [filterActif, setFilterActif] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['employes', filterPoste, filterActif],
    queryFn: () => employeService.getList({
      poste: filterPoste || undefined,
      actif: filterActif === '' ? undefined : filterActif === 'true',
    }),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Employés</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Nouvel employé
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={filterPoste} onChange={e => setFilterPoste(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tous les postes</option>
          {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterActif} onChange={e => setFilterActif(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tous</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
        <span className="ml-auto text-sm text-gray-500 self-center">{data?.total ?? 0} employé(s)</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Nom', 'Poste', 'Contrat', 'Embauche', 'Salaire', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employes.map(e => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{e.nomComplet}</div>
                    <div className="text-gray-400 text-xs">{e.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${posteColor[e.poste]}`}>
                      {e.poste}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.typeContrat}</td>
                  <td className="px-4 py-3 text-gray-600">{e.dateEmbauche.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    {e.salaireBase != null ? (
                      <span className="font-medium">{e.salaireBase.toLocaleString('fr-DZ')} DA</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.isActif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.isActif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(e)} className="text-blue-600 hover:text-blue-800 text-xs">Modifier</button>
                      {e.isActif && (
                        <button onClick={() => desactiverMut.mutate(e.id)}
                          className="text-red-500 hover:text-red-700 text-xs">Désactiver</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employes.length === 0 && (
            <div className="text-center py-12 text-gray-400">Aucun employé trouvé</div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Modifier employé' : 'Nouvel employé'}</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input {...register('nom')} className="w-full border rounded-lg px-3 py-2" />
                  {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom</label>
                  <input {...register('prénom')} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date naissance</label>
                  <input type="date" {...register('dateNaissance')} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input {...register('téléphone')} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" {...register('email')} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Poste</label>
                  <select {...register('poste')} className="w-full border rounded-lg px-3 py-2">
                    {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type contrat</label>
                  <select {...register('typeContrat')} className="w-full border rounded-lg px-3 py-2">
                    {CONTRATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Salaire de base (DA)</label>
                  <input type="number" {...register('salaireBase', { valueAsNumber: true })}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date embauche</label>
                  <input type="date" {...register('dateEmbauche')} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date fin contrat</label>
                  <input type="date" {...register('dateFinContrat')} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adresse</label>
                <input {...register('adresse')} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
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
