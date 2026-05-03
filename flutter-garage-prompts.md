# Flutter Garage App — Prompts de développement
> Stack : **Flutter 3.x** | **Dart** | **API ASP.NET Core 8** (existante)
> Rôles : **Admin** (caisse, facturation, clients, stock) | **Technicien** (OR, pièces, photos)

---

## CLAUDE.md — Contexte projet Flutter

```markdown
# Projet : Garage System — Application Mobile Flutter

## Stack
- Mobile  : Flutter 3.x, Dart 3.x
- State   : Riverpod (riverpod + hooks_riverpod + flutter_hooks)
- API     : http + dio, API ASP.NET Core 8 existante (REST + SignalR)
- Auth    : JWT (access token en mémoire, refresh token en FlutterSecureStorage)
- Local   : drift (SQLite) pour le cache offline
- UI      : Material 3 + thème custom garage
- Autres  : image_picker, mobile_scanner (barcode), flutter_local_notifications, signalr_netcore

## Architecture
- /lib
  /core          → auth, api_client, router, theme, utils
  /features
    /auth        → login screen
    /admin       → caisse, facturation, clients, stock, dashboard
    /technicien  → mes_or, detail_or, consommer_pieces, photos
  /shared        → widgets partagés, models, providers

## Conventions
- Nommage snake_case pour les fichiers, PascalCase pour les classes
- Un fichier par widget/page
- Providers Riverpod dans /providers/ de chaque feature
- Les modèles correspondent aux DTOs de l'API (mêmes noms de champs)
- Gestion d'erreur centralisée via AppException
- L'API retourne Bearer JWT — toujours injecter via DioInterceptor
```

---

## Module 1 — Core & Auth

### 01-flutter-setup.txt
```
Tu es un expert Flutter 3.x et Dart 3. Crée la structure de base d'une application Flutter pour un système de gestion de garage.

Structure des dossiers à créer :
lib/
  core/
    api/           → api_client.dart (Dio + interceptors), endpoints.dart
    auth/          → auth_service.dart, token_storage.dart
    router/        → app_router.dart (GoRouter avec guards par rôle)
    theme/         → app_theme.dart (Material 3, couleurs garage)
    errors/        → app_exception.dart, error_handler.dart
    utils/         → date_formatter.dart, currency_formatter.dart (DZD)
  features/
    auth/          → login/
    admin/         → dashboard/, facturation/, clients/, stock/, file_attente/
    technicien/    → mes_or/, detail_or/, pieces/, photos/
  shared/
    models/        → or.dart, client.dart, vehicule.dart, article.dart, facture.dart
    widgets/       → loading_widget.dart, error_widget.dart, empty_state.dart
    providers/     → auth_provider.dart

pubspec.yaml avec dépendances :
- flutter_riverpod, hooks_riverpod, flutter_hooks
- dio, pretty_dio_logger
- go_router
- flutter_secure_storage
- drift + sqlite3_flutter_libs
- image_picker, camera
- mobile_scanner
- flutter_local_notifications
- signalr_netcore
- intl
- cached_network_image
- lottie (pour les animations de chargement)
```

### 02-flutter-auth-service.txt
```
Tu es un expert Flutter + Riverpod. Implémente le service d'authentification JWT.

Fichier : lib/core/auth/auth_service.dart

AuthService (classe injectable via Riverpod) :
- login(String email, String password) → Future<AuthResult>
  POST /api/auth/login, stocke accessToken en mémoire (variable privée), refreshToken dans FlutterSecureStorage
- logout() → supprime les tokens, redirige vers /login
- refreshIfNeeded() → vérifie expiration du JWT (decode le payload base64), appelle /api/auth/refresh si < 2 min restantes
- getCurrentUser() → GET /api/auth/me → UserModel { id, email, roles, employeId? }

Fichier : lib/core/auth/token_storage.dart
- Utilise flutter_secure_storage
- saveRefreshToken(String token), getRefreshToken(), deleteAll()

Fichier : lib/core/api/auth_interceptor.dart (Dio interceptor)
- onRequest : ajoute Authorization: Bearer {accessToken}
- onError : si 401, tente refreshIfNeeded(), retry la requête originale, sinon logout

Fichier : lib/core/auth/auth_provider.dart (Riverpod)
- authStateProvider : StateNotifierProvider<AuthNotifier, AuthState>
- AuthState : { isAuthenticated, user?, isLoading, error? }
- AuthNotifier : wraps AuthService, expose login/logout
```

### 03-flutter-router.txt
```
Tu es un expert Flutter GoRouter. Crée le système de navigation par rôle.

Fichier : lib/core/router/app_router.dart

Routes publiques : /login
Routes Admin (rôle "Admin" ou "Caissier") :
  /admin/dashboard
  /admin/facturation
  /admin/facturation/:id
  /admin/clients
  /admin/clients/:id
  /admin/vehicules/:id
  /admin/stock
  /admin/file-attente
Routes Technicien (rôle "Technicien") :
  /technicien/mes-or
  /technicien/or/:id
  /technicien/or/:id/pieces
  /technicien/or/:id/photos

Guard redirect :
- Si non authentifié → /login
- Si authentifié :
  - route /admin/** + rôle Technicien → /technicien/mes-or
  - route /technicien/** + rôle Admin/Caissier → /admin/dashboard
  - / → redirect selon le rôle

Après login réussi : rediriger vers la page home selon le rôle
  Admin/Caissier → /admin/dashboard
  Technicien → /technicien/mes-or

Shell route pour la bottom navigation bar (différente selon le rôle).
```

### 04-flutter-theme.txt
```
Tu es un expert Flutter Material 3. Crée le thème de l'application garage.

Fichier : lib/core/theme/app_theme.dart

ColorScheme.fromSeed avec seed color #1A5276 (bleu industriel garage)
ThemeData pour light et dark mode.

Définir les couleurs sémantiques :
- statusEnAttente  : Color(0xFFE67E22) orange
- statusEnCours    : Color(0xFF2980B9) bleu
- statusTermine    : Color(0xFF27AE60) vert
- statusLivre      : Color(0xFF8E44AD) violet
- urgentColor      : Color(0xFFE74C3C) rouge

TextTheme :
- displayLarge → numéros de facture (24sp, bold)
- titleMedium  → noms de clients (16sp, medium)
- bodyMedium   → descriptions OR (14sp)
- labelSmall   → badges statut (11sp, medium)

AppBarTheme : fond bleu foncé, titre blanc, elevation 0
CardTheme : elevation 1, borderRadius 12, clip antiAlias
InputDecorationTheme : outlined, borderRadius 8

Exporter : appTheme (ThemeData light), appDarkTheme (ThemeData dark)
```

### 05-flutter-api-client.txt
```
Tu es un expert Flutter Dio. Crée le client API centralisé.

Fichier : lib/core/api/api_client.dart

Classe ApiClient (Singleton via Riverpod provider) :
- baseUrl depuis const String kBaseUrl = 'http://10.0.2.2:5000' (Android emulator) ou Config.apiUrl
- Dio instance avec BaseOptions : connectTimeout 10s, receiveTimeout 30s
- Interceptors : AuthInterceptor (injecte JWT), LoggingInterceptor (dev seulement), RetryInterceptor (3 essais sur timeout)

Méthodes génériques :
- Future<T> get<T>(String path, { Map<String, dynamic>? queryParams, T Function(dynamic)? fromJson })
- Future<T> post<T>(String path, { dynamic body, T Function(dynamic)? fromJson })
- Future<T> patch<T>(String path, { dynamic body, T Function(dynamic)? fromJson })
- Future<void> delete(String path)

Gestion d'erreur centralisée : convertir DioException → AppException avec message FR
- 400 → ValidationException(erreurs)
- 401 → UnauthorizedException
- 404 → NotFoundException(ressource)
- 409 → ConflictException(message)
- 500 → ServerException

Fichier : lib/core/api/endpoints.dart
Constantes pour tous les endpoints : class Endpoints { static const login = '/api/auth/login'; ... }
```

