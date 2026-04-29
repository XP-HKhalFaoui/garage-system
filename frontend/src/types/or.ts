export type ORStatut =
  | 'EnAttente'
  | 'EnCours'
  | 'Suspendu'
  | 'TerminéTechnicien'
  | 'Livré'
  | 'Annulé'

export type ORPriorité = 'Normal' | 'Urgent'

export type TypeIntervention =
  | 'Vidange' | 'Révision' | 'Diagnostic' | 'Freinage'
  | 'Distribution' | 'Climatisation' | 'Électrique' | 'Carrosserie' | 'Autre'

export type LigneORType = 'Pièce' | 'MO'

export interface VehiculeInfo {
  id: string
  immatriculation: string
  marque: string
  modele: string
  km: number
}

export interface ClientInfo {
  id: string
  nom: string
  téléphone: string
}

export interface TechnicienInfo {
  id: string
  nom: string
  prénom: string
}

export interface ORSummary {
  id: string
  numéro: string
  statut: ORStatut
  priorité: ORPriorité
  heureOuverture: string
  vehicule: VehiculeInfo
  client: ClientInfo
  technicien: TechnicienInfo | null
  nbLignes: number
  montantEstimé: number
}

export interface StatsToday {
  total: number
  enAttente: number
  enCours: number
  terminés: number
  caTotalHT: number
}

export interface LigneOR {
  id: string
  type: LigneORType
  articleId: string | null
  articleRéférence: string | null
  description: string
  quantité: number
  prixUnitaire: number
  totalHT: number
}

export interface HistoriqueStatut {
  id: string
  statutAvant: ORStatut
  statutAprès: ORStatut
  commentaire: string | null
  timestamp: string
}

export interface ORDetail {
  id: string
  numéro: string
  statut: ORStatut
  priorité: ORPriorité
  typeIntervention: TypeIntervention
  dateOuverture: string
  dateFermeture: string | null
  heureDebut: string | null
  diagnostic: string | null
  montantTotal: number
  factureId: string | null
  vehicule: VehiculeInfo
  client: ClientInfo
  technicien: TechnicienInfo | null
  lignes: LigneOR[]
  historique: HistoriqueStatut[]
}
