import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { orService } from '@/services/orService'

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

export function CreateORPage() {
  const navigate   = useNavigate()
  const [step, setStep]     = useState<1 | 2>(1)
  const [step1Data, setStep1Data] = useState<Step1 | null>(null)

  /* ── Étape 1 ─────────────────────────────────────────────────────────── */
  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) })

  const onStep1 = form1.handleSubmit((data) => {
    setStep1Data(data)
    setStep(2)
  })

  /* ── Étape 2 ─────────────────────────────────────────────────────────── */
  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { priorité: 'Normal', typeIntervention: 'Diagnostic' },
  })

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
    } catch {
      toast.error('Erreur lors de la création de l\'OR')
    }
  })

  return (
    <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[1, 2].map(n => (
          <div key={n} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: step >= n ? '#2563eb' : '#e2e8f0',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* ── Étape 1 — Client & Véhicule ───────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={onStep1}>
          <h2 style={{ margin: '0 0 1.5rem' }}>Étape 1 — Véhicule</h2>

          <div style={fieldStyle}>
            <label style={labelStyle}>ID Véhicule *</label>
            <input
              {...form1.register('vehiculeId')}
              placeholder="UUID du véhicule"
              style={inputStyle}
            />
            {form1.formState.errors.vehiculeId && (
              <span style={errStyle}>{form1.formState.errors.vehiculeId.message}</span>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Technicien (optionnel)</label>
            <input
              {...form1.register('technicienId')}
              placeholder="UUID du technicien"
              style={inputStyle}
            />
          </div>

          <button type="submit" style={btnStyle}>Suivant →</button>
        </form>
      )}

      {/* ── Étape 2 — Détails intervention ───────────────────────────── */}
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
              {form2.formState.isSubmitting ? 'Création…' : 'Créer l\'OR'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1.25rem' }
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151' }
const inputStyle: React.CSSProperties = { padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }
const errStyle:   React.CSSProperties = { color: '#dc2626', fontSize: 12 }
const btnStyle:   React.CSSProperties = { padding: '0.75rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', flex: 1 }