---

## Module 2 — Admin : Dashboard & Caisse

### 06-admin-dashboard.txt
```
Tu es un expert Flutter Riverpod. Crée le dashboard principal Admin/Caissier.

Fichier : lib/features/admin/dashboard/dashboard_screen.dart

Layout Scaffold avec AppBar "Tableau de bord" + bouton notifications (badge rouge si alertes actives).

Contenu scrollable (SingleChildScrollView) :
1. Header : "Bonjour {prénom}" + date du jour (fr_DZ locale)
2. Row de 2 stat cards :
   - CA du jour (format DZD via Intl.NumberFormat('#,##0', locale:'fr'))
   - OR en cours (count live via SignalR)
3. Row de 2 stat cards :
   - Factures non soldées
   - Articles en stock bas (badge rouge si > 0)
4. Section "File d'attente" : 3 derniers OR du jour (liste condensée, tappable → /admin/file-attente)
5. Section "Alertes" : liste des alertes actives (chips colorés par type)

Provider : dashboardProvider (FutureProvider.autoDispose)
  → GET /api/stats/recap-journee + GET /api/alertes/count

Refresh : RefreshIndicator wrapping le contenu
Bottom navigation : [Dashboard, Facturation, Clients, Stock, File d'attente]
```

### 07-admin-facturation-list.txt
```
Tu es un expert Flutter. Crée la liste des factures avec filtres.

Fichier : lib/features/admin/facturation/factures_list_screen.dart

AppBar avec titre "Facturation" + bouton "Nouveau devis" (FAB ou action).

Filtres en haut (horizontal scrollable chips) :
- Toutes | Émises | Partiellement payées | Soldées | En retard

SearchBar : recherche par numéro ou nom client (debounce 400ms via Timer).

ListView.builder avec FutureProvider.family(filtre, search) :
Chaque FactureCard affiche :
- Numéro facture (bold) + date (right)
- Nom client + immatriculation
- Montant TTC (grand, coloré par statut)
- Badge statut : Émise (bleu) / Part. payée (orange) / Soldée (vert) / En retard (rouge)
- Tap → /admin/facturation/{id}

Pagination : infinite scroll avec un ScrollController, charge 20 items par page.

Pull-to-refresh pour invalider le cache du provider.
```

### 08-admin-facturation-detail.txt
```
Tu es un expert Flutter. Crée l'écran de détail d'une facture avec paiement.

Fichier : lib/features/admin/facturation/facture_detail_screen.dart

AppBar : numéro de facture + menu (•••) avec options : Télécharger PDF, Annuler

Layout scrollable :
1. Section client : nom, adresse, téléphone (avec InkWell tel:)
2. Section véhicule : immat + marque/modèle
3. Tableau des lignes (DataTable ou ListView custom) :
   Désignation | Qté | PU HT | Total HT
4. Section totaux (alignée droite) :
   Sous-total HT / TVA 19% / Total TTC (bold, grand)
5. Section paiements : liste des paiements enregistrés (chips colorés par mode)
6. Restant dû (si non soldée, en rouge)

FAB "Encaisser" visible seulement si statut != Soldée :
  → ouvre ModalBottomSheet EnregistrerPaiementSheet :
    - Montant (pré-rempli avec restant dû, TextField numérique)
    - Mode : Espèces | Virement | Chèque | CB (SegmentedButton)
    - Référence (visible si Virement ou Chèque)
    - Bouton "Valider" → POST /api/factures/{id}/paiements → refresh écran

Téléchargement PDF : GET /api/factures/{id}/pdf → save dans cache → open_file
```

### 09-admin-clients-list.txt
```
Tu es un expert Flutter. Crée la liste des clients avec recherche.

Fichier : lib/features/admin/clients/clients_list_screen.dart

SearchBar en haut (cherche nom, téléphone, immatriculation).
FAB "Nouveau client".

ListView avec ClientCard :
- Avatar circulaire avec initiales (couleur dérivée du nom)
- Nom (ou raison sociale) + badge type (Particulier / Société)
- Téléphone (InkWell → tel:)
- Nb véhicules + nb OR total (chips)
- Tap → /admin/clients/{id}

BottomSheet "Nouveau client" avec formulaire :
- Toggle Particulier / Société
- Nom + Prénom (si particulier) ou Raison Sociale
- Téléphone (TextInputType.phone, format algérien +213)
- Email (optionnel)
- Wilaya (DropdownButtonFormField avec 58 wilayas)
- Validation Zod-like : tout champ required affiché en rouge + message
- Submit → POST /api/clients → refresh liste + SnackBar "Client créé"
```

### 10-admin-client-detail.txt
```
Tu es un expert Flutter. Crée la fiche client avec liste de véhicules et historique.

Fichier : lib/features/admin/clients/client_detail_screen.dart

AppBar : nom du client + bouton éditer (pencil icon).

TabBar avec 2 onglets : [Véhicules | Historique]

Onglet Véhicules :
- Chaque VehiculeCard : immat (bold), marque/modèle, année, km, badge carburant
- Indicateur entretien dû (icon wrench orange/rouge si offre détectée)
- Tap → /admin/vehicules/{id}
- FAB "Ajouter véhicule" → BottomSheet formulaire véhicule (immat, marque, modèle, année, carburant)

Onglet Historique :
- Liste chronologique des OR (desc) : date, numéro OR, type, montant, badge statut
- Tap OR → /admin/facturation (si facture associée) ou /admin/file-attente

Header card sous l'AppBar :
- Avatar initiales grand (60px), nom, téléphone (tappable), email, wilaya
- Stat chips : X véhicules, X OR total, CA total (DZD)
```

### 11-admin-stock.txt
```
Tu es un expert Flutter. Crée l'écran de gestion du stock.

Fichier : lib/features/admin/stock/stock_screen.dart

AppBar avec badge rouge sur icône "alerte" (nb articles stock bas).
Toggle vue : Liste / Grille (IconButton).
SearchBar + filtre catégorie (DropdownButton horizontal).

Vue Liste — ArticleListTile :
- Référence + désignation (bold)
- Stock actuel vs minimum : "12 / 5" (vert si OK, orange si <150%, rouge si ≤ min)
- Prix vente DZD (right aligned)
- Swipe to reveal : "Ajuster stock" (bleu) et "Voir mouvements" (gris)
- Tap → ArticleDetailSheet (bottom sheet)

ArticleDetailSheet :
- Header : référence, désignation, catégorie
- Stat row : Stock actuel | Stock min | Prix achat | Prix vente
- Derniers mouvements (5 derniers) : date, type badge, ±quantité, stock résultant
- Bouton "Ajustement manuel" → dialog avec quantité (+ ou -) et motif
- Bouton "Bon de réception" → écran dédié

FAB "Scanner" → mobile_scanner pour scanner le code barres d'un article
  → recherche automatique et ouvre ArticleDetailSheet
```

