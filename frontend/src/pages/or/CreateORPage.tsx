import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { orService } from '@/services/orService'
import httpClient from '@/services/httpClient'

/* ── Types API ───────────────────────────────────────────────────────────── */
type VehiculeOption = { id: string; label: string; km: number }
type TechnicienOption = { id: string; label: string }

/* ── Hook recherche véhicule ─────────────────────────────────────────────── */
function useVehiculeSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VehiculeOption[]>([])
  const [pinned, setPinned] = useState<VehiculeOption[]>([])
  const [loading, setLoading] = useState(false)

  const addOption = (opt: VehiculeOption) => setPinned([opt])

  const options = query.length >= 2
    ? results
    : pinned

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await httpClient.get('/vehicules/search', { params: { q: query } })
        setResults(data.map((v: { id: string; immatriculation: string; marque: string; modele: string; kilométrageActuel: number; clientNom: string }) => ({
          id: v.id,
          label: `${v.immatriculation} — ${v.marque} ${v.modele} (${v.clientNom})`,
          km: v.kilométrageActuel,
        })))
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  return { query, setQuery, options, loading, addOption }
}

/* ── Hook liste techniciens ──────────────────────────────────────────────── */
function useTechniciens() {
  const [options, setOptions] = useState<TechnicienOption[]>([])

  useEffect(() => {
    httpClient.get('/employes', { params: { poste: 'Technicien', actif: true, pageSize: 100 } })
      .then(({ data }) => setOptions(
        data.items.map((e: { id: string; nom: string; prénom: string }) => ({
          id: e.id,
          label: `${e.prénom} ${e.nom}`,
        }))
      ))
      .catch(() => {})
  }, [])

  return options
}

