import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import httpClient from '@/services/httpClient'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GarageConfig {
  nom: string
  adresse: string
  téléphone: string
  email: string
  siteWeb?: string
  numeroRegistreCommerce?: string
  numeroFiscal?: string
  tauxTVADefaut: number
  deviseSymbole: string
  logoUrl?: string
}

const schema = z.object({
  nom: z.string().min(1, 'Requis'),
  adresse: z.string().min(1, 'Requis'),
  téléphone: z.string().min(1, 'Requis'),
  email: z.string().email('Email invalide'),
  siteWeb: z.string().optional(),
  numeroRegistreCommerce: z.string().optional(),
  numeroFiscal: z.string().optional(),
  tauxTVADefaut: z.number().min(0).max(100),
  deviseSymbole: z.string().min(1),
  logoUrl: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Service ───────────────────────────────────────────────────────────────────

const configService = {
  get: () => httpClient.get<GarageConfig>('/parametres').then(r => r.data),
  update: (dto: FormData) => httpClient.put<GarageConfig>('/parametres', dto).then(r => r.data),
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'garage' | 'fiscalite' | 'utilisateurs'

const TABS: { id: Tab; label: string }[] = [
  { id: 'garage',       label: 'Informations garage' },
  { id: 'fiscalite',    label: 'Fiscalité & facturation' },
  { id: 'utilisateurs', label: 'Utilisateurs & rôles' },
]

// ── Composant principal ───────────────────────────────────────────────────────

export function ParametresPage() {
  const [activeTab, setActiveTab] = useState<Tab>('garage')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === t.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'garage'       && <GarageInfoTab />}
      {activeTab === 'fiscalite'    && <FiscaliteTab />}
      {activeTab === 'utilisateurs' && <UtilisateursTab />}
    </div>
  )
}

// ── Tab: Infos garage ─────────────────────────────────────────────────────────

function GarageInfoTab() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['parametres'],
    queryFn: configService.get,
    retry: false,
  })

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: data ?? {
      nom: '', adresse: '', téléphone: '', email: '',
      tauxTVADefaut: 19, deviseSymbole: 'DA',
    },
  })

  const mut = useMutation({
    mutationFn: configService.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parametres'] })
      toast.success('Paramètres sauvegardés')
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  if (isLoading) return <div className="text-gray-400 text-sm">Chargement…</div>

  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-6">
      <Section title="Identité du garage">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom du garage *" error={errors.nom?.message}>
            <input {...register('nom')} className={input(errors.nom)} />
          </Field>
          <Field label="Téléphone *" error={errors.téléphone?.message}>
            <input {...register('téléphone')} className={input(errors.téléphone)} />
          </Field>
          <Field label="Email *" error={errors.email?.message}>
            <input {...register('email')} type="email" className={input(errors.email)} />
          </Field>
          <Field label="Site web">
            <input {...register('siteWeb')} className={input()} />
          </Field>
        </div>
        <Field label="Adresse *" error={errors.adresse?.message}>
          <textarea {...register('adresse')} rows={2} className={input(errors.adresse)} />
        </Field>
      </Section>

      <Section title="Logo">
        <Field label="URL du logo (hébergé)">
          <input {...register('logoUrl')} placeholder="https://…" className={input()} />
        </Field>
        {data?.logoUrl && (
          <img src={data.logoUrl} alt="logo" className="h-16 mt-2 rounded border border-gray-200 p-1" />
        )}
      </Section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isDirty || mut.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {mut.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  )
}

// ── Tab: Fiscalité ────────────────────────────────────────────────────────────

function FiscaliteTab() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['parametres'],
    queryFn: configService.get,
    retry: false,
  })

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: data ?? {
      nom: '', adresse: '', téléphone: '', email: '',
      tauxTVADefaut: 19, deviseSymbole: 'DA',
    },
  })

  const mut = useMutation({
    mutationFn: configService.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parametres'] })
      toast.success('Paramètres sauvegardés')
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  if (isLoading) return <div className="text-gray-400 text-sm">Chargement…</div>

  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-6">
      <Section title="Informations fiscales">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Registre de commerce">
            <input {...register('numeroRegistreCommerce')} className={input()} />
          </Field>
          <Field label="Numéro fiscal (NIF)">
            <input {...register('numeroFiscal')} className={input()} />
          </Field>
        </div>
      </Section>

      <Section title="TVA & devise">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Taux TVA par défaut (%)" error={errors.tauxTVADefaut?.message}>
            <input
              {...register('tauxTVADefaut', { valueAsNumber: true })}
              type="number" step="0.5" min={0} max={100}
              className={input(errors.tauxTVADefaut)}
            />
          </Field>
          <Field label="Symbole devise" error={errors.deviseSymbole?.message}>
            <input {...register('deviseSymbole')} placeholder="DA" className={input(errors.deviseSymbole)} />
          </Field>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Ce taux TVA est utilisé par défaut lors de la création de devis et factures.
        </p>
      </Section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isDirty || mut.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {mut.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  )
}

// ── Tab: Utilisateurs ─────────────────────────────────────────────────────────

interface UserEntry { id: string; email: string; role: string; isActif: boolean }

function UtilisateursTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['users-admin'],
    queryFn: () => httpClient.get<UserEntry[]>('/auth/users').then(r => r.data),
    retry: false,
  })

  const qc = useQueryClient()

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      httpClient.patch(`/auth/users/${id}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-admin'] })
      toast.success('Rôle mis à jour')
    },
  })

  const ROLES = ['Admin', 'RH', 'Caissier', 'Technicien', 'Receptionniste']

  if (isLoading) return <div className="text-gray-400 text-sm">Chargement…</div>

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Les utilisateurs sont créés lors de l'inscription. Modifiez les rôles directement dans le tableau.
      </p>

      {!data || data.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucun utilisateur trouvé</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Rôle</th>
                <th className="text-left px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={u.role}
                      onChange={e => roleMut.mutate({ id: u.id, role: e.target.value })}
                      className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.isActif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.isActif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function input(err?: any) {
  return `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    err ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'
  }`
}
