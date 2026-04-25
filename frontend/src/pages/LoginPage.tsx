import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard'

  const [globalError, setGlobalError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setGlobalError('')
    try {
      await login(data.email, data.password)
      navigate(from, { replace: true })
    } catch {
      setGlobalError('Identifiants incorrects')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Garage System</h1>
        <p style={styles.subtitle}>Connectez-vous à votre espace</p>

        <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
          {globalError && <div style={styles.error}>{globalError}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              style={styles.input}
              placeholder="admin@garage.dz"
            />
            {errors.email && <span style={styles.fieldError}>{errors.email.message}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              style={styles.input}
            />
            {errors.password && <span style={styles.fieldError}>{errors.password.message}</span>}
          </div>

          <button type="submit" disabled={isSubmitting} style={styles.button}>
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' },
  card: { background: '#fff', borderRadius: 12, padding: '2.5rem', width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,.08)' },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b', textAlign: 'center' },
  subtitle: { margin: '0.5rem 0 2rem', color: '#64748b', textAlign: 'center', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  error: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '0.75rem', color: '#dc2626', fontSize: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, outline: 'none' },
  fieldError: { color: '#dc2626', fontSize: 12 },
  button: { padding: '0.75rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
}
