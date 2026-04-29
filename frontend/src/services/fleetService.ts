import http from './httpClient'
import type {
  SociétéSummary, SociétéDetail, Contrat,
  VéhiculeSociété, ORFlotte,
  FactureGroupéeSummary, FactureGroupéeDetail, PreviewFactureGroupée,
} from '@/types/fleet'

export const fleetService = {
  // ── Sociétés ──────────────────────────────────────────────────────────────
  getSociétés: (actif?: boolean) =>
    http.get<SociétéSummary[]>('/societes', { params: actif !== undefined ? { actif } : {} })
      .then(r => r.data),

  getSociété: (id: string) =>
    http.get<SociétéDetail>(`/societes/${id}`).then(r => r.data),

  createSociété: (dto: {
    raisonSociale: string; nrc: string; nif: string
    adresseSiège: string; téléphoneRespAchats: string; emailFacturation: string
  }) => http.post<SociétéDetail>('/societes', dto).then(r => r.data),

  updateSociété: (id: string, dto: {
    raisonSociale: string; nrc: string; nif: string
    adresseSiège: string; téléphoneRespAchats: string; emailFacturation: string
  }) => http.put<SociétéDetail>(`/societes/${id}`, dto).then(r => r.data),

  désactiverSociété: (id: string) =>
    http.patch(`/societes/${id}/desactiver`),

  // ── Contrats ──────────────────────────────────────────────────────────────
  getContrats: (sociétéId: string) =>
    http.get<Contrat[]>(`/societes/${sociétéId}/contrats`).then(r => r.data),

  getContratActif: (sociétéId: string) =>
    http.get<Contrat>(`/societes/${sociétéId}/contrat-actif`).then(r => r.data),

  créerContrat: (sociétéId: string, dto: {
    dateDébut: string; dateFin?: string; typeTarif: string
    plafondMensuelDZD?: number; remisePourcentage?: number; conditionsParticulières?: string
  }) => http.post<Contrat>(`/societes/${sociétéId}/contrats`, dto).then(r => r.data),

  // ── Flotte ────────────────────────────────────────────────────────────────
  getFlotte: (sociétéId: string) =>
    http.get<VéhiculeSociété[]>(`/societes/${sociétéId}/flotte`).then(r => r.data),

  affecterVéhicule: (sociétéId: string, dto: {
    véhiculeId?: string; immatriculation?: string; marque?: string
    modele?: string; année?: number; numéroFlotte?: string; conducteurHabituel?: string
  }) => http.post<VéhiculeSociété>(`/societes/${sociétéId}/flotte`, dto).then(r => r.data),

  retirerVéhicule: (sociétéId: string, véhiculeId: string) =>
    http.delete(`/societes/${sociétéId}/flotte/${véhiculeId}`),

  getORDuMois: (sociétéId: string, mois: number, annee: number) =>
    http.get<ORFlotte[]>(`/societes/${sociétéId}/or-du-mois`, { params: { mois, annee } })
      .then(r => r.data),

  // ── Facturation groupée ───────────────────────────────────────────────────
  previewFacture: (sociétéId: string, mois: number, annee: number) =>
    http.get<PreviewFactureGroupée>(`/societes/${sociétéId}/facture-mensuelle/preview`, {
      params: { mois, annee },
    }).then(r => r.data),

  créerFactureMensuelle: (sociétéId: string, dto: { mois: number; année: number; orIds?: string[] }) =>
    http.post<FactureGroupéeDetail>(`/societes/${sociétéId}/facture-mensuelle`, dto).then(r => r.data),

  getHistoriqueFactures: (sociétéId: string, page = 1, pageSize = 20) =>
    http.get<FactureGroupéeSummary[]>(`/societes/${sociétéId}/historique-factures`, {
      params: { page, pageSize },
    }).then(r => r.data),

  getFactureGroupéeDetail: (factureId: string) =>
    http.get<FactureGroupéeDetail>(`/societes/factures-groupees/${factureId}`).then(r => r.data),
}
