import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import httpClient from '@/services/httpClient'
import { stockService } from '@/services/stockService'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BonReceptionSummary {
  id: string
  numéro: string
  fournisseur: string
  dateReception: string
  montantTotal: number
}

interface LigneBR {
  articleId: string
  articleRéférence: string
  articleDésignation: string
  quantiteRecue: number
  prixUnitaireAchat: number
  total: number
}

interface BonReceptionDetail {
  id: string
  numéro: string
  fournisseur: string
  dateReception: string
  montantTotal: number
  lignes: LigneBR[]
}

// ── Schema ────────────────────────────────────────────────────────────────────

const ligneSchema = z.object({
  articleId: z.string().min(1, 'Article requis'),
  quantiteRecue: z.number().positive('Quantité > 0'),
  prixUnitaireAchat: z.number().positive('Prix > 0'),
  numéroLot: z.string().optional(),
})

const schema = z.object({
  fournisseur: z.string().min(1, 'Requis'),
  référenceFournisseur: z.string().optional(),
  dateReception: z.string().min(1, 'Requis'),
  notes: z.string().optional(),
  lignes: z.array(ligneSchema).min(1, 'Au moins une ligne'),
})

type FormData = z.infer<typeof schema>

// ── Service ───────────────────────────────────────────────────────────────────

