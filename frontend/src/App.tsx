import { Routes, Route, Navigate } from 'react-router-dom'
import { PrivateRoute } from '@/components/auth/PrivateRoute'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { Page403 } from '@/pages/Page403'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<Page403 />} />

      {/* Authenticated — all roles */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<div style={{padding:'2rem'}}><h1>Clients</h1></div>} />
        <Route path="/vehicules" element={<div style={{padding:'2rem'}}><h1>Véhicules</h1></div>} />
        <Route path="/or" element={<div style={{padding:'2rem'}}><h1>Ordres de Réparation</h1></div>} />
        <Route path="/stock" element={<div style={{padding:'2rem'}}><h1>Stock</h1></div>} />
      </Route>

      {/* Caissier + Admin */}
      <Route element={<PrivateRoute allowedRoles={['Caissier']} />}>
        <Route path="/facturation" element={<div style={{padding:'2rem'}}><h1>Facturation</h1></div>} />
        <Route path="/caisse" element={<div style={{padding:'2rem'}}><h1>Caisse</h1></div>} />
      </Route>

      {/* RH + Admin */}
      <Route element={<PrivateRoute allowedRoles={['RH']} />}>
        <Route path="/rh" element={<div style={{padding:'2rem'}}><h1>RH</h1></div>} />
        <Route path="/rh/employes" element={<div style={{padding:'2rem'}}><h1>Employés</h1></div>} />
        <Route path="/rh/paie" element={<div style={{padding:'2rem'}}><h1>Paie</h1></div>} />
      </Route>

      {/* Admin only */}
      <Route element={<PrivateRoute allowedRoles={[]} />}>
        <Route path="/parametres" element={<div style={{padding:'2rem'}}><h1>Paramètres</h1></div>} />
        <Route path="/stats" element={<div style={{padding:'2rem'}}><h1>Statistiques</h1></div>} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
