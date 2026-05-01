import httpClient from './httpClient'
import type { Article, PagedResult, CategorieStats, AlerteStock, CreateArticleDto, ArticleCategorie } from '@/types/stock'

interface GetArticlesParams {
  search?: string
  categorie?: ArticleCategorie
  stockBas?: boolean
  page?: number
  pageSize?: number
  sort?: string
}

export const stockService = {
  getArticles: (params: GetArticlesParams = {}) =>
    httpClient.get<PagedResult<Article>>('/articles', { params }).then(r => r.data),

  getById: (id: string) =>
    httpClient.get<Article>(`/articles/${id}`).then(r => r.data),

  create: (dto: CreateArticleDto) =>
    httpClient.post<Article>('/articles', dto).then(r => r.data),

  update: (id: string, dto: Partial<CreateArticleDto>) =>
    httpClient.put<Article>(`/articles/${id}`, dto).then(r => r.data),

  ajusterStock: (id: string, quantité: number, type: string, motif: string) =>
    httpClient.patch(`/articles/${id}/stock`, { quantité, type, motif }),

  delete: (id: string) =>
    httpClient.delete(`/articles/${id}`),

  getCategories: () =>
    httpClient.get<CategorieStats[]>('/articles/categories').then(r => r.data),

  search: (q: string) =>
    httpClient.get<{ id: string; référence: string; désignation: string; stockActuel: number; prixVente: number }[]>(
      '/articles/search', { params: { q } }
    ).then(r => r.data),

  getAlertesActives: () =>
    httpClient.get<AlerteStock[]>('/alertes/stock-bas').then(r => r.data),

  résoudreAlerte: (id: string, commentaire: string) =>
    httpClient.patch(`/alertes/${id}/resoudre`, { commentaire }),

  downloadTemplateCsv: () =>
    httpClient.get('/articles/template-csv', { responseType: 'blob' }).then(r => r.data as Blob),

  importCsv: (file: File, onProgress?: (pct: number) => void) =>
    httpClient.post<ImportCsvResult>('/articles/import-csv', (() => {
      const fd = new FormData(); fd.append('file', file); return fd
    })(), {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress && e.total && onProgress(Math.round(e.loaded * 100 / e.total)),
    }).then(r => r.data),
}

export interface ImportCsvResult {
  total: number
  créés: number
  misÀJour: number
  duréeMs: number
  erreurs: { ligne: number; référence: string; message: string }[]
}
