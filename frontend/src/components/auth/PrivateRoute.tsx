import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface PrivateRouteProps {
  allowedRoles?: string[]
}

export function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <div className="loading-screen">Chargement...</div>

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user?.roles.includes('Admin') ||
      allowedRoles.some((r) => user?.roles.includes(r))
    if (!hasRole) return <Navigate to="/403" replace />
  }

  return <Outlet />
}