### 12-admin-file-attente.txt
```
Tu es un expert Flutter + SignalR. Crée la vue file d'attente admin.

Fichier : lib/features/admin/file_attente/file_attente_screen.dart

AppBar : "Atelier — {date}" + compteurs par statut (chips horizontal scrollable).

TabBar : Tous | En attente | En cours | Terminés

ListView des ORAdminCard :
- Numéro OR (badge coloré par priorité) + heure ouverture (right)
- Immatriculation bold + marque/modèle
- Client : nom + téléphone (InkWell tel:)
- Technicien assigné (avatar initiales) ou chip "Non assigné" (orange)
- Timer (mis à jour toutes les secondes si statut EnCours) : HH:MM
  Couleur timer : vert <2h, orange 2-4h, rouge >4h
- Tap → BottomSheet ORAdminDetailSheet avec :
  - Diagnostic, lignes OR, montant
  - Sélecteur technicien (DropdownButton GET /api/employes?poste=Technicien)
  - Bouton "Assigner" → PATCH /api/ordres-reparation/{id}/assigner
  - Bouton "Créer facture" (visible si statut TerminéTechnicien)

SignalR : connection à /hubs/ordres, écoute OR_STATUS_CHANGED + OR_ASSIGNED
  → invalider le provider + afficher SnackBar avec l'info de l'événement

Refresh : pull-to-refresh + auto-refresh toutes les 60s en fallback.
```

---

## Module 3 — Technicien : Mes OR

### 13-tech-mes-or.txt
```
Tu es un expert Flutter + Riverpod. Crée l'écran principal du technicien.

Fichier : lib/features/technicien/mes_or/mes_or_screen.dart

AppBar : "Mes interventions — {prénom}" + icône notification (badge).

Header stats (3 cards horizontales) :
- OR assignés aujourd'hui
- En cours (avec timer live global)
- Terminés aujourd'hui

ListView des ORTechnicienCard (filtrés sur l'employé connecté) :
- Numéro OR + badge statut (coloré)
- Immatriculation bold + marque/modèle + année
- Client : nom + téléphone
- Type intervention (chip)
- Timer si EnCours (widget ORTimer mis à jour par tick)
- Priorité : icône flamme si Urgent (rouge)
- Tap → /technicien/or/{id}

FAB visible seulement si aucun OR EnCours : "Scanner véhicule" (ouverture camera)
  → scanne l'immatriculation → ouvre fiche véhicule

SignalR : écoute OR_ASSIGNED (son de notification si nouvel OR assigné à moi)

Bottom nav : [Mes OR | Notifications | Profil]
```

### 14-tech-detail-or.txt
```
Tu es un expert Flutter. Crée l'écran de détail d'un OR pour le technicien.

Fichier : lib/features/technicien/detail_or/detail_or_screen.dart

AppBar : numéro OR + badge statut + menu "•••" (Voir historique, Signaler problème).

Sections scrollables :

1. Card véhicule :
   Immatriculation (grand, bold), marque/modèle, année, km
   Client : nom + bouton téléphone

2. Card diagnostic :
   TextField multiline (editMode si OR en cours) avec diagnostic existant
   Bouton "Modifier" → passe en edit mode → bouton "Sauvegarder" → PATCH

3. Section "Temps passé" :
   ORTimerWidget : HH:MM:SS animé, couleur progressive
   Bouton Démarrer / Suspendre / Terminer selon statut courant

4. Section "Pièces & MO" :
   Liste des lignes OR (type badge Pièce/MO, désignation, qté, prix)
   Bouton "Ajouter pièce" → /technicien/or/{id}/pieces
   Bouton "Ajouter MO" → dialog texte + heures

5. Bouton principal bas d'écran (sticky) :
   "Passer en cours" (si EnAttente) → PATCH statut
   "Marquer terminé" (si EnCours) → confirmation dialog → PATCH statut TerminéTechnicien
   "Voir les photos" → /technicien/or/{id}/photos

Indicateur de connexion SignalR (point vert/rouge en haut à droite).
```

### 15-tech-timer-widget.txt
```
Tu es un expert Flutter. Crée le widget minuteur pour les OR.

Fichier : lib/shared/widgets/or_timer_widget.dart

StatefulWidget ORTimerWidget :
  Paramètres : { String orId, DateTime? startTime, ORStatut status, int accumulatedMinutes }

State :
- Timer? _timer (périodique, 1 seconde)
- int _secondes (calculé depuis startTime ou accumulatedMinutes)

initState :
- Si status == EnCours ET startTime != null :
    _secondes = DateTime.now().difference(startTime!).inSeconds + accumulatedMinutes * 60
    démarrer _timer
- Sinon : _secondes = accumulatedMinutes * 60

dispose : _timer?.cancel()

didUpdateWidget : si le statut change, arrêter/reprendre le timer

Affichage :
  String get _formatted => '${(_s~/3600).toString().padLeft(2,'0')}:${((_s%3600)~/60).toString().padLeft(2,'0')}:${(_s%60).toString().padLeft(2,'0')}'
  Color get _color => _s < 7200 ? Colors.green : _s < 14400 ? Colors.orange : Colors.red

Widget build : Text(_formatted, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: _color, fontFeatures: [FontFeature.tabularFigures()]))
Ajouter une icône de pause si status == Suspendu (opacity 0.5 sur le texte).
```

### 16-tech-consommer-pieces.txt
```
Tu es un expert Flutter + mobile_scanner. Crée l'écran de consommation de pièces.

Fichier : lib/features/technicien/pieces/consommer_pieces_screen.dart

AppBar : "Ajouter pièces — OR {numero}"

2 modes (ToggleButtons en haut) : [Scanner] [Rechercher]

Mode Scanner :
- MobileScannerWidget plein écran (caméra)
- Sur détection barcode :
  1. Vibration haptic feedback
  2. GET /api/articles/search?q={barcode} (recherche par code barres ou référence)
  3. Si trouvé → ouvre ArticleQuantiteSheet
  4. Si non trouvé → SnackBar "Article non trouvé" + bip sonore

Mode Rechercher :
- SearchBar avec debounce 300ms → GET /api/articles/search?q=
- ListView de résultats : référence, désignation, stock actuel, prix vente
- Tap → ArticleQuantiteSheet

ArticleQuantiteSheet (ModalBottomSheet) :
- Article : référence, désignation, stock disponible : X
- Quantité (Stepper : - [N] +, max = stockDisponible)
- Prix unitaire HT (pré-rempli, éditable)
- Bouton "Ajouter à l'OR" → POST /api/ordres-reparation/{orId}/lignes
- Retour vers le scanner après ajout (SnackBar "Pièce ajoutée : {designation}")

Liste des pièces déjà ajoutées (en bas, scrollable) : chaque ligne avec bouton supprimer.
```

### 17-tech-photos.txt
```
Tu es un expert Flutter image_picker. Crée l'écran photos véhicule d'un OR.

Fichier : lib/features/technicien/photos/photos_or_screen.dart

AppBar : "Photos — {immat}" + compteur "(X photos)"

2 sections :
- "Avant intervention" : grille de photos (Wrap ou GridView)
- "Après intervention" : grille de photos

Chaque PhotoCard :
- Image.network depuis l'URL (avec CachedNetworkImage + placeholder shimmer)
- Badge "Avant" (bleu) ou "Après" (vert)
- Tap → plein écran (PhotoView ou InteractiveViewer)
- Long press → confirm dialog "Supprimer cette photo ?" → DELETE /api/or/{orId}/photos/{photoId}

Boutons en bas (row) :
- "Photo avant" (caméra icon) → ImagePicker source camera + upload
- "Photo après" (caméra icon) → ImagePicker + upload
- "Galerie" → ImagePicker source gallery + upload

Upload flow :
1. ImagePicker.pickImage(maxWidth: 1280, imageQuality: 75)
2. Compress avec flutter_image_compress si > 500KB
3. POST /api/or/{orId}/photos (multipart/form-data, champ "file" + champ "type" avant/après)
4. Afficher CircularProgressIndicator sur la card pendant l'upload
5. Refresh la liste après succès

Gestion offline : si pas de réseau, stocker localement (drift) et upload en background au retour de connexion.
```

