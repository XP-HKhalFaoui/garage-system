import http from './httpClient'
import type {
  VehiculeAvecOffres,
  EnvoyerOffresDto,
  EnvoyerOffresResult,
  OffreEnvoyeeHist,
} from '@/types/crm'

export const crmService = {
  getVehiculesAvecOffres: (page = 1, pageSize = 50) =>
    http
      .get<VehiculeAvecOffres[]>('/offres/a-envoyer', { params: { page, pageSize } })
      .then(r => r.data),

  envoyer: (dto: EnvoyerOffresDto) =>
    http.post<EnvoyerOffresResult>('/offres/envoyer', dto).then(r => r.data),

  changerStatut: (id: string, statut: string) =>
    http.patch(`/offres/${id}/statut`, { statut }),

  getOffresVehicule: (vehiculeId: string) =>
    http.get<OffreEnvoyeeHist[]>(`/offres/vehicule/${vehiculeId}`).then(r => r.data),

  scanMaintenant: () =>
    http.post('/offres/scan-maintenant').then(r => r.data),
}
