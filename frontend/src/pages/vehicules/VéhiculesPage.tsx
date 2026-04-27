import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { vehiculeService } from '../../services/vehiculeService'

export default function VéhiculesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['vehicules', search, page],
    queryFn: () => vehiculeService.getList({ search: search || undefined, page, pageSize: 20 }),
  })

  const vehicules = data?.items ?? []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Véhicules</h1>
      </div>

      <div className="flex gap-3">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Immatriculation, marque, VIN..."
          className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-sm"
        />
        <span className="ml-auto text-sm text-gray-500 self-center">{data?.total ?? 0} véhicule(s)</span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Immatriculation', 'Marque / Modèle', 'Propriétaire', 'Kilométrage', 'Carburant', 'Dernière visite', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicules.map(v => (
                <tr key={v.id} className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/vehicules/${v.id}`)}>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{v.immatriculation}</td>
                  <td className="px-4 py-3">
                    <div>{v.marque} {v.modele}</div>
                    <div className="text-xs text-gray-400">{v.annee}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.clientNom}</td>
                  <td className="px-4 py-3">
                    <span>{v.kilométrageActuel.toLocaleString('fr-DZ')} km</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{v.carburant}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {v.dateDernièreVisite ? v.dateDernièreVisite.slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={e => { e.stopPropagation(); navigate(`/vehicules/${v.id}`) }}
                      className="text-blue-600 hover:text-blue-800 text-xs">Détails →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vehicules.length === 0 && (
            <div className="text-center py-12 text-gray-400">Aucun véhicule trouvé</div>
          )}
        </div>
      )}

      {(data?.total ?? 0) > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-40">‹</button>
          <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
          <button disabled={vehicules.length < 20} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-40">›</button>
        </div>
      )}
    </div>
  )
}