### 18-tech-statut-transitions.txt
```
Tu es un expert Flutter. Crée le composant de gestion des transitions de statut d'un OR.

Fichier : lib/features/technicien/detail_or/or_statut_actions.dart

Widget ORStatutActions :
  Paramètres : { OrdreReparation or, VoidCallback onStatutChanged }

Logique des boutons affichés selon le statut courant :

EnAttente :
  → bouton primaire "Prendre en charge" (bleu)
    confirm dialog : "Démarrer l'intervention sur {immat} ?"
    PATCH /api/ordres-reparation/{id}/statut { nouveauStatut: EnCours }

EnCours :
  → bouton secondaire "Suspendre" (orange outline)
    → dialog avec TextField "Raison de la suspension" (required)
    PATCH statut Suspendu avec commentaire
  → bouton primaire "Terminer" (vert)
    → check : au moins 1 ligne OR existe (sinon afficher alerte)
    confirm dialog : "Marquer l'OR comme terminé ? Le client sera notifié."
    PATCH statut TerminéTechnicien

Suspendu :
  → bouton primaire "Reprendre" (bleu)
    PATCH statut EnCours

TerminéTechnicien :
  → état read-only, message "En attente de facturation par le caissier"

Loading state sur chaque bouton pendant l'appel API (CircularProgressIndicator.adaptive())
Afficher SnackBar de succès + appeler onStatutChanged() après chaque transition réussie.
```

---

## Module 4 — Shared Widgets

### 19-shared-or-card.txt
```
Tu es un expert Flutter. Crée le widget carte OR réutilisable par les deux rôles.

Fichier : lib/shared/widgets/or_card.dart

Widget ORCard :
Paramètres : { OrdreReparation or, bool showTechnicien = false, VoidCallback? onTap }

Layout Card (elevation 1, borderRadius 12) :
- Header row :
  Left : numéro OR (bold, 14sp) + badge priorité (flamme rouge si Urgent)
  Right : badge statut coloré (chip avec couleur sémantique depuis AppTheme)
- Content :
  Row immatriculation (16sp, bold) + marque/modèle + année
  Row client nom + InkWell téléphone (icône phone, ouvre tel:)
  Si showTechnicien && technicien assigné :
    Row avatar initiales (24px) + nom technicien
  Si showTechnicien && non assigné :
    Chip "Non assigné" avec icône warning, couleur orange
- Footer row :
  Left : ORTimerWidget (si statut EnCours) ou texte heure ouverture
  Right : chip type intervention

GestureDetector / InkWell wrapping la card entière → onTap?.call()
Hero animation sur le numéro OR pour la transition vers le détail.
```

### 20-shared-status-badge.txt
```
Tu es un expert Flutter. Crée le widget badge de statut OR.

Fichier : lib/shared/widgets/statut_badge.dart

Widget StatutBadge :
Paramètre : { ORStatut statut, bool small = false }

Retourne un Container (chip-like) avec :
- borderRadius: 20
- padding: EdgeInsets.symmetric(horizontal: small ? 8 : 12, vertical: small ? 2 : 4)
- color et text selon le statut :

  EnAttente         → fond #FEF3C7, texte #92400E, label "En attente"
  EnCours           → fond #DBEAFE, texte #1E40AF, label "En cours"
  Suspendu          → fond #FEE2E2, texte #991B1B, label "Suspendu"
  TerminéTechnicien → fond #D1FAE5, texte #065F46, label "Terminé"
  Livré             → fond #EDE9FE, texte #5B21B6, label "Livré"
  Annulé            → fond #F3F4F6, texte #6B7280, label "Annulé"

- Text(label, style: TextStyle(fontSize: small ? 10 : 12, fontWeight: FontWeight.w500))

Widget PrioritéBadge :
  Urgent → Row(icône flamme rouge 12px + "Urgent", couleur rouge)
  Normal → SizedBox.shrink()
```

### 21-shared-signalr-service.txt
```
Tu es un expert Flutter + SignalR. Crée le service SignalR pour le temps réel.

Fichier : lib/core/api/signalr_service.dart

Classe SignalRService (singleton via Riverpod) :
- HubConnection? _connection
- String get _hubUrl => '${Config.apiBaseUrl}/hubs/ordres?access_token=${authService.accessToken}'

Méthodes :
- Future<void> connect() :
  HubConnectionBuilder().withUrl(url).withAutomaticReconnect([0, 2000, 5000, 10000]).build()
  _connection!.on('OR_STATUS_CHANGED', _onStatusChanged)
  _connection!.on('OR_ASSIGNED', _onAssigned)
  _connection!.on('STOCK_ALERT', _onStockAlert)
  await _connection!.start()

- void disconnect() : _connection?.stop()

- Stream<ORStatusEvent> get orStatusStream → StreamController.broadcast()
- Stream<StockAlertEvent> get stockAlertStream → StreamController.broadcast()

Reconnexion : _connection!.onreconnected → log, republier l'état
Gestion lifecycle : connecter dans AppLifecycleState.resumed, déconnecter en paused

Provider Riverpod : signalRProvider (keep-alive, auto-connect au login)

Dans les screens : ref.listen(signalRProvider.select((s) => s.lastOREvent), (_, event) { ... })
```

### 22-shared-offline-cache.txt
```
Tu es un expert Flutter Drift (SQLite). Crée le cache offline pour les données critiques.

Fichier : lib/core/local/app_database.dart

Drift database avec tables :
- cached_ors : id TEXT PK, json TEXT, updated_at INT (timestamp)
- cached_articles : id TEXT PK, json TEXT, updated_at INT
- pending_uploads : id TEXT PK, type TEXT, payload TEXT, created_at INT, retries INT DEFAULT 0

AppDatabase extends _$AppDatabase :
- Lazy singleton via Riverpod provider

Fichier : lib/core/local/cache_service.dart

CacheService :
- saveOrs(List<OrdreReparation> ors) → upsert dans cached_ors
- getOrs() → liste depuis cached_ors (pour afficher pendant chargement réseau)
- savePendingUpload(type, payload) → stocker pour retry plus tard
- processPendingUploads() → Connectivity check, puis envoyer chaque pending

Stratégie : stale-while-revalidate
1. Retourner immédiatement le cache (UI réactive)
2. Fetch réseau en arrière-plan
3. Si réussi → màj cache + refresh UI
4. Si offline → afficher banner "Mode hors ligne — dernière sync {heure}"
```

### 23-shared-notifications.txt
```
Tu es un expert Flutter flutter_local_notifications. Crée le service de notifications.

Fichier : lib/core/notifications/notification_service.dart

NotificationService (singleton) :

setup() → initialiser flutter_local_notifications :
- AndroidInitializationSettings '@mipmap/ic_launcher'
- DarwinInitializationSettings (iOS)
- onDidReceiveNotificationResponse → naviguer vers la bonne page selon payload

showORAssigned(String numero, String immat) :
- Channel : "or_channel", importance: Importance.high
- Titre : "Nouvel OR assigné"
- Corps : "OR {numero} — {immat} vous a été affecté"
- Payload : json { type: 'or', orId: ... }
- Son + vibration

showStockAlert(String designation, int stock) :
- Channel : "stock_channel", importance: Importance.default_
- Titre : "Stock bas : {designation}"
- Corps : "Seulement {stock} unité(s) restante(s)"

showNewFacture(String numero, String client) :
- Channel : "facturation_channel"
- Titre : "Nouvelle facture à encaisser"

Intégration SignalR : dans SignalRService._onStatusChanged et _onAssigned,
appeler NotificationService.showORAssigned() si l'OR est assigné à l'utilisateur courant.
```

---

