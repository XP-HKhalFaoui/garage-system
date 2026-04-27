export interface DashboardStats {
  caMoisCourant: number
  caMoisPrécédent: number
  evolutionCa: number
  nbOREnCours: number
  nbORTerminés: number
  nbClientsActifs: number
  nbArticlesSousMin: number
  nbFacturesEnRetard: number
  nbEmployésActifs: number
  nbPrésentsAujourdHui: number
}

export interface CaMensuel {
  mois: string
  ca: number
  encaissé: number
}

export interface StatsTechnicien {
  nom: string
  nbOR: number
  totalMO: number
  tauxOccupation: number
}

export interface StatsArticle {
  référence: string
  désignation: string
  nbMouvements: number
  valeurSortie: number
}
