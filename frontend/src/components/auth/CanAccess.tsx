import { ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'

interface CanAccessProps {
  roles: string[]
  children: ReactNode
}

export function CanAccess({ roles, children }: CanAccessProps) {
  const allowed = usePermission(roles)
  return allowed ? <>{children}</> : null
}
