// ── Véhicules ─────────────────────────────────────────────────────────────────
export type Carburant = 'Essence' | 'Diesel' | 'GPL' | 'Hybride' | 'Électrique'
export type Transmission = 'Manuelle' | 'Automatique' | 'SemiAutomatique'

export interface VehiculeResponse {
  id: string
  clientId: string
  clientNom: string
  immatriculation: string
  vin?: string
  marque: string
  modele: string
  version?: string
  annee: number
  carburant: Carburant
  transmission: Transmission
  kilométrageActuel: number
  dateDernièreVisite?: string
  isActif: boolean
  nbOR: number
  offresDues?: OffreEntretien[]
}

export interface VehiculeSearchResult {
  id: string
  immatriculation: string
  marque: string
  modele: string
  annee: number
  clientNom: string
  clientTéléphone: string
}

export interface CreateVehiculeDto {
  clientId: string
  immatriculation: string
  vin?: string
  marque: string
  modele: string
  version?: string
  annee: number
  carburant: Carburant
  transmission: Transmission
  cylindrée?: number
  couleur?: string
  kilométrageActuel: number
}

// ── Historique véhicule ───────────────────────────────────────────────────────
export interface VehiculeHistorique {
  vehicule: VehiculeDetail
  client: ClientDetail
  statistiques: VehiculeStatistiques
  interventions: InterventionHistorique[]
  offresEnvoyees: OffreEnvoyeeHist[]
}

export interface VehiculeDetail {
  id: string
  immatriculation: string
  vin?: string
  marque: string
  modele: string
  version?: string
  annee: number
  carburant: Carburant
  transmission: Transmission
  kilométrageActuel: number
  isActif: boolean
}

export interface ClientDetail {
  id: string
  nom: string
  prénom?: string
  raisonSociale?: string
  téléphone: string
  email?: string
  wilaya: string
}

export interface VehiculeStatistiques {
  nbInterventions: number
  montantTotalHT: number
  premièreVisite?: string
  dernièreVisite?: string
  kmParcourus: number
}

export interface InterventionHistorique {
  orId: string
  numéro: string
  date: string
  kmAuMoment?: number
  typeIntervention: string
  technicienNom?: string
  statut: string
  montantHT: number
  pièces: PièceHistorique[]
  mainOeuvre: MOHistorique[]
}

export interface PièceHistorique {
  référence?: string
  description: string
  quantité: number
  puHT: number
  totalHT: number
}

export interface MOHistorique {
  description: string
  quantité: number
  puHT: number
  totalHT: number
}

export interface OffreEnvoyeeHist {
  id: string
  types: string[]
  canal: string
  dateEnvoi: string
  statut: string
}

// ── Offres entretien ──────────────────────────────────────────────────────────
export type NiveauUrgence = 'Immédiat' | 'Bientôt' | 'Préventif'

export interface OffreEntretien {
  type: string
  urgence: NiveauUrgence
  kmRestants?: number
  joursRestants?: number
  messageSuggéré: string
}

export interface VehiculeAvecOffres {
  vehiculeId: string
  immatriculation: string
  marque: string
  modele: string
  client: { id: string; nom: string; téléphone: string; email?: string }
  offres: OffreEntretien[]
  dernierEnvoi?: string
}

export interface EnvoyerOffresDto {
  vehiculeIds: string[]
  canal: 'SMS' | 'Email' | 'LesDeux'
}

export interface EnvoyerOffresResult {
  véhiculesTraités: number
  envoyées: number
  echecs: { vehiculeId: string; raison: string }[]
}

// ── Clients ───────────────────────────────────────────────────────────────────
export type ClientType = 'Particulier' | 'Société'

export interface ClientResponse {
  id: string
  type: ClientType
  nom: string
  prénom?: string
  raisonSociale?: string
  téléphone: string
  téléphoneAlt?: string
  email?: string
  adresse: string
  wilaya: string
  isActif: boolean
  dateCreation: string
  nbVéhicules: number
  nbOR: number
  caTotalHT: number
  dernièreVisite?: string
}

export interface ClientSearchResult {
  id: string
  displayName: string
  téléphone: string
  nbVéhicules: number
}

export interface CreateClientDto {
  type: ClientType
  nom: string
  prénom?: string
  raisonSociale?: string
  téléphone: string
  téléphoneAlt?: string
  email?: string
  adresse: string
  wilaya: string
  dateNaissance?: string
  nrc?: string
  nif?: string
}

// ── Offres entretien ──────────────────────────────────────────────────────────
export interface OffreEntretienDto {
  type: string
  urgence: string
  kmRestants?: number
  joursRestants?: number
  messageSuggéré: string
}

export interface ClientOffreDto {
  id: string
  nom: string
  téléphone: string
  email?: string
}

export interface VehiculeAvecOffresDto {
  vehiculeId: string
  immatriculation: string
  marque: string
  modele: string
  client: ClientOffreDto
  offres: OffreEntretienDto[]
  dernierEnvoi?: string
}