/* ── Composant SearchableSelect ──────────────────────────────────────────── */
function SearchableSelect({
  value, onChange, query, onQueryChange,
  options, loading, placeholder, required,
}: {
  value: string; onChange: (opt: VehiculeOption) => void
  query: string; onQueryChange: (q: string) => void
  options: VehiculeOption[]; loading: boolean
  placeholder: string; required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.id === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={open ? query : (selected?.label ?? '')}
        onChange={e => { onQueryChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
      />
      {open && (query.length >= 2 || options.length > 0) && (
        <div style={dropdownStyle}>
          {loading && <div style={dropdownItemStyle}>Recherche…</div>}
          {!loading && options.length === 0 && query.length >= 2 && (
            <div style={dropdownItemStyle}>Aucun résultat</div>
          )}
          {options.map(o => (
            <div
              key={o.id}
              style={{ ...dropdownItemStyle, background: o.id === value ? '#eff6ff' : undefined, cursor: 'pointer' }}
              onMouseDown={e => { e.preventDefault(); onChange(o); onQueryChange(''); setOpen(false) }}
            >
              {o.label}
              <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>{o.km.toLocaleString()} km</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Schémas Zod ─────────────────────────────────────────────────────────── */
const step1Schema = z.object({
  vehiculeId: z.string().uuid('Sélectionnez un véhicule'),
  technicienId: z.string().uuid().optional().or(z.literal('')),
})

const step2Schema = z.object({
  kilométrageActuel: z.number({ required_error: 'Kilométrage requis' }).min(0),
  typeIntervention: z.enum([
    'Vidange', 'Révision', 'Diagnostic', 'Freinage',
    'Distribution', 'Climatisation', 'Électrique', 'Carrosserie', 'Autre',
  ]),
  priorité: z.enum(['Normal', 'Urgent']),
  diagnostic: z.string().max(500).optional(),
})

type Step1 = z.infer<typeof step1Schema>
type Step2 = z.infer<typeof step2Schema>

/* ── Page principale ─────────────────────────────────────────────────────── */
export function CreateORPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<1 | 2>(1)
  const [step1Data, setStep1Data] = useState<Step1 | null>(null)

  const vehiculeSearch = useVehiculeSearch()
  const techniciens = useTechniciens()

  const [vehiculeId, setVehiculeId] = useState(searchParams.get('vehiculeId') ?? '')
  const [vehiculeKm, setVehiculeKm] = useState<number | undefined>()
  const [technicienId, setTechnicienId] = useState('')
  const [vehiculeErr, setVehiculeErr] = useState('')

  // Pré-charger le véhicule si passé en query param
  useEffect(() => {
    const paramId = searchParams.get('vehiculeId')
    if (!paramId) return
    httpClient.get(`/vehicules/${paramId}`)
      .then(({ data }) => {
        const opt: VehiculeOption = {
          id: paramId,
          label: `${data.immatriculation} — ${data.marque} ${data.modele} (${data.clientNom ?? data.client?.nom ?? ''})`,
          km: data.kilométrageActuel,
        }
        vehiculeSearch.addOption(opt)
        setVehiculeId(paramId)
        setVehiculeKm(data.kilométrageActuel)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Étape 1 ─────────────────────────────────────────────────────────── */
  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { priorité: 'Normal', typeIntervention: 'Diagnostic' },
  })

  const onStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vehiculeId) { setVehiculeErr('Sélectionnez un véhicule'); return }
    setVehiculeErr('')
    setStep1Data({ vehiculeId, technicienId: technicienId || undefined })
    if (vehiculeKm !== undefined) form2.setValue('kilométrageActuel', vehiculeKm)
    setStep(2)
  }

  /* ── Étape 2 ─────────────────────────────────────────────────────────── */
  const onStep2 = form2.handleSubmit(async (data) => {
    if (!step1Data) return
    try {
      await orService.create({
        vehiculeId: step1Data.vehiculeId,
        technicienId: step1Data.technicienId || undefined,
        kilométrageActuel: data.kilométrageActuel,
        typeIntervention: data.typeIntervention,
        priorité: data.priorité,
        diagnostic: data.diagnostic,
      })
      toast.success('OR créé avec succès')
      navigate('/or/kanban')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail ?? "Erreur lors de la création de l'OR")
    }
  })

  return (
    <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      {/* Barre de progression */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[1, 2].map(n => (
          <div key={n} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: step >= n ? '#2563eb' : '#e2e8f0',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* ── Étape 1 ─────────────────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={onStep1}>
          <h2 style={{ margin: '0 0 1.5rem' }}>Étape 1 — Véhicule & Technicien</h2>

          <div style={fieldStyle}>
            <label style={labelStyle}>Véhicule *</label>
            <SearchableSelect
              value={vehiculeId}
              onChange={opt => { setVehiculeId(opt.id); setVehiculeKm(opt.km); setVehiculeErr(''); vehiculeSearch.addOption(opt) }}
              query={vehiculeSearch.query}
              onQueryChange={vehiculeSearch.setQuery}
              options={vehiculeSearch.options}
              loading={vehiculeSearch.loading}
              placeholder="Rechercher par immatriculation ou marque…"
              required
            />
            {vehiculeErr && <span style={errStyle}>{vehiculeErr}</span>}
            <span style={{ fontSize: 12, color: '#6b7280' }}>Tapez au moins 2 caractères</span>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Technicien <span style={{ fontWeight: 400, color: '#6b7280' }}>(optionnel)</span></label>
            <select
              value={technicienId}
              onChange={e => setTechnicienId(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Non assigné —</option>
              {techniciens.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <button type="submit" style={btnStyle}>Suivant →</button>
        </form>
      )}

      {/* ── Étape 2 ─────────────────────────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={onStep2}>
          <h2 style={{ margin: '0 0 1.5rem' }}>Étape 2 — Intervention</h2>

          <div style={fieldStyle}>
            <label style={labelStyle}>Kilométrage actuel *</label>
            <input
              {...form2.register('kilométrageActuel', { valueAsNumber: true })}
              type="number" min={0}
              style={inputStyle}
            />
            {form2.formState.errors.kilométrageActuel && (
              <span style={errStyle}>{form2.formState.errors.kilométrageActuel.message}</span>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Type d'intervention *</label>
            <select {...form2.register('typeIntervention')} style={inputStyle}>
              {['Vidange','Révision','Diagnostic','Freinage','Distribution','Climatisation','Électrique','Carrosserie','Autre']
                .map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Priorité *</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {(['Normal', 'Urgent'] as const).map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input {...form2.register('priorité')} type="radio" value={p} />
                  <span style={{ color: p === 'Urgent' ? '#dc2626' : undefined }}>{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Diagnostic initial</label>
            <textarea
              {...form2.register('diagnostic')}
              rows={4} maxLength={500}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Description des symptômes observés…"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={() => setStep(1)} style={{ ...btnStyle, background: '#f1f5f9', color: '#334155' }}>
              ← Retour
            </button>
            <button type="submit" disabled={form2.formState.isSubmitting} style={btnStyle}>
              {form2.formState.isSubmitting ? 'Création…' : "Créer l'OR"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

const fieldStyle: React.CSSProperties    = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1.25rem' }
const labelStyle: React.CSSProperties    = { fontSize: 13, fontWeight: 500, color: '#374151' }
const inputStyle: React.CSSProperties    = { padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }
const errStyle: React.CSSProperties      = { color: '#dc2626', fontSize: 12 }
const btnStyle: React.CSSProperties      = { padding: '0.75rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', flex: 1 }
const dropdownStyle: React.CSSProperties = { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.1)', zIndex: 50, maxHeight: 220, overflowY: 'auto', marginTop: 2 }
const dropdownItemStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', fontSize: 14, color: '#111827' }