const brService = {
  getList: (params?: { fournisseur?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) =>
    httpClient.get<{ items: BonReceptionSummary[]; total: number }>('/bons-reception', { params }).then(r => r.data),
  getById: (id: string) =>
    httpClient.get<BonReceptionDetail>(`/bons-reception/${id}`).then(r => r.data),
  create: (dto: FormData) =>
    httpClient.post<BonReceptionDetail>('/bons-reception', dto).then(r => r.data),
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function BonsReceptionPage() {
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [detail, setDetail]   = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['bons-reception', { search, page }],
    queryFn: () => brService.getList({ fournisseur: search || undefined, page, pageSize: PAGE_SIZE }),
  })

  const total = data?.total ?? 0
  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bons de réception</h1>
          <p className="text-sm text-gray-500 mt-0.5">Réception des commandes fournisseurs — mise à jour automatique du stock</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Nouveau bon
        </button>
      </div>

      {/* Filtre */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Rechercher par fournisseur…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Chargement…</div>
      ) : !data?.items.length ? (
        <div className="text-center py-16 text-gray-400">Aucun bon de réception</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Numéro</th>
                <th className="text-left px-4 py-3">Fournisseur</th>
                <th className="text-left px-4 py-3">Date réception</th>
                <th className="text-right px-4 py-3">Montant HT</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map(br => (
                <tr key={br.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-700 font-medium">{br.numéro}</td>
                  <td className="px-4 py-3 text-gray-800">{br.fournisseur}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(br.dateReception).toLocaleDateString('fr-DZ')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {br.montantTotal.toLocaleString('fr-DZ')} DA
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDetail(br.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Détail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm ${
                p === page ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      {detail   && <DetailModal id={detail} onClose={() => setDetail(null)} />}
      {creating && <CreateModal onClose={() => setCreating(false)} />}
    </div>
  )
}

// ── Modal: détail ─────────────────────────────────────────────────────────────

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['bon-reception', id],
    queryFn: () => brService.getById(id),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Détail bon de réception</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : !data ? null : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Numéro</span><p className="font-mono font-medium text-blue-700">{data.numéro}</p></div>
              <div><span className="text-gray-500">Fournisseur</span><p className="font-medium">{data.fournisseur}</p></div>
              <div><span className="text-gray-500">Date</span><p>{new Date(data.dateReception).toLocaleDateString('fr-DZ')}</p></div>
              <div><span className="text-gray-500">Total HT</span><p className="font-semibold">{data.montantTotal.toLocaleString('fr-DZ')} DA</p></div>
            </div>

            <table className="w-full text-sm border-t border-gray-100 mt-2">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Article</th>
                  <th className="text-right px-3 py-2">Qté reçue</th>
                  <th className="text-right px-3 py-2">Prix unit.</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.lignes.map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-gray-500">{l.articleRéférence}</span>
                      <p className="text-gray-800">{l.articleDésignation}</p>
                    </td>
                    <td className="px-3 py-2 text-right">{l.quantiteRecue}</td>
                    <td className="px-3 py-2 text-right">{l.prixUnitaireAchat.toLocaleString('fr-DZ')}</td>
                    <td className="px-3 py-2 text-right font-medium">{l.total.toLocaleString('fr-DZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal: création ───────────────────────────────────────────────────────────

function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const { data: articlesData } = useQuery({
    queryKey: ['articles-search-all'],
    queryFn: () => stockService.getArticles({ pageSize: 200 }),
  })
  const articles = articlesData?.items ?? []

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      dateReception: new Date().toISOString().slice(0, 10),
      lignes: [{ articleId: '', quantiteRecue: 1, prixUnitaireAchat: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' })

  const lignes = watch('lignes')
  const total = lignes.reduce((s, l) => s + (l.quantiteRecue || 0) * (l.prixUnitaireAchat || 0), 0)

  const mut = useMutation({
    mutationFn: brService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bons-reception'] })
      qc.invalidateQueries({ queryKey: ['articles'] })
      toast.success('Bon de réception créé — stock mis à jour')
      onClose()
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Nouveau bon de réception</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit(d => mut.mutate(d))} className="p-5 space-y-5">
          {/* En-tête */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fournisseur *</label>
              <input
                {...register('fournisseur')}
                className={inp(errors.fournisseur)}
                placeholder="Nom du fournisseur"
              />
              {errors.fournisseur && <p className="text-xs text-red-500 mt-0.5">{errors.fournisseur.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Réf. fournisseur</label>
              <input {...register('référenceFournisseur')} className={inp()} placeholder="Optionnel" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date réception *</label>
              <input {...register('dateReception')} type="date" className={inp(errors.dateReception)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} className={inp()} placeholder="Optionnel" />
          </div>

          {/* Lignes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Articles reçus *</label>
              <button
                type="button"
                onClick={() => append({ articleId: '', quantiteRecue: 1, prixUnitaireAchat: 0 })}
                className="text-xs text-blue-600 hover:underline"
              >
                + Ajouter ligne
              </button>
            </div>

            {errors.lignes && typeof errors.lignes.message === 'string' && (
              <p className="text-xs text-red-500 mb-2">{errors.lignes.message}</p>
            )}

            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-start">
                  <div>
                    <select
                      {...register(`lignes.${i}.articleId`)}
                      className={inp(errors.lignes?.[i]?.articleId)}
                    >
                      <option value="">— Choisir article —</option>
                      {articles.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.référence} — {a.désignation}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    {...register(`lignes.${i}.quantiteRecue`, { valueAsNumber: true })}
                    type="number" min={0.01} step={0.01}
                    placeholder="Qté"
                    className={inp(errors.lignes?.[i]?.quantiteRecue)}
                  />
                  <input
                    {...register(`lignes.${i}.prixUnitaireAchat`, { valueAsNumber: true })}
                    type="number" min={0} step={0.01}
                    placeholder="Prix unit."
                    className={inp(errors.lignes?.[i]?.prixUnitaireAchat)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={fields.length === 1}
                    className="h-9 w-8 flex items-center justify-center text-red-400 hover:text-red-600 disabled:opacity-30 text-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="text-right text-sm font-semibold text-gray-700">
            Total HT : {total.toLocaleString('fr-DZ')} DA
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={mut.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {mut.isPending ? 'Création…' : 'Créer & mettre à jour stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inp(err?: any) {
  return `w-full border rounded-lg px-3 py-2 text-sm h-9 focus:outline-none focus:ring-1 ${
    err ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'
  }`
}
