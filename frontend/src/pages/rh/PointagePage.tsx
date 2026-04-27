import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pointageService, employeService } from '../../services/rhService'

export default function PointagePage() {
  const qc = useQueryClient()
  const [selectedEmploye, setSelectedEmploye] = useState<string>('')

  const { data: présents } = useQuery({
    queryKey: ['pointage-aujourd-hui'],
    queryFn: pointageService.getAujourdHui,
    refetchInterval: 30_000,
  })

  const { data: employes } = useQuery({
    queryKey: ['employes-actifs'],
    queryFn: () => employeService.getList({ actif: true, pageSize: 100 }),
  })

  const entreeMut = useMutation({
    mutationFn: (id: string) => pointageService.entree(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pointage-aujourd-hui'] }),
  })

  const sortieMut = useMutation({
    mutationFn: (id: string) => pointageService.sortie(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pointage-aujourd-hui'] }),
  })

  const now = new Date()
  const today = now.toLocaleDateString('fr-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const présentsIds = new Set(présents?.présents.map(p => p.id) ?? [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pointage</h1>
          <p className="text-sm text-gray-500 capitalize">{today}</p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={selectedEmploye} onChange={e => setSelectedEmploye(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-w-[200px]">
            <option value="">-- Sélectionner employé --</option>
            {employes?.items.map(e => (
              <option key={e.id} value={e.id}>{e.nomComplet}</option>
            ))}
          </select>
          <button
            disabled={!selectedEmploye || entreeMut.isPending}
            onClick={() => selectedEmploye && entreeMut.mutate(selectedEmploye)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            ✓ Entrée
          </button>
          <button
            disabled={!selectedEmploye || sortieMut.isPending}
            onClick={() => selectedEmploye && sortieMut.mutate(selectedEmploye)}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50">
            ✗ Sortie
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-600 font-medium">Présents</p>
          <p className="text-3xl font-bold text-green-700">{présents?.présents.length ?? 0}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600 font-medium">Absents</p>
          <p className="text-3xl font-bold text-red-700">{présents?.absents.length ?? 0}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium">Total actifs</p>
          <p className="text-3xl font-bold text-blue-700">
            {(présents?.présents.length ?? 0) + (présents?.absents.length ?? 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Présents */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-green-600 text-white px-4 py-3 font-medium">Présents aujourd'hui</div>
          <div className="divide-y">
            {présents?.présents.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">Aucun pointage</div>
            )}
            {présents?.présents.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{p.nomComplet}</div>
                </div>
                <div className="text-sm text-green-600 font-medium">
                  Entrée {p.heureEntrée}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Absents */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-red-500 text-white px-4 py-3 font-medium">Absents aujourd'hui</div>
          <div className="divide-y">
            {présents?.absents.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">Tous présents !</div>
            )}
            {présents?.absents.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{a.nomComplet}</div>
                  <div className="text-xs text-gray-400">{a.poste}</div>
                </div>
                <button
                  onClick={() => entreeMut.mutate(a.id)}
                  className="text-xs text-green-600 hover:text-green-800 border border-green-300 px-2 py-1 rounded">
                  Pointer
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
