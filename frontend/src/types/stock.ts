export type ArticleCategorie =
  | 'Filtres' | 'Huiles' | 'Freinage' | 'Transmission' | 'Suspension'
  | 'Moteur' | 'Électrique' | 'Carrosserie' | 'Accessoires' | 'Autre'

export type ArticleUnité = 'Pièce' | 'Litre' | 'Kg' | 'Mètre'

export type MouvementType =
  | 'EntréeBR' | 'SortieOR' | 'AjustementManuel' | 'Inventaire' | 'AnnulationOR'

export interface Article {
  id: string
  référence: string
  référenceOEM: string | null
  désignation: string
  catégorie: ArticleCategorie
  unité: ArticleUnité
  stockActuel: number
  stockMinimum: number
  stockMaximum: number | null
  prixAchat: number
  prixVente: number
  margeHT: number
  emplacementRayonnage: string | null
  isActif: boolean
  stockBas: boolean
  dateDernierMouvement: string | null
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface CategorieStats {
  nom: string
  count: number
}

export interface AlerteStock {
  id: string
  articleId: string
  articleRéférence: string
  articleDésignation: string
  stockActuel: number
  stockMinimum: number
  dateDetection: string
  statut: string
}

export interface CreateArticleDto {
  référence: string
  référenceOEM?: string
  désignation: string
  description?: string
  catégorie: ArticleCategorie
  marquesCompatibles?: string
  unité: ArticleUnité
  stockMinimum: number
  stockMaximum?: number
  prixAchat: number
  prixVente: number
  emplacementRayonnage?: string
  codeBarre?: string
}