## Module 5 — Modèles & Providers

### 24-models-dart.txt
```
Tu es un expert Dart. Crée les modèles de données correspondant aux DTOs de l'API.

Pour chaque modèle, utiliser :
- classe avec champs final
- factory fromJson(Map<String, dynamic> json)
- Map<String, dynamic> toJson()
- copyWith() pour les mises à jour immutables

Fichier : lib/shared/models/ordre_reparation.dart
OrdreReparation : { id, numero, statut(ORStatut enum), priorite(Priorite enum), dateOuverture(DateTime), vehicule(VehiculeResume), client(ClientResume), technicien(TechnicienResume?), montantTotal(double), nbLignes(int), diagnostic(String?), lignes(List<LigneOR>?) }

enum ORStatut { enAttente, enCours, suspendu, termineTechnicien, livre, annule }
Méthode : bool get isActive => this == enCours || this == suspendu || this == enAttente

Fichier : lib/shared/models/facture.dart
Facture : { id, numero, dateFacture, dateEcheance, statut(FactureStatut), client, totalHT, montantTVA, totalTTC, montantDejaPaye, restantDu, lignes?, paiements? }

Fichier : lib/shared/models/article.dart
Article : { id, reference, designation, categorie, stockActuel, stockMinimum, prixVente, emplacementRayonnage?, isStockBas(bool, calculé) }

Fichier : lib/shared/models/client.dart + vehicule.dart
Correspondant aux DTOs de l'API.
```

### 25-providers-riverpod.txt
```
Tu es un expert Riverpod. Crée les providers principaux pour les deux rôles.

Fichier : lib/features/admin/facturation/factures_provider.dart
facturesProvider : FutureProvider.autoDispose.family<List<Facture>, FacturesFilter>
  → GET /api/factures?statut=&page=&pageSize=20
factureDetailProvider : FutureProvider.autoDispose.family<Facture, String>(id)
  → GET /api/factures/{id}
enregistrerPaiementProvider : StateNotifierProvider ...

Fichier : lib/features/admin/stock/stock_provider.dart
articlesProvider : FutureProvider.autoDispose.family avec search + filtre
articleDetailProvider : FutureProvider.autoDispose.family<Article, String>(id)
ajustementStockProvider : AsyncNotifierProvider...

Fichier : lib/features/technicien/mes_or/mes_or_provider.dart
mesORProvider : StreamProvider.autoDispose (combinant FutureProvider + SignalR stream)
  → GET /api/ordres-reparation/today?technicienId={userId}
  → mise à jour via signalRProvider.orStatusStream.where(e => e.concerneMoi)

Fichier : lib/features/technicien/detail_or/detail_or_provider.dart
orDetailProvider : FutureProvider.autoDispose.family<OrdreReparation, String>(id)
updateStatutProvider : AsyncNotifierProvider<UpdateStatutNotifier, void>
  → PATCH /api/ordres-reparation/{id}/statut
addLigneProvider : AsyncNotifierProvider<AddLigneNotifier, void>
  → POST /api/ordres-reparation/{id}/lignes
```

---

## Module 6 — Configuration & Déploiement

### 26-flutter-config.txt
```
Tu es un expert Flutter. Configure l'environnement et les flavors de l'application.

Fichier : lib/core/config/app_config.dart
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:5000');
  static const String appName = String.fromEnvironment('APP_NAME', defaultValue: 'Garage System');
  static const bool isDebug = bool.fromEnvironment('IS_DEBUG', defaultValue: true);
}

Fichier : android/app/build.gradle
- flavors : dev (applicationIdSuffix '.dev') et prod
- signingConfigs pour la release

Fichier : lib/main_dev.dart et lib/main_prod.dart
Chaque main.dart : configure AppConfig, initialise les services (NotificationService, SignalRService, DatabaseService), puis runApp(ProviderScope(child: GarageApp()))

Fichier : lib/garage_app.dart
GarageApp : MaterialApp.router avec :
- routerConfig: appRouter
- theme: appTheme, darkTheme: appDarkTheme, themeMode: ThemeMode.system
- localizationsDelegates pour fr_DZ
- supportedLocales: [fr, ar]

Makefile commandes :
  flutter run --flavor dev --dart-define=API_BASE_URL=http://192.168.1.X:5000
  flutter build apk --flavor prod --dart-define=API_BASE_URL=https://api.mongarage.dz
```

### 27-flutter-error-handling.txt
```
Tu es un expert Flutter. Crée la gestion d'erreur globale et les états d'UI.

Fichier : lib/core/errors/app_exception.dart
sealed class AppException :
  - NetworkException(message)
  - UnauthorizedException
  - NotFoundException(resource)
  - ValidationException(Map<String, List<String>> errors)
  - ConflictException(message)
  - ServerException(message)

Fichier : lib/shared/widgets/async_value_widget.dart
Widget AsyncValueWidget<T> :
  Paramètres : { AsyncValue<T> value, Widget Function(T) data, Widget? loading, Widget? error }
  Gère les 3 états de Riverpod AsyncValue :
  - loading → loading ?? const LoadingWidget()
  - error → error ?? ErrorStateWidget(exception: e)
  - data → data(value)

Fichier : lib/shared/widgets/loading_widget.dart
Lottie animation (JSON embarqué) ou CircularProgressIndicator.adaptive() centré.

Fichier : lib/shared/widgets/error_state_widget.dart
Column(icon 😕, message (FR selon AppException.type), bouton "Réessayer" → callback)

Fichier : lib/shared/widgets/empty_state_widget.dart
Column(illustration (SVG simple), titre, sous-titre) — utilisé quand la liste est vide.

Extension sur BuildContext :
context.showSuccessSnackBar(message)
context.showErrorSnackBar(message)
context.showLoadingDialog() / context.hideLoadingDialog()
```

### 28-flutter-test-structure.txt
```
Tu es un expert Flutter testing. Mets en place la structure de tests.

Dossier test/ :
  unit/
    models/or_model_test.dart → fromJson/toJson round-trip tests
    services/auth_service_test.dart → mock ApiClient, tester login/logout/refresh
    utils/formatter_test.dart → tester formatDZD, formatDate
  widget/
    shared/or_card_test.dart → golden test du widget ORCard
    shared/statut_badge_test.dart → vérifier les couleurs par statut
  integration/
    login_flow_test.dart → test end-to-end login + redirection par rôle

pubspec.yaml devDependencies :
- flutter_test (SDK)
- mockito + build_runner
- golden_toolkit

Commandes dans Makefile :
  flutter test unit/
  flutter test widget/ --update-goldens
  flutter test integration/ --flavor dev

Fichier : test/helpers/mock_api_client.dart
MockApiClient avec @GenerateMocks([ApiClient]) via mockito.
Fixtures JSON dans test/fixtures/ (or_response.json, facture_response.json, etc.)
```

---

## Module 7 — Améliorations UX (P1 → P4)

