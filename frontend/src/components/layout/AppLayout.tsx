import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Wrench, PlusCircle, Users, Car, Mail,
  FileText, Receipt, Wallet, Package, PackageSearch, AlertTriangle,
  UserCircle, Clock, UmbrellaOff, DollarSign, BarChart2, Settings,
  LogOut, Menu,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { SignalRNotifications } from '@/components/layout/SignalRNotifications'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface NavItem {
  label: string
  to: string
  icon: React.ElementType
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
      { label: 'Tableau de bord', to: '/dashboard',            icon: LayoutDashboard },
    ],
  },
  {
    title: 'Atelier',
    items: [
      { label: 'Kanban OR',        to: '/or/kanban',            icon: Wrench },
      { label: 'Nouvel OR',        to: '/or/nouveau',           icon: PlusCircle },
      { label: 'Clients',          to: '/clients',              icon: Users },
      { label: 'Véhicules',        to: '/vehicules',            icon: Car },
      { label: 'Offres entretien', to: '/offres',               icon: Mail },
    ],
  },
  {
    title: 'Facturation',
    roles: ['Caissier'],
    items: [
      { label: 'Devis',           to: '/facturation/devis',    icon: FileText,        roles: ['Caissier'] },
      { label: 'Factures',        to: '/facturation/factures', icon: Receipt,         roles: ['Caissier'] },
      { label: 'Caisse du jour',  to: '/caisse',               icon: Wallet,          roles: ['Caissier'] },
    ],
  },
  {
    title: 'Stock',
    items: [
      { label: 'Articles',          to: '/stock/articles',       icon: Package },
      { label: 'Bons de réception', to: '/stock/bons-reception', icon: PackageSearch },
      { label: 'Alertes stock',     to: '/stock/alertes',        icon: AlertTriangle },
    ],
  },
  {
    title: 'Ressources humaines',
    roles: ['RH'],
    items: [
      { label: 'Employés',          to: '/rh/employes', icon: UserCircle,  roles: ['RH'] },
      { label: 'Pointage',          to: '/rh/pointage', icon: Clock,       roles: ['RH'] },
      { label: 'Congés',            to: '/rh/conges',   icon: UmbrellaOff, roles: ['RH'] },
      { label: 'Bulletins de paie', to: '/rh/paie',     icon: DollarSign,  roles: ['RH'] },
    ],
  },
  {
    title: 'Administration',
    roles: ['Admin'],
    items: [
      { label: 'Statistiques', to: '/stats',      icon: BarChart2, roles: ['Admin'] },
      { label: 'Paramètres',   to: '/parametres', icon: Settings,  roles: ['Admin'] },
    ],
  },
]

const ROLE_LABEL: Record<string, string> = {
  Admin: 'Administrateur', Technicien: 'Technicien', Caissier: 'Caissier', RH: 'RH',
}

function hasAccess(roles: string[] | undefined, userRoles: string[]): boolean {
  if (!roles || roles.length === 0) return true
  return userRoles.includes('Admin') || roles.some(r => userRoles.includes(r))
}

function initials(email: string) {
  return email.slice(0, 2).toUpperCase()
}

// ── Nav items (shared between sidebar + mobile sheet) ────────────────────────
function NavItems({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { user } = useAuth()
  const userRoles = user?.roles ?? []

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {NAV.map(group => {
          if (!hasAccess(group.roles, userRoles)) return null
          const visibleItems = group.items.filter(i => hasAccess(i.roles, userRoles))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.title} className="mb-1">
              {!collapsed && (
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {group.title}
                </p>
              )}
              {visibleItems.map(item => {
                const Icon = item.icon
                const link = (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-none transition-colors',
                        'border-l-2',
                        isActive
                          ? 'border-primary bg-slate-800 text-white'
                          : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                        collapsed && 'justify-center px-0',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                )

                if (collapsed) {
                  return (
                    <Tooltip key={item.to}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  )
                }
                return link
              })}
            </div>
          )
        })}
      </nav>
    </TooltipProvider>
  )
}

// ── Sidebar (desktop) ─────────────────────────────────────────────────────────
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-slate-900 text-slate-300 transition-all duration-200 shrink-0 h-screen sticky top-0',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn(
        'flex items-center border-b border-slate-800 h-14 shrink-0',
        collapsed ? 'justify-center' : 'justify-between px-3',
      )}>
        {!collapsed && (
          <span className="font-bold text-white text-sm truncate">⚙ Garage System</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <NavItems collapsed={collapsed} />

      <Separator className="bg-slate-800" />

      {/* User footer */}
      <div className={cn('p-3 shrink-0', collapsed && 'flex justify-center')}>
        {!collapsed && user && (
          <div className="mb-2 flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials(user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user.email}</p>
              <p className="text-[10px] text-slate-500 truncate">
                {user.roles.map(r => ROLE_LABEL[r] ?? r).join(', ')}
              </p>
            </div>
          </div>
        )}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                onClick={handleLogout}
                className={cn(
                  'text-slate-400 hover:text-white hover:bg-slate-800',
                  !collapsed && 'w-full justify-start gap-2',
                )}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Déconnexion</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Déconnexion</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
      {/* Mobile burger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0 bg-slate-900 text-slate-300 border-slate-800">
          <div className="flex items-center h-14 px-3 border-b border-slate-800">
            <span className="font-bold text-white text-sm">⚙ Garage System</span>
          </div>
          <NavItems onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      {/* User info */}
      {user && (
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-muted-foreground">
            {user.roles.map(r => ROLE_LABEL[r] ?? r).join(', ')}
          </span>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials(user.email)}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Déconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  )
}

// ── Layout principal ──────────────────────────────────────────────────────────
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <SignalRNotifications />
    </div>
  )
}
