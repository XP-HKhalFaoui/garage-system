import api from './httpClient'
import type {
  EmployeResponse, CreateEmployeDto, PointageResponse,
  PointageMensuel, BulletinPaie, CongeResponse, SoldeConge, PrésentAujourdHui
} from '../types/rh'

export const employeService = {
  getList: (params?: { poste?: string; actif?: boolean; page?: number; pageSize?: number }) =>
    api.get<{ items: EmployeResponse[]; total: number }>('/employes', { params }).then(r => r.data),
  getById: (id: string) => api.get<EmployeResponse>(`/employes/${id}`).then(r => r.data),
  create: (dto: CreateEmployeDto) => api.post<EmployeResponse>('/employes', dto).then(r => r.data),
  update: (id: string, dto: Partial<CreateEmployeDto>) => api.put<EmployeResponse>(`/employes/${id}`, dto).then(r => r.data),
  desactiver: (id: string) => api.patch(`/employes/${id}/desactiver`),
}

export const pointageService = {
  entree: (employeId?: string) => api.post<PointageResponse>('/pointage/entree', { employeId }).then(r => r.data),
  sortie: (employeId?: string) => api.post<PointageResponse>('/pointage/sortie', { employeId }).then(r => r.data),
  getList: (employeId?: string, mois?: string) =>
    api.get<PointageResponse[]>('/pointage', { params: { employeId, mois } }).then(r => r.data),
  getAujourdHui: () => api.get<PrésentAujourdHui>('/pointage/aujourd-hui').then(r => r.data),
  getMensuel: (employeId: string, annee: number, mois: number) =>
    api.get<PointageMensuel>(`/pointage/mensuel/${employeId}/${annee}/${mois}`).then(r => r.data),
}

export const paieService = {
  calculer: (employeId: string, mois: string) =>
    api.post<BulletinPaie>('/paie/calculer', { employeId, mois }).then(r => r.data),
  getBulletins: (employeId: string) =>
    api.get<BulletinPaie[]>(`/paie/${employeId}`).then(r => r.data),
  marquerPaye: (id: string, datePaiement: string, modePaiement: string) =>
    api.patch<BulletinPaie>(`/paie/${id}/marquer-paye`, { datePaiement, modePaiement }).then(r => r.data),
  addPrime: (dto: { employeId: string; mois: string; type: string; montant: number; description?: string }) =>
    api.post('/paie/primes', dto).then(r => r.data),
}

export const congeService = {
  soumettre: (dto: { type: string; dateDébut: string; dateFin: string; motif: string }) =>
    api.post<CongeResponse>('/conges', dto).then(r => r.data),
  mesDemandes: () => api.get<CongeResponse[]>('/conges/mes-demandes').then(r => r.data),
  aApprouver: () => api.get<CongeResponse[]>('/conges/a-approuver').then(r => r.data),
  approuver: (id: string, commentaire?: string) =>
    api.patch<CongeResponse>(`/conges/${id}/approuver`, { commentaire }).then(r => r.data),
  refuser: (id: string, commentaire?: string) =>
    api.patch<CongeResponse>(`/conges/${id}/refuser`, { commentaire }).then(r => r.data),
  getSolde: (employeId: string) =>
    api.get<SoldeConge>(`/conges/solde/${employeId}`).then(r => r.data),
}