### 29-facture-detail-paiement.txt
```
Tu es un expert Flutter Riverpod. Crée l'écran de détail d'une facture avec encaissement.

Fichier : lib/features/admin/facturation/facture_detail_screen.dart

Le screen reçoit un String factureId via GoRouter path parameter.

Provider :
  factureDetailProvider : FutureProvider.autoDispose.family<Facture, String>
    → GET /api/factures/{id}
    Facture contient : id, numero, statut, dateFacture, dateEcheance, clientNom, vehiculeImmat,
    sousTotalHT, montantTVA, totalTTC, montantDejaPaye, restantDu, lignes (List<LigneFacture>),
    paiements (List<PaiementFacture>)

Layout Scaffold :
AppBar :
  - Titre : numéro facture (ex : FAC-2025-0042)
  - Badge statut en leading
  - Menu ••• → [Télécharger PDF, Annuler facture (confirm dialog si statut != Soldée)]

Body scrollable (SingleChildScrollView + Column) :

1. _ClientVehiculeCard :
   Card avec deux lignes :
   - Icône person + clientNom (bold)
   - Icône directions_car + vehiculeImmat + marque/modèle
   Padding horizontal 16, borderRadius 12

2. _LignesTable :
   Titre section "Prestations" (bold 14sp, leftPadding 16)
   Pour chaque LigneFacture → Row(
     Expanded(description, overflow ellipsis),
     SizedBox(width:40, child: Text('${qte}x', textAlign: right, color: black54)),
     SizedBox(width:80, child: Text(formatDZD(puHT), textAlign: right)),
     SizedBox(width:90, child: Text(formatDZD(totalHT), textAlign: right, bold))
   )
   Séparateur Divider fin entre chaque ligne
   Pas de DataTable (trop rigide) — ListView.builder désactivé pour le scroll (shrinkWrap: true, physics: NeverScrollableScrollPhysics)

3. _TotauxSection (aligné droite) :
   Row "Sous-total HT" + formatDZD(sousTotalHT)
   Row "TVA 19 %" + formatDZD(montantTVA)
   Divider
   Row bold large "Total TTC" + formatDZD(totalTTC)
   Si restantDu > 0 :
     Row rouge "Déjà payé" + formatDZD(montantDejaPaye)
     Row rouge bold "Restant dû" + formatDZD(restantDu)

4. _PaiementsSection :
   Titre "Paiements enregistrés"
   Si liste vide → Text("Aucun paiement", color: black38)
   Sinon liste de chips :
     Chip(
       avatar: Icon(mode icon),
       label: "${formatDZD(montant)} — ${formatDate(date)}",
       backgroundColor: vert clair
     )

FAB "Encaisser" (FloatingActionButton.extended) :
  Visible uniquement si statut != Soldée
  Icon: payments, label: "Encaisser ${formatDZD(restantDu)}"
  onPressed → showModalBottomSheet _EnregistrerPaiementSheet

_EnregistrerPaiementSheet (ConsumerStatefulWidget) :
  State : montantCtrl (pré-rempli restantDu), selectedMode, referenceCtrl
  SegmentedButton<String> modes : Espèces | Virement | Chèque | CB
  TextField montant (TextInputType.numberWithOptions(decimal:true))
  TextField référence (visible si mode Virement ou Chèque)
  Bouton "Valider paiement" :
    → POST /api/factures/{id}/paiements { montant, mode, reference? }
    → ref.invalidate(factureDetailProvider(factureId))
    → Navigator.pop + SnackBar "Paiement enregistré"

Téléchargement PDF :
  → GET /api/factures/{id}/pdf (responseType: ResponseType.bytes)
  → Stocker dans getTemporaryDirectory()/{numero}.pdf
  → Ouvrir avec open_file package
  → Afficher CircularProgressIndicator dans l'AppBar pendant le téléchargement
```

### 30-or-detail-technicien.txt
```
Tu es un expert Flutter Riverpod. Crée l'écran de détail OR pour le technicien.

Fichier : lib/features/technicien/detail_or/detail_or_screen.dart

Provider :
  orDetailProvider : FutureProvider.autoDispose.family<OrdreReparation, String>(orId)
    → GET /api/ordres-reparation/{id}
  Expose : id, numero, statut, vehicule, client, technicien, diagnostic, lignes, historiqueStatuts, montantTotal

AppBar :
  - Titre : numéro OR
  - Leading : back button
  - Actions : badge StatutBadge(or.statut, small: true) en lecture seule
  - Menu ••• → "Voir historique statuts" (ouvre BottomSheet liste des transitions)

Body : SingleChildScrollView padding 16, Column :

1. _VehiculeCard :
   Container décoré (borderRadius 16, gradient léger bleu) :
   - Immatriculation : Text(or.vehicule.immatriculation, fontSize: 22, bold, color: primary)
   - Sous-ligne : "${or.vehicule.marque} ${or.vehicule.modele}" en gris
   - Row : icône phone + or.client.nom (tappable → launch tel:)
   - Badge type intervention (chip)

2. _DiagnosticCard :
   Titre "Diagnostic" + bouton crayon (si statut EnCours)
   Si editMode (bool state) :
     TextField multiline (minLines 3) pré-rempli
     Row boutons : "Annuler" (outline) + "Sauvegarder" (filled) → PATCH /api/ordres-reparation/{id} { diagnostic }
   Sinon :
     Text(or.diagnostic ?? "Aucun diagnostic renseigné", color: diagnostic==null ? black38 : black87)

3. _TimerSection :
   Card avec ORTimerWidget (widget existant, paramétré depuis or.statut + or.heureDebut)
   Sous le timer : label "Durée de l'intervention"

4. _LignesSection :
   Titre "Pièces & Main d'œuvre" + bouton "+" (si statut EnCours)
   ListView.builder(shrinkWrap, NeverScrollable) :
     _LigneTile : icon(Pièce=hardware / MO=build), description, "Qté x PU", total aligné droite
     Swipe to delete (Dismissible) si statut EnCours → DELETE /api/ordres-reparation/{id}/lignes/{ligneId}
   Si liste vide + EnCours : bouton outlined "Ajouter une pièce" centré

5. _StatutActionsBar (sticky bas d'écran via Column + SizedBox.fromSize) :
   Voir prompt 18-tech-statut-transitions.txt — intégrer ORStatutActions ici
   Après chaque transition réussie : ref.invalidate(orDetailProvider(orId))

Bouton "Ajouter pièce" → push /technicien/or/{id}/pieces
```

### 31-signalr-realtime-listener.txt
```
Tu es un expert Flutter SignalR + Riverpod. Ajoute l'écoute SignalR temps réel dans les screens admin et technicien.

Contexte : SignalRService existe dans lib/core/api/signalr_service.dart.
Le hub ASP.NET Core émet :
  - "NotifyORCreated"     : { id, numéro, statut, timestamp }
  - "NotifyORAssigned"    : { orId, numéro, technicien, timestamp }
  - "NotifyORStatusChanged" : { orId, numéro, statut, timestamp }

Étape 1 — Brancher dans file_attente_screen.dart :
Dans le build() de FileAttenteScreen (ConsumerStatefulWidget) :
  ref.listen(signalRProvider, (_, event) {
    if (event == null) return;
    ref.invalidate(fileAttenteProvider);           // recharge la liste
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(event.message),              // ex: "OR-2025-0012 → En cours"
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        duration: Duration(seconds: 3),
      ),
    );
  });

Étape 2 — Brancher dans mes_or_screen.dart (technicien) :
  Même logique, mais filtrer uniquement les événements qui concernent l'employé connecté :
    if (event.technicienId != currentUser.employeId) return;
  → invalider mesORProvider
  → afficher notification locale via NotificationService.showORAssigned()

Étape 3 — Badge temps réel sur la bottom nav :
  Dans app_router.dart AdminShell :
  - Ajouter orAlerteCountProvider : StreamProvider qui incrémente à chaque NotifyORCreated
  - Afficher NavigationDestination avec badge(count) si count > 0 sur l'onglet "Atelier"
  - Remettre à zéro quand l'utilisateur navigue vers cet onglet

Étape 4 — Indicateur de connexion SignalR :
  Widget _SignalRDot(Color) : Container 8x8 circle, vert si connecté, rouge si déconnecté
  Placer en haut à droite de l'AppBar dans file_attente_screen et mes_or_screen
  Écouter signalRProvider.connectionState
```

