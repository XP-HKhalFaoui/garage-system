import http from './httpClient'
import type {
  DevisResponse,
  DevisStatut,
  FactureResponse,
  FactureSummary,
  FactureStatut,
  StatsBilling,
  RecapCaisse,
  EnregistrerPaiementDto,
  Paiement,
} from '@/types/billing'

// ── Devis ─────────────────────────────────────────────────────────────────────
export const devisService = {
  getList: (params?: { orId?: string; clientId?: string; statut?: DevisStatut; page?: number; pageSize?: number }) =>
    http.get<DevisResponse[]>('/devis', { params }).then(r => r.data),

  getById: (id: string) =>
    http.get<DevisResponse>(`/devis/${id}`).then(r => r.data),

  createFromOR: (orId: string) =>
    http.post<DevisResponse>(`/devis/depuis-or/${orId}`).then(r => r.data),

  valider: (id: string) =>
    http.patch<DevisResponse>(`/devis/${id}/valider`).then(r => r.data),

  envoyer: (id: string) =>
    http.patch<DevisResponse>(`/devis/${id}/envoyer`).then(r => r.data),

  accepter: (id: string) =>
    http.patch<DevisResponse>(`/devis/${id}/accepter`).then(r => r.data),

  refuser: (id: string, motif: string) =>
    http.patch<DevisResponse>(`/devis/${id}/refuser`, { motif }).then(r => r.data),

  getPdfUrl: (id: string) => `/api/devis/${id}/pdf`,
}

// ── Factures ──────────────────────────────────────────────────────────────────
export const factureService = {
  getList: (params?: {
    statut?: FactureStatut
    clientId?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    pageSize?: number
  }) =>
    http
      .get<{ items: FactureSummary[]; total: number; page: number; pageSize: number }>(
        '/factures', { params }
      )
      .then(r => r.data),

  getStats: () =>
    http.get<StatsBilling>('/factures/stats').then(r => r.data),

  getById: (id: string) =>
    http.get<FactureResponse>(`/factures/${id}`).then(r => r.data),

  createFromDevis: (devisId: string) =>
    http.post<FactureResponse>(`/factures/depuis-devis/${devisId}`).then(r => r.data),

  enregistrerPaiement: (id: string, dto: EnregistrerPaiementDto) =>
    http.post<FactureResponse>(`/factures/${id}/paiements`, dto).then(r => r.data),

  getPaiements: (id: string) =>
    http.get<Paiement[]>(`/factures/${id}/paiements`).then(r => r.data),

  annuler: (id: string, motif: string) =>
    http.patch(`/factures/${id}/annuler`, { motif }),

  getPdfUrl: (id: string) => `/api/factures/${id}/pdf`,
}

// ── Caisse ────────────────────────────────────────────────────────────────────
export const caisseService = {
  getRecapJour: () =>
    http.get<RecapCaisse>('/caisse/recap-jour').then(r => r.data),
}
