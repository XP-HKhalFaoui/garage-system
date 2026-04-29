import { Routes, Route, Navigate } from 'react-router-dom'
import { PrivateRoute }    from '@/components/auth/PrivateRoute'
import { AppLayout }       from '@/components/layout/AppLayout'
import { LoginPage }       from '@/pages/LoginPage'
import { DashboardPage }   from '@/pages/DashboardPage'
import { Page403 }         from '@/pages/Page403'
import { KanbanPage }      from '@/pages/or/KanbanPage'
import { CreateORPage }    from '@/pages/or/CreateORPage'
import ORDetailPage        from '@/pages/or/ORDetailPage'
import { ArticlesPage }    from '@/pages/stock/ArticlesPage'
import { AlertesStockPage } from '@/pages/stock/AlertesStockPage'
import VehiculeDetailPage  from '@/pages/vehicules/VehiculeDetailPage'
import VéhiculesPage       from '@/pages/vehicules/VéhiculesPage'
import ClientsPage         from '@/pages/clients/ClientsPage'
import { FacturesPage }    from '@/pages/facturation/FacturesPage'
import { DevisPage }       from '@/pages/facturation/DevisPage'
import EmployesPage        from '@/pages/rh/EmployesPage'
import PointagePage        from '@/pages/rh/PointagePage'
import PaiePage            from '@/pages/rh/PaiePage'
import CongesPage          from '@/pages/rh/CongesPage'
import { StatsPage }       from '@/pages/StatsPage'
import { CaissePage }      from '@/pages/CaissePage'
import { OffresPage }      from '@/pages/OffresPage'
import { PortailClientPage } from '@/pages/PortailClientPage'
import { BonsReceptionPage } from '@/pages/stock/BonsReceptionPage'
import { ParametresPage }    from '@/pages/ParametresPage'
import SociétésPage          from '@/pages/fleet/SociétésPage'
import SociétéDetailPage     from '@/pages/fleet/SociétéDetailPage'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/403"            element={<Page403 />} />
      <Route path="/portail/:token" element={<PortailClientPage />} />

      {/* Authenticated — layout + auth guard */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>

          {/* All roles */}
          <Route path="/dashboard"      element={<DashboardPage />} />
          <Route path="/or/kanban"      element={<KanbanPage />} />
          <Route path="/or/nouveau"     element={<CreateORPage />} />
          <Route path="/or/:id"         element={<ORDetailPage />} />
          <Route path="/stock/articles"       element={<ArticlesPage />} />
          <Route path="/stock/bons-reception" element={<BonsReceptionPage />} />
          <Route path="/stock/alertes"        element={<AlertesStockPage />} />
          <Route path="/clients"        element={<ClientsPage />} />
          <Route path="/vehicules"      element={<VéhiculesPage />} />
          <Route path="/vehicules/:id"  element={<VehiculeDetailPage />} />
          <Route path="/offres"         element={<OffresPage />} />
          <Route path="/fleet"          element={<SociétésPage />} />
          <Route path="/fleet/:id"      element={<SociétéDetailPage />} />

          {/* Caissier + Admin */}
          <Route element={<PrivateRoute allowedRoles={['Caissier']} />}>
            <Route path="/facturation"          element={<FacturesPage />} />
            <Route path="/facturation/factures" element={<FacturesPage />} />
            <Route path="/facturation/devis"    element={<DevisPage />} />
            <Route path="/caisse"               element={<CaissePage />} />
          </Route>

          {/* RH + Admin */}
          <Route element={<PrivateRoute allowedRoles={['RH']} />}>
            <Route path="/rh/employes" element={<EmployesPage />} />
            <Route path="/rh/pointage" element={<PointagePage />} />
            <Route path="/rh/paie"     element={<PaiePage />} />
            <Route path="/rh/conges"   element={<CongesPage />} />
          </Route>

          {/* Admin only */}
          <Route element={<PrivateRoute allowedRoles={['Admin']} />}>
            <Route path="/stats"      element={<StatsPage />} />
            <Route path="/parametres" element={<ParametresPage />} />
          </Route>

        </Route>
      </Route>

      <Route path="/"  element={<Navigate to="/dashboard" replace />} />
      <Route path="*"  element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