### 32-dashboard-chart.txt
```
Tu es un expert Flutter fl_chart + Riverpod. Ajoute un mini graphique CA au dashboard admin.

Dépendance à ajouter dans pubspec.yaml : fl_chart: ^0.68.0

Provider :
  caHebdoProvider : FutureProvider.autoDispose<List<CaJour>>
    → GET /api/stats/ca-semaine (retourne 7 jours glissants : [{ date, montant }])
  Model CaJour : { DateTime date, double montant }

Widget _CaChart (StatelessWidget) :
  Paramètre : List<CaJour> data

  BarChart(
    BarChartData(
      maxY: data.map((d) => d.montant).reduce(max) * 1.2,
      barGroups: data.asMap().entries.map((e) =>
        BarChartGroupData(x: e.key, barRods: [
          BarChartRodData(
            toY: e.value.montant,
            color: e.key == 6 ? AppColors.primary : AppColors.primary.withOpacity(0.4),
            width: 16,
            borderRadius: BorderRadius.vertical(top: Radius.circular(6)),
          )
        ])
      ).toList(),
      titlesData: FlTitlesData(
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          getTitlesWidget: (v, _) => Text(
            DateFormat('E', 'fr').format(data[v.toInt()].date),
            style: TextStyle(fontSize: 10, color: Colors.black45),
          ),
        )),
        leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      gridData: FlGridData(show: false),
      borderData: FlBorderData(show: false),
    ),
  )

Intégration dans dashboard_screen.dart :
  Après la section KPI cards, ajouter :
  Card(
    margin: EdgeInsets.symmetric(horizontal: 16),
    child: Padding(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("CA cette semaine", style: TextStyle(fontWeight: FontWeight.w700)),
          SizedBox(height: 4),
          ref.watch(caHebdoProvider).when(
            data: (d) => SizedBox(height: 140, child: _CaChart(d)),
            loading: () => SizedBox(height: 140, child: Center(child: CircularProgressIndicator())),
            error: (_, __) => SizedBox(height: 60, child: Center(child: Text("Données indisponibles"))),
          ),
        ],
      ),
    ),
  )
```

### 33-clients-search-filter.txt
```
Tu es un expert Flutter Riverpod. Améliore la liste des clients avec recherche avancée et filtres.

Fichier : lib/features/admin/clients/clients_list_screen.dart (refactoring)

Providers :
  clientsProvider : FutureProvider.autoDispose.family<List<Client>, ClientsFilter>
    → GET /api/clients?search=&type=&page=&pageSize=30
  ClientsFilter : { String? search, String? type }  // type: "Particulier" | "Societe"

Ajouts :

1. SearchBar persistante en haut (SliverAppBar avec bottom) :
   TextField avec prefixIcon search, suffixIcon clear
   Debounce 400ms via Timer

2. Row de filtres (chips horizontaux) :
   FilterChip "Tous" | "Particulier" | "Société"
   selected → couleur primaire remplie
   onSelected → met à jour le filtre, invalide le provider

3. ClientCard améliorée :
   - Avatar coloré (couleur dérivée de nom.hashCode % AppColors.avatarPalette)
     AppColors.avatarPalette = [ bleu, vert, violet, orange, teal ] (5 couleurs)
   - Badge type : "Particulier" gris / "Société" bleu
   - Sous-ligne : nb véhicules + nb OR actifs (chips compacts)
   - Si client a un OR actif → border gauche orange 3px

4. Tri :
   PopupMenuButton dans l'AppBar :
   "A → Z" | "Plus récents" | "CA décroissant"
   Tri effectué côté client sur la liste retournée (pas de nouvel appel API)

5. Pull-to-refresh : RefreshIndicator → ref.refresh(clientsProvider(filter).future)

6. Infinite scroll :
   ScrollController _ctrl
   _ctrl.addListener(() { if (_ctrl.position.pixels > _ctrl.position.maxScrollExtent - 200) loadMore(); })
   loadMore() → incrémenter page, concaténer résultats dans un StateProvider<List<Client>>
```

### 34-stock-badge-critique.txt
```
Tu es un expert Flutter Riverpod. Ajoute un badge rouge "articles critiques" sur l'icône Stock de la nav bar.

Étape 1 — Provider :
  stockCritiqueCountProvider : FutureProvider.autoDispose<int>
    → GET /api/articles?stockBas=true&pageSize=1
    → extraire le champ "total" de la réponse paginée (total items en stock bas)
    Cache : keepAlive 5 minutes (ref.keepAlive() dans le provider)

Étape 2 — Badge dans app_router.dart AdminShell :
  Dans la liste _NavItem, pour l'item "Stock" :
    Consumer(builder: (_, ref, __) {
      final count = ref.watch(stockCritiqueCountProvider).valueOrNull ?? 0;
      return NavigationDestination(
        icon: Badge.count(count: count, isLabelVisible: count > 0,
          child: Icon(Icons.inventory_2_outlined)),
        selectedIcon: Badge.count(count: count, isLabelVisible: count > 0,
          child: Icon(Icons.inventory_2)),
        label: 'Stock',
      );
    })

Étape 3 — Rafraîchissement :
  Invalider stockCritiqueCountProvider quand une ligne OR de type Pièce est ajoutée :
  Dans AddLigneAsync (consommer_pieces_screen.dart) après le POST réussi :
    ref.invalidate(stockCritiqueCountProvider)
  Et quand la page Stock devient visible :
    @override void initState() { ref.invalidate(stockCritiqueCountProvider); }

Étape 4 — Banner dans stock_screen.dart :
  Si count > 0 → afficher en haut un Container rouge clair :
    "⚠ {count} article(s) en stock critique — vérifier les approvisionnements"
  Tappable → scroller jusqu'à la section des articles critiques (ScrollController + GlobalKey)
```

### 35-empty-states-contextuels.txt
```
Tu es un expert Flutter. Remplace les états vides génériques par des états contextuels avec CTA.

Fichier : lib/shared/widgets/empty_state_widget.dart (refactoring)

Widget EmptyStateWidget :
  Paramètres : {
    required IconData icon,
    required String title,
    String? subtitle,
    String? actionLabel,
    VoidCallback? onAction,
    Color? iconColor,
  }

Layout centré (Column mainAxisAlignment.center) :
  - Container(60x60, decoration: BoxDecoration(color: iconColor?.withOpacity(0.1), shape: BoxShape.circle))
      → Icon(icon, size: 32, color: iconColor ?? Colors.black26)
  - SizedBox(height: 16)
  - Text(title, fontSize: 16, fontWeight.w600, textAlign.center)
  - Si subtitle != null : Text(subtitle, fontSize: 13, color: black45, textAlign.center)
  - Si actionLabel != null :
      SizedBox(height: 20)
      FilledButton.tonal(onPressed: onAction, child: Text(actionLabel))

Remplacer dans chaque screen :

factures_list_screen.dart :
  EmptyStateWidget(
    icon: Icons.receipt_long_outlined,
    title: "Aucune facture",
    subtitle: "Les factures générées depuis les OR apparaîtront ici",
    iconColor: AppColors.primary,
  )

file_attente_screen.dart (par onglet) :
  EnAttente → EmptyStateWidget(icon: Icons.hourglass_empty, title: "Aucun OR en attente",
    subtitle: "Tout est sous contrôle !", iconColor: AppColors.warning)
  EnCours → EmptyStateWidget(icon: Icons.check_circle_outline, title: "Aucune intervention en cours",
    iconColor: AppColors.success)
  Tous (global) → EmptyStateWidget(icon: Icons.car_repair, title: "Atelier vide aujourd'hui",
    subtitle: "Créez un OR pour commencer", actionLabel: "Créer un OR",
    onAction: () => context.push('/admin/nouvel-or'), iconColor: AppColors.primary)

clients_list_screen.dart :
  EmptyStateWidget(icon: Icons.people_outline, title: "Aucun client",
    subtitle: "Ajoutez votre premier client pour commencer",
    actionLabel: "Nouveau client", onAction: () => _showNewClientSheet(context),
    iconColor: AppColors.primary)

mes_or_screen.dart (technicien) :
  EmptyStateWidget(icon: Icons.handyman_outlined, title: "Aucune intervention assignée",
    subtitle: "Vos OR du jour apparaîtront ici", iconColor: AppColors.primary)
```

