import httpClient from './httpClient'
import type { ORStatut, ORSummary, StatsToday, LigneOR } from '@/types/or'

export const orService = {
  getToday: (params?: { statut?: ORStatut; technicienId?: string }) =>
    httpClient.get<ORSummary[]>('/ordres-reparation/today', { params }).then(r => r.data),

  getStatsToday: () =>
    httpClient.get<StatsToday>('/ordres-reparation/stats-today').then(r => r.data),

  getById: (id: string) =>
    httpClient.get(`/ordres-reparation/${id}`).then(r => r.data),

  create: (dto: {
    vehiculeId: string
    technicienId?: string
    kilométrageActuel: number
    typeIntervention: string
    priorité: string
    diagnostic?: string
  }) => httpClient.post('/ordres-reparation', dto).then(r => r.data),

  changerStatut: (id: string, nouveauStatut: ORStatut, commentaire?: string) =>
    httpClient.patch(`/ordres-reparation/${id}/statut`, { nouveauStatut, commentaire }),

  assigner: (id: string, technicienId: string) =>
    httpClient.patch(`/ordres-reparation/${id}/assigner`, { technicienId }),

  getLignes: (id: string) =>
    httpClient.get<LigneOR[]>(`/ordres-reparation/${id}/lignes`).then(r => r.data),

  addLigne: (id: string, dto: {
    type: string
    articleId?: string
    description: string
    quantité: number
    prixUnitaire?: number
  }) => httpClient.post(`/ordres-reparation/${id}/lignes`, dto).then(r => r.data),

  removeLigne: (orId: string, ligneId: string) =>
    httpClient.delete(`/ordres-reparation/${orId}/lignes/${ligneId}`),
}
