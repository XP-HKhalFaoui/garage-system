import axios from 'axios'
import { TokenResponse, User } from '@/types/auth'
import { setAccessToken } from './httpClient'

export const authService = {
  async login(email: string, password: string): Promise<TokenResponse> {
    const { data } = await axios.post<TokenResponse>('/api/auth/login', { email, password })
    setAccessToken(data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    return data
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      await axios.post('/api/auth/logout', { refreshToken })
    } finally {
      setAccessToken(null)
      localStorage.removeItem('refreshToken')
    }
  },

  async getMe(): Promise<User> {
    const { data } = await axios.get<User>('/api/auth/me')
    return data
  },

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) throw new Error('No refresh token')
    const { data } = await axios.post<TokenResponse>('/api/auth/refresh', { refreshToken })
    setAccessToken(data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    return data.accessToken
  },
}
