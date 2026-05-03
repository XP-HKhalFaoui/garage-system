import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@/types/auth'
import { authService } from '@/services/authService'
import { setAccessToken } from '@/services/httpClient'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: try to restore session via refresh token
  useEffect(() => {
    const init = async () => {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) { setIsLoading(false); return }
      try {
        await authService.refreshToken()
        const me = await authService.getMe()
        setUser(me)
      } catch (err: unknown) {
        // Only clear stored tokens on explicit auth rejection (401/403).
        // Network errors / server down should NOT log the user out permanently.
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 403) {
          setAccessToken(null)
          localStorage.removeItem('refreshToken')
        }
        // Otherwise keep the refresh token — next load will retry.
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const login = async (email: string, password: string) => {
    await authService.login(email, password)
    const me = await authService.getMe()
    setUser(me)
  }

  const logout = async () => {
    // Always clear local user state, even if the API call fails.
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