### 36-loading-skeletons.txt
```
Tu es un expert Flutter. Remplace les spinners de chargement par des squelettes animés (shimmer).

Dépendance : shimmer: ^3.0.0 dans pubspec.yaml

Fichier : lib/shared/widgets/skeleton_widgets.dart

Helper _shimmer(Widget child) :
  Shimmer.fromColors(
    baseColor: Colors.grey[200]!,
    highlightColor: Colors.grey[100]!,
    child: child,
  )

Widget SkeletonFactureCard :
  Container décoré comme _FactureCard mais avec des blocs gris à la place du texte :
  - Bloc 120x14 (numéro) + bloc 60x12 (date) alignés en Row
  - Bloc 200x12 (client)
  - Bloc 100x18 (montant) + bloc 60x20 arrondi (badge)
  Utiliser Container(width, height, color: Colors.white, borderRadius) wrappé dans _shimmer()

Widget SkeletonORCard : idem structure ORKanbanCard

Widget SkeletonListView({ int count = 5, Widget Function() itemBuilder }) :
  ListView.separated(
    shrinkWrap: true, physics: NeverScrollableScrollPhysics,
    itemCount: count,
    separatorBuilder: (_, __) => SizedBox(height: 10),
    itemBuilder: (_, __) => itemBuilder(),
  )

Intégration dans AsyncValueWidget :
  Modifier le paramètre loading pour accepter un Widget? :
  loading → loading ?? SkeletonListView(count: 4, itemBuilder: () => SkeletonFactureCard())

Utilisation :
  factures_list_screen.dart :
    AsyncValueWidget(
      value: factures,
      loading: SkeletonListView(count: 5, itemBuilder: () => const SkeletonFactureCard()),
      data: (list) => ...
    )
  file_attente_screen.dart :
    loading: SkeletonListView(count: 3, itemBuilder: () => const SkeletonORCard())
```

### 37-offline-resilience.txt
```
Tu es un expert Flutter Dio + Connectivity. Ajoute la résilience réseau (offline banner + retry).

Dépendances : connectivity_plus: ^6.0.0, dio_retry: ^6.0.0 (ou implémenter manuellement)

Étape 1 — ConnectivityService :
  Fichier : lib/core/network/connectivity_service.dart
  connectivityProvider : StreamProvider<ConnectivityResult>
    → Connectivity().onConnectivityChanged

  isOnlineProvider : Provider<bool>
    → ref.watch(connectivityProvider).valueOrNull != ConnectivityResult.none

Étape 2 — OfflineBanner widget :
  Fichier : lib/shared/widgets/offline_banner.dart
  Consumer qui écoute isOnlineProvider :
  AnimatedCrossFade(
    firstChild: SizedBox.shrink(),      // online
    secondChild: Container(            // offline
      color: Colors.red[700],
      padding: EdgeInsets.symmetric(vertical: 6, horizontal: 16),
      child: Row([ Icon(Icons.wifi_off, size: 14, color: white), SizedBox(8),
                   Text("Pas de connexion — mode hors ligne", color: white, fontSize: 12) ]),
    ),
    crossFadeState: isOnline ? CrossFadeState.showFirst : CrossFadeState.showSecond,
    duration: Duration(milliseconds: 300),
  )
  Ajouter dans AdminShell et TechnicienShell au-dessus du body principal.

Étape 3 — Retry dans ApiClient :
  Dans le DioException handler de api_client.dart :
  Si type == DioExceptionType.connectionTimeout || connectionError :
    Retry 2 fois avec délai exponentiel (500ms, 1500ms) avant de lever NetworkException
  Si NetworkException → afficher dans AsyncValueWidget un message spécifique :
    "Impossible de se connecter au serveur. Vérifiez votre connexion."
    + bouton "Réessayer" → ref.refresh(provider)

Étape 4 — Pull-to-refresh manquant :
  Vérifier que RefreshIndicator est présent dans :
  - factures_list_screen.dart ✓ (déjà fait)
  - file_attente_screen.dart → ajouter onRefresh: () => ref.refresh(fileAttenteProvider.future)
  - clients_list_screen.dart → ajouter onRefresh
  - stock_screen.dart → ajouter onRefresh: () => ref.refresh(articlesProvider(filter).future)
  - mes_or_screen.dart → ajouter onRefresh: () => ref.refresh(mesORProvider.future)
```

### 38-dark-mode.txt
```
Tu es un expert Flutter Material 3. Active le dark mode en suivant le thème système.

Fichier : lib/core/theme/app_theme.dart

1. Créer appDarkTheme : ThemeData :
  ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primarySeed,
      brightness: Brightness.dark,
    ),
    scaffoldBackgroundColor: Color(0xFF0F1419),
    cardColor: Color(0xFF1C2128),
    appBarTheme: AppBarTheme(
      backgroundColor: Color(0xFF161B22),
      foregroundColor: Colors.white,
      elevation: 0,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Color(0xFF21262D),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Color(0xFF30363D))),
    ),
  )

2. Fichier : lib/core/theme/theme_provider.dart
  themeModeProvider : StateProvider<ThemeMode>(() => ThemeMode.system)

  Persister dans SharedPreferences :
    themeModeNotifier : StateNotifier<ThemeMode>
    - initState : lire prefs.getString('themeMode') → ThemeMode.values.byName(...)
    - set(ThemeMode mode) → prefs.setString('themeMode', mode.name) + state = mode

3. Dans garage_app.dart :
  MaterialApp.router(
    theme: appTheme,
    darkTheme: appDarkTheme,
    themeMode: ref.watch(themeModeProvider),
    ...
  )

4. Toggle dans le menu Profil :
  ListTile(
    leading: Icon(Icons.brightness_6_rounded),
    title: Text("Apparence"),
    trailing: SegmentedButton<ThemeMode>(
      segments: [
        ButtonSegment(value: ThemeMode.light, icon: Icon(Icons.light_mode, size: 16)),
        ButtonSegment(value: ThemeMode.system, icon: Icon(Icons.brightness_auto, size: 16)),
        ButtonSegment(value: ThemeMode.dark, icon: Icon(Icons.dark_mode, size: 16)),
      ],
      selected: {ref.watch(themeModeProvider)},
      onSelectionChanged: (s) => ref.read(themeModeProvider.notifier).set(s.first),
    ),
  )

Note : les Containers avec couleurs hardcodées (AppColors.surface, AppColors.border)
doivent utiliser Theme.of(context).colorScheme.surface et .outlineVariant respectivement
pour que le dark mode s'applique automatiquement.
```

---

## Usage rapide avec Claude Code

```bash
# Créer le projet Flutter
flutter create garage_app --org dz.mongarage --platforms android,ios
cd garage_app

# Lancer les prompts dans l'ordre
claude < prompts/01-flutter-setup.txt
claude < prompts/02-flutter-auth-service.txt
claude < prompts/03-flutter-router.txt
# ...

# Ou en mode interactif pour adapter au contexte
cd garage_app
claude
# Coller le prompt puis demander des adaptations
```

> Conseil : après chaque prompt, lancer `flutter analyze` pour vérifier les erreurs de compilation avant de passer au suivant.
