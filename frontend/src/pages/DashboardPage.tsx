import { useAuth } from '@/contexts/AuthContext'

export function DashboardPage() {
  const { user, logout } = useAuth()
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Tableau de bord</h1>
        <div>
          <span style={{ marginRight: '1rem', color: '#64748b' }}>{user?.email} — {user?.roles.join(', ')}</span>
          <button onClick={logout} style={{ padding: '0.5rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>
      </div>
      <p>Bienvenue dans le système de gestion du garage.</p>
    </div>
  )
}
