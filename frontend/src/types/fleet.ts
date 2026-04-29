export type TypeTarif = 'TarifNormal' | 'PrixRéduit' | 'Forfait'
export type FactureGroupéeStatut = 'Émise' | 'Soldée' | 'Annulée'

export interface SociétéSummary {
  id: string
  raisonSociale: string
  nrc: string
  nif: string
  téléphoneRespAchats: string
  emailFacturation: string
  isActif: boolean
  nbVéhiculesActifs: number
  tarifActif: TypeTarif | null
}

export interface SociétéDetail {
  id: string
  raisonSociale: string
  nrc: string
  nif: string
  adresseSiège: string
  téléphoneRespAchats: string
  emailFacturation: string
  isActif: boolean
  contratActif: Contrat | null
  nbVéhiculesActifs: number
}

export interface Contrat {
  id: string
  dateDébut: string
  dateFin: string | null
  typeTarif: TypeTarif
  plafondMensuelDZD: number | null
  remisePourcentage: number | null
  conditionsParticulières: string | null
  isActif: boolean
  dateCreation: string
}

export interface VéhiculeSociété {
  id: string
  véhiculeId: string
  immatriculation: string
  marque: string
  modele: string
  année: number
  numéroFlotte: string | null
  conducteurHabituel: string | null
  dateAffectation: string
  nbOR: number
  montantMois: number
}

export interface ORFlotte {
  id: string
  numéro: string
  immatriculation: string
  numéroFlotte: string | null
  dateOuverture: string
  typeIntervention: string
  statut: string
  montantHT: number
  déjàFacturé: boolean
}

export interface FactureGroupéeSummary {
  id: string
  numéro: string
  périodeMois: number
  périodeAnnée: number
  totalTTC: number
  dépassementPlafond: boolean
  statut: string
  dateFacture: string
  nbOR: number
}

export interface LigneFactureGroupée {
  id: string
  orId: string
  numéro: string
  immatriculation: string
  numéroFlotte: string | null
  typeIntervention: string
  dateOR: string
  montantHT: number
  tauxTVA: number
  totalTTC: number
  tarifAppliqué: boolean
}

export interface FactureGroupéeDetail {
  id: string
  numéro: string
  sociétéRaisonSociale: string
  sociétéNIF: string
  sociétéAdresse: string
  périodeMois: number
  périodeAnnée: number
  sousTotalHT: number
  montantTVA: number
  totalTTC: number
  dépassementPlafond: boolean
  statut: string
  dateFacture: string
  lignes: LigneFactureGroupée[]
}

export interface PreviewFactureGroupée {
  nbOR: number
  sousTotalHT: number
  montantTVA: number
  totalTTC: number
  dépassementPlafond: boolean
  plafondMensuel: number | null
  oRsÉligibles: ORFlotte[]
}
