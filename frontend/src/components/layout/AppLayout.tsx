import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { SignalRNotifications } from '@/components/layout/SignalRNotifications'

// ── Types ─────────────────────────────────────────────────────────────────────
interface NavItem {
  label: string
  to: string
  icon: string
  roles?: string[]
}

interface NavGroup {
  title: string
  items: NavItem[]
  roles?: string[]
}

// ── Navigation structure ──────────────────────────────────────────────────────
const NAV: NavGroup[] = [
  {
    title: 'Général',
    items: [
      { label: 'Tableau de bord', to: '/dashboard',       icon: '🏠' },
    ],
  },
  {
    title: 'Atelier',
    items: [
      { label: 'Kanban OR',       to: '/or/kanban',        icon: '🔧' },
      { label: 'Nouvel OR',       to: '/or/nouveau',       icon: '➕' },
      { label: 'Clients',         to: '/clients',          icon: '👥' },
      { label: 'Véhicules',       to: '/vehicules',        icon: '🚗' },
      { label: 'Offres entretien', to: '/offres',           icon: '📬' },
    ],
  },
  {
    title: 'Facturation',
    roles: ['Caissier'],
    items: [
      { label: 'Devis',           to: '/facturation/devis',    icon: '📋', roles: ['Caissier'] },
      { label: 'Factures',        to: '/facturation/factures', icon: '🧾', roles: ['Caissier'] },
      { label: 'Caisse du jour',  to: '/caisse',               icon: '💰', roles: ['Caissier'] },
    ],
  },
  {
    title: 'Stock',
    items: [
      { label: 'Articles',          to: '/stock/articles',       icon: '📦' },
      { label: 'Bons de réception', to: '/stock/bons-reception', icon: '📥' },
      { label: 'Alertes stock',     to: '/stock/alertes',        icon: '⚠️' },
    ],
  },
  {
    title: 'Ressources humaines',
    roles: ['RH'],
    items: [
      { label: 'Employés',        to: '/rh/employes',      icon: '👤', roles: ['RH'] },
      { label: 'Pointage',        to: '/rh/pointage',      icon: '🕐', roles: ['RH'] },
      { label: 'Congés',          to: '/rh/conges',        icon: '🏖️', roles: ['RH'] },
      { label: 'Bulletins de paie', to: '/rh/paie',        icon: '💵', roles: ['RH'] },
    ],
  },
  {
    title: 'Administration',
    roles: ['Admin'],
    items: [
      { label: 'Statistiques',    to: '/stats',            icon: '📊', roles: ['Admin'] },
      { label: 'Paramètres',      to: '/parametres',       icon: '⚙️', roles: ['Admin'] },
    ],
  },
]

const ROLE_LABEL: Record<string, string> = {
  Admin:      'Administrateur',
  Technicien: 'Technicien',
  Caissier:   'Caissier',
  RH:         'RH',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function hasAccess(roles: string[] | undefined, userRoles: string[]): boolean {
  if (!roles || roles.length === 0) return true
  return userRoles.includes('Admin') || roles.some(r => userRoles.includes(r))
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const userRoles = user?.roles ?? []

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside style={{
      width: collapsed ? '56px' : '220px',
      minHeight: '100vh',
      background: '#111827',
      color: '#d1d5db',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Logo + toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '1rem 0' : '1rem 1rem',
        borderBottom: '1px solid #1f2937',
        minHeight: '56px',
      }}>
        {!collapsed && (
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white', whiteSpace: 'nowrap' }}>
            🔩 Garage
          </span>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Déplier' : 'Replier'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', fontSize: '1.1rem', padding: '0.25rem',
            lineHeight: 1,
          }}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
        {NAV.map(group => {
          if (!hasAccess(group.roles, userRoles)) return null
          const visibleItems = group.items.filter(i => hasAccess(i.roles, userRoles))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.title} style={{ marginBottom: '0.25rem' }}>
              {!collapsed && (
                <div style={{
                  padding: '0.5rem 1rem 0.25rem',
                  fontSize: '0.65rem', fontWeight: 700,
                  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                }}>
                  {group.title}
                </div>
              )}
              {visibleItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center',
                    gap: '0.6rem',
                    padding: collapsed ? '0.6rem 0' : '0.5rem 1rem',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    borderRadius: '0',
                    background: isActive ? '#1f2937' : 'transparent',
                    color: isActive ? 'white' : '#9ca3af',
                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                    transition: 'background 0.15s, color 0.15s',
                    whiteSpace: 'nowrap',
                  })}
                >
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div style={{
        borderTop: '1px solid #1f2937',
        padding: collapsed ? '0.75rem 0' : '0.75rem 1rem',
      }}>
        {!collapsed && user && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.1rem' }}>
              {user.roles.map(r => ROLE_LABEL[r] ?? r).join(', ')}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Déconnexion"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%', background: 'none', border: 'none',
            cursor: 'pointer', color: '#9ca3af',
            fontSize: '0.875rem', padding: '0.4rem 0',
          }}
        >
          <span>🚪</span>
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}

// ── Layout principal ──────────────────────────────────────────────────────────
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <Outlet />
      </main>
      <SignalRNotifications />
    </div>
  )
}
