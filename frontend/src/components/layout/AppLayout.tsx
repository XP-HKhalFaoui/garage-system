import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Wrench, PlusCircle, Users, Car, Mail,
  FileText, Receipt, Wallet, Package, PackageSearch, AlertTriangle,
  UserCircle, Clock, UmbrellaOff, DollarSign, BarChart2, Settings,
  LogOut, Menu, Building2, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { SignalRNotifications } from '@/components/layout/SignalRNotifications'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface NavItem  { label: string; to: string; icon: React.ElementType; roles?: string[] }
interface NavGroup { title: string; items: NavItem[]; roles?: string[] }

const NAV: NavGroup[] = [
  {
    title: 'Général',
    items: [
      { label: 'Tableau de bord',   to: '/dashboard',            icon: LayoutDashboard },
    ],
  },
  {
    title: 'Atelier',
    items: [
      { label: 'Kanban OR',         to: '/or/kanban',            icon: Wrench },
      { label: 'Nouvel OR',         to: '/or/nouveau',           icon: PlusCircle },
      { label: 'Clients',           to: '/clients',              icon: Users },
      { label: 'Véhicules',         to: '/vehicules',            icon: Car },
      { label: 'Offres entretien',  to: '/offres',               icon: Mail },
      { label: 'Sociétés abonnées', to: '/fleet',                icon: Building2 },
    ],
  },
  {
    title: 'Facturation',
    roles: ['Caissier'],
    items: [
      { label: 'Devis',             to: '/facturation/devis',    icon: FileText,   roles: ['Caissier'] },
      { label: 'Factures',          to: '/facturation/factures', icon: Receipt,    roles: ['Caissier'] },
      { label: 'Caisse du jour',    to: '/caisse',               icon: Wallet,     roles: ['Caissier'] },
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

// ── Single nav link — expanded ─────────────────────────────────────────────
function NavLinkExpanded({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
          isActive
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')} />
          <span className="truncate">{item.label}</span>
          {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />}
        </>
      )}
    </NavLink>
  )
}

// ── Single nav link — collapsed (icon only) ────────────────────────────────
function NavLinkCollapsed({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150',
              isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                : 'text-slate-400 hover:bg-slate-700 hover:text-white',
            )
          }
        >
          <Icon className="h-5 w-5" />
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" className="font-medium">
        {item.label}
      </TooltipContent>
    </Tooltip>
  )
}

// ── Nav items list ─────────────────────────────────────────────────────────
function NavItems({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { user } = useAuth()
  const userRoles = user?.roles ?? []

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin">
        {NAV.map((group, gi) => {
          if (!hasAccess(group.roles, userRoles)) return null
          const visibleItems = group.items.filter(i => hasAccess(i.roles, userRoles))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.title} className={cn(collapsed ? 'px-2 py-1' : 'px-3 mb-2')}>
              {/* Section header */}
              {!collapsed ? (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  {group.title}
                </p>
              ) : gi > 0 ? (
                <div className="my-1 border-t border-slate-700/60" />
              ) : null}

              {/* Items */}
              <div className={cn('space-y-0.5', collapsed && 'flex flex-col items-center')}>
                {visibleItems.map(item =>
                  collapsed
                    ? <NavLinkCollapsed key={item.to} item={item} onNavigate={onNavigate} />
                    : <NavLinkExpanded  key={item.to} item={item} onNavigate={onNavigate} />
                )}
              </div>
            </div>
          )
        })}
      </nav>
    </TooltipProvider>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-slate-900 shrink-0 h-screen sticky top-0',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[70px]' : 'w-60',
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex h-14 shrink-0 items-center border-b border-slate-800',
        collapsed ? 'justify-center' : 'justify-between px-4',
      )}>
        {!collapsed && (
          <span className="font-bold text-white text-sm tracking-tight select-none">
            ⚙ Garage System
          </span>
        )}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggle}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                {collapsed
                  ? <PanelLeftOpen  className="h-4 w-4" />
                  : <PanelLeftClose className="h-4 w-4" />
                }
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Nav */}
      <NavItems collapsed={collapsed} />

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-800">
        {collapsed ? (
          <div className="flex justify-center py-3">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-900/40 hover:text-red-400"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Déconnexion</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                {user ? initials(user.email) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">{user?.email}</p>
              <p className="truncate text-[10px] text-slate-500">
                {user?.roles.map(r => ROLE_LABEL[r] ?? r).join(', ')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-900/40 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

// ── Topbar ─────────────────────────────────────────────────────────────────
function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0 bg-slate-900 border-slate-800">
          <div className="flex h-14 items-center border-b border-slate-800 px-4">
            <span className="font-bold text-white text-sm">⚙ Garage System</span>
          </div>
          <NavItems onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      {user && (
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-muted-foreground">
            {user.roles.map(r => ROLE_LABEL[r] ?? r).join(', ')}
          </span>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
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

// ── Layout ─────────────────────────────────────────────────────────────────
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
