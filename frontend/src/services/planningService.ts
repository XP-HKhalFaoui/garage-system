import httpClient from './httpClient'
import type { ORStatut, ORPriorité, TypeIntervention } from '@/types/or'

export interface PlanningOR {
  id: string
  numéro: string
  statut: ORStatut
  priorité: ORPriorité
  typeIntervention: TypeIntervention
  heureDebut: string
  heureFin: string | null
  technicienId: string | null
  technicienNom: string | null
  immatriculation: string
  marque: string
  modele: string
}

export interface PlanningResponse {
  planifiés: PlanningOR[]
  nonPlanifiés: PlanningOR[]
}

export const planningService = {
  getWeek: (debut: Date, fin: Date) =>
    httpClient.get<PlanningResponse>('/ordres-reparation/planning', {
      params: {
        debut: debut.toISOString(),
        fin: fin.toISOString(),
      },
    }).then(r => r.data),

  replanifier: (id: string, heureDebut: Date, heureFin: Date | null, technicienId: string | null) =>
    httpClient.patch(`/ordres-reparation/${id}/replanifier`, {
      heureDebut: heureDebut.toISOString(),
      heureFin: heureFin?.toISOString() ?? null,
      technicienId,
    }),
}
