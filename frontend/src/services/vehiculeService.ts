import http from './httpClient'
import type {
  VehiculeResponse,
  VehiculeHistorique,
  VehiculeSearchResult,
  CreateVehiculeDto,
  OffreEntretien,
  ClientResponse,
  ClientSearchResult,
  CreateClientDto,
} from '@/types/crm'
import type { PagedResult } from '@/types/stock'

// ── Véhicules ─────────────────────────────────────────────────────────────────
export const vehiculeService = {
  getList: (params?: {
    search?: string
    marque?: string
    carburant?: string
    clientId?: string
    avecEntretienDu?: boolean
    page?: number
    pageSize?: number
  }) =>
    http
      .get<{ items: VehiculeResponse[]; total: number; page: number; pageSize: number }>(
        '/vehicules',
        { params }
      )
      .then(r => r.data),

  search: (q: string) =>
    http.get<VehiculeSearchResult[]>('/vehicules/search', { params: { q } }).then(r => r.data),

  getById: (id: string) =>
    http.get<VehiculeResponse>(`/vehicules/${id}`).then(r => r.data),

  getHistorique: (id: string) =>
    http.get<VehiculeHistorique>(`/vehicules/${id}/historique`).then(r => r.data),

  getProchainEntretien: (id: string) =>
    http.get<OffreEntretien[]>(`/vehicules/${id}/prochain-entretien`).then(r => r.data),

  create: (dto: CreateVehiculeDto) =>
    http.post<VehiculeResponse>('/vehicules', dto).then(r => r.data),

  update: (id: string, dto: Partial<CreateVehiculeDto>) =>
    http.put<VehiculeResponse>(`/vehicules/${id}`, dto).then(r => r.data),

  majKilométrage: (id: string, km: number) =>
    http.patch(`/vehicules/${id}/kilometrage`, { km }).then(r => r.data),
}

// ── Clients ───────────────────────────────────────────────────────────────────
export const clientService = {
  getList: (params?: {
    search?: string
    type?: string
    wilaya?: string
    page?: number
    pageSize?: number
  }) =>
    http
      .get<{ items: ClientResponse[]; total: number; page: number; pageSize: number }>(
        '/clients',
        { params }
      )
      .then(r => r.data),

  search: (q: string) =>
    http.get<ClientSearchResult[]>('/clients/search', { params: { q } }).then(r => r.data),

  getById: (id: string) =>
    http.get<ClientResponse>(`/clients/${id}`).then(r => r.data),

  getVehicules: (id: string) =>
    http.get<VehiculeResponse[]>(`/clients/${id}/vehicules`).then(r => r.data),

  create: (dto: CreateClientDto) =>
    http.post<ClientResponse>('/clients', dto).then(r => r.data),

  update: (id: string, dto: Partial<CreateClientDto>) =>
    http.put<ClientResponse>(`/clients/${id}`, dto).then(r => r.data),

  delete: (id: string) => http.delete(`/clients/${id}`),
}
