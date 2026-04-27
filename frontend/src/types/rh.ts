export type TypePoste = 'Technicien' | 'Caissier' | 'RH' | 'Admin' | 'Receptionniste'
export type TypeContrat = 'CDI' | 'CDD' | 'Temporaire'
export type TypeJour = 'Travaillé' | 'Congé' | 'Maladie' | 'Maternité' | 'Férié' | 'Weekend'
export type TypeConge = 'Annuel' | 'Maladie' | 'Maternité' | 'Événementiel' | 'SansRetenue'
export type CongeStatut = 'EnAttente' | 'Approuvé' | 'Refusé'

export interface EmployeResponse {
  id: string
  nom: string
  prénom: string
  nomComplet: string
  téléphone: string
  email: string
  adresse: string
  poste: TypePoste
  département?: string
  salaireBase?: number
  typeContrat: TypeContrat
  dateEmbauche: string
  dateFinContrat?: string
  isActif: boolean
  nbOREffectués: number
}

export interface CreateEmployeDto {
  nom: string; prénom: string; dateNaissance: string
  téléphone: string; email: string; adresse: string
  poste: TypePoste; département?: string
  salaireBase: number; typeContrat: TypeContrat
  dateEmbauche: string; dateFinContrat?: string
}

export interface PointageResponse {
  id: string; employeId: string; employeNom: string
  date: string; heureEntrée: string; heureSortie?: string
  typeJour: TypeJour; nbHeuresTravaillées: number
  nbHeuresSup: number; notes?: string
}

export interface PointageMensuel {
  employeId: string; employeNom: string; mois: string
  jours: PointageResponse[]
  totalHeures: number; heuresSup: number
  joursAbsents: number; conges: number
}

export interface BulletinPaie {
  id: string; employeId: string; employeNom: string; mois: string
  joursTravaillés: number; joursOuvrablesMois: number
  salaireBase: number; salaireBasePropratisé: number
  majHeuresSup: number; totalPrimes: number; salaireBrut: number
  cotisationCNAS: number; cotisationRetraite: number; irg: number
  totalCotisations: number; salaireNet: number
  statut: string; datePaiement?: string; modePaiement?: string
}

export interface CongeResponse {
  id: string; employeId: string; employeNom: string
  type: TypeConge; dateDébut: string; dateFin: string
  nbJours: number; motif: string; statut: CongeStatut
  dateDecision?: string; commentaireDecision?: string
}

export interface SoldeConge {
  employeId: string; année: number
  annuelTotal: number; annuelPris: number; annuelRestant: number
}

export interface PrésentAujourdHui {
  présents: { id: string; nomComplet: string; heureEntrée: string }[]
  absents:  { id: string; nomComplet: string; poste: TypePoste; isActif: boolean }[]
}
