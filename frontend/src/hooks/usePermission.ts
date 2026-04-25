import { useAuth } from '@/contexts/AuthContext'

export function usePermission(requiredRoles: string[]): boolean {
  const { user } = useAuth()
  if (!user) return false
  if (user.roles.includes('Admin')) return true
  return requiredRoles.some((r) => user.roles.includes(r))
}
