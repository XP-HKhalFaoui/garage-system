abstract final class Endpoints {
  // Auth
  static const login = '/api/auth/login';
  static const refresh = '/api/auth/refresh';
  static const me = '/api/auth/me';
  static const logout = '/api/auth/logout';

  // Ordres de réparation
  static const ordresReparation = '/api/ordres-reparation';
  static String orDetail(String id) => '/api/ordres-reparation/$id';
  static String orStatut(String id) => '/api/ordres-reparation/$id/statut';
  static String orAssigner(String id) => '/api/ordres-reparation/$id/assigner';
  static String orLignes(String id) => '/api/ordres-reparation/$id/lignes';
  static String orLigne(String orId, String ligneId) =>
      '/api/ordres-reparation/$orId/lignes/$ligneId';
  static String orPhotos(String id) => '/api/or/$id/photos';
  static String orPhoto(String orId, String photoId) =>
      '/api/or/$orId/photos/$photoId';
  static const orToday = '/api/ordres-reparation/today';

  // Factures
  static const factures = '/api/factures';
  static String factureDetail(String id) => '/api/factures/$id';
  static String facturePaiements(String id) => '/api/factures/$id/paiements';
  static String facturePdf(String id) => '/api/factures/$id/pdf';

  // Clients
  static const clients = '/api/clients';
  static String clientDetail(String id) => '/api/clients/$id';

  // Véhicules
  static const vehicules = '/api/vehicules';
  static String vehiculeDetail(String id) => '/api/vehicules/$id';

  // Articles / Stock
  static const articles = '/api/articles';
  static const articlesSearch = '/api/articles/search';
  static String articleDetail(String id) => '/api/articles/$id';
  static String articleMouvements(String id) =>
      '/api/articles/$id/mouvements';
  static String articleAjustement(String id) =>
      '/api/articles/$id/ajustement';

  // Employés
  static const employes = '/api/employes';

  // Stats & alertes
  static const statsRecapJournee = '/api/stats/recap-journee';
  static const statsCaSemaine    = '/api/stats/ca-semaine';
  static const alertesCount = '/api/alertes/count';
  static const alertes = '/api/alertes';

  // SignalR hub
  static const hubOrdres = '/hubs/ordres';
}
