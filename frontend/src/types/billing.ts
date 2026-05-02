// ── Devis ─────────────────────────────────────────────────────────────────────
export type DevisStatut =
  | 'Brouillon' | 'Validé' | 'EnvoyéClient' | 'Accepté' | 'Refusé' | 'Expiré'

export interface LigneDevis {
  id: string
  description: string
  quantité: number
  prixUnitaireHT: number
  tauxTVA: number
  totalHT: number
  totalTTC: number
}

export interface DevisResponse {
  id: string
  numéro: string
  statut: DevisStatut
  dateCreation: string
  dateExpiration: string
  dateEnvoi?: string
  orId: string
  clientId: string
  clientNom: string
  sousTotalHT: number
  montantTVA: number
  totalTTC: number
  lignes: LigneDevis[]
}

// ── Factures ──────────────────────────────────────────────────────────────────
export type FactureStatut =
  | 'Emise' | 'PartiellementPayee' | 'Soldee' | 'Annulee'

export type ModePaiement = 'Espèces' | 'Virement' | 'Chèque' | 'CB'

export interface LigneFacture {
  id: string
  description: string
  quantité: number
  prixUnitaireHT: number
  tauxTVA: number
  totalHT: number
  totalTTC: number
}

export interface Paiement {
  id: string
  montant: number
  modePaiement: ModePaiement
  référence?: string
  datePaiement: string
}

export interface FactureResponse {
  id: string
  numéro: string
  statut: FactureStatut
  dateFacture: string
  dateEchéance: string
  dateSolde?: string
  clientNom: string
  clientAdresse: string
  clientNIF?: string
  sousTotalHT: number
  montantTVA: number
  totalTTC: number
  montantDéjàPayé: number
  restantDû: number
  lignes: LigneFacture[]
  paiements: Paiement[]
}

export interface FactureSummary {
  id: string
  numéro: string
  statut: FactureStatut
  dateFacture: string
  dateEchéance: string
  clientNom: string
  immatriculationVehicule?: string
  totalTTC: number
  montantDéjàPayé: number
  restantDû: number
  enRetard: boolean
}

export interface StatsBilling {
  caMoisTTC: number
  encaissé: number
  resteAEncaisser: number
  nbEnRetard: number
}

export interface RecapCaisse {
  totalEspèces: number
  totalVirement: number
  totalChèque: number
  totalCB: number
  totalGeneral: number
  nbFacturesSoldées: number
}

export interface EnregistrerPaiementDto {
  montant: number
  modePaiement: ModePaiement
  référence?: string
  datePaiement: string
}
