import { useNavigate } from 'react-router-dom'

export function Page403() {
  const navigate = useNavigate()
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1 style={{ fontSize: 64, color: '#e2e8f0' }}>403</h1>
      <h2>Accès refusé</h2>
      <p style={{ color: '#64748b' }}>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      <button onClick={() => navigate('/dashboard')} style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
        Retour au tableau de bord
      </button>
    </div>
  )
}
