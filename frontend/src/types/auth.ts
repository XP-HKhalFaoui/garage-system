export interface User {
  userId: string
  email: string
  roles: string[]
}

export interface TokenResponse {
  accessToken: string
  expiresIn: number
  refreshToken: string
}

export type UserRole = 'Admin' | 'Technicien' | 'Caissier' | 'RH'
