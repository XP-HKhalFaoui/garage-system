# Garage System — Prompts de développement
> Stack : **Vite + React + TypeScript** | **ASP.NET Core 8** | **PostgreSQL** | **Docker**  
> Usage : `claude < prompts/nom-du-fichier.txt` depuis le dossier concerné du monorepo

---

## CLAUDE.md — Contexte projet (à placer à la racine)

```markdown
# Projet : Système de Gestion Garage

## Stack
- Backend  : ASP.NET Core 8 Web API, EF Core 8, PostgreSQL 16, Hangfire, SignalR, QuestPDF
- Frontend : Vite + React 18 + TypeScript, TanStack Query, React Hook Form, Zod, Recharts
- Infra    : Docker, Docker Compose, Nginx reverse proxy

## Conventions
- snake_case en base de données (convention Npgsql)
- DTOs séparés des entités (jamais d'exposition directe des entités EF)
- Tous les endpoints retournent ProblemDetails (RFC 7807) en cas d'erreur
- Tests unitaires xUnit pour chaque service métier
- Soft delete sur toutes les entités principales (champ IsDeleted)
- Authentification JWT (access token 15 min + refresh token 7 jours)

## Structure monorepo
/garage-system
  /backend/GarageSystem.API     → ASP.NET Core 8
  /frontend                     → Vite + React
  /docker                       → docker-compose files
  /prompts                      → ce dossier
```

---

## Module 1 — Infrastructure & Setup

### 01-infra-monorepo.txt
```
Tu es un DevOps senior. Initialise un monorepo Git pour un système de gestion de garage avec la structure suivante :
/garage-system
  /backend      → ASP.NET Core 8 Web API
  /frontend     → Vite + React + TypeScript
  /docker       → docker-compose files
  /docs         → documentation

Instructions :
- Crée un .gitignore global couvrant .NET, Node, Docker et les IDE
- Ajoute un README.md racine avec la description du projet et les prérequis (Node 20+, .NET 8 SDK, Docker Desktop)
- Initialise git et fais le premier commit "chore: initial monorepo structure"
- Utilise des branches : main (prod), develop (intégration), feature/* (développement)
- Ajoute un fichier .editorconfig unifiant les styles entre VS Code et Visual Studio
```

### 02-infra-docker-compose.txt
```
Tu es un DevOps expert Docker. Crée un fichier docker-compose.yml complet pour un système de gestion de garage.

Services à configurer :
1. db : PostgreSQL 16-alpine, volume persistant, healthcheck (pg_isready), port 5432
2. api : ASP.NET Core 8, dépend de db (condition: service_healthy), port 5000, variables d'env pour la connexion DB
3. web : Nginx servant le build Vite, port 80, proxy /api vers le service api

Exigences :
- Réseau interne "garage-net" pour l'isolation
- Variables d'env via fichier .env (ne pas hardcoder les mots de passe)
- Volumes nommés pour PostgreSQL (garage-db-data)
- Profils : "dev" et "prod" avec override files (docker-compose.override.yml)
- Healthcheck sur le service api : curl -f http://localhost:8080/health
```

### 03-infra-dockerfile-api.txt
```
Tu es un expert Docker et .NET. Crée un Dockerfile multi-stage optimisé pour une API ASP.NET Core 8.

Stages requis :
1. "base"    : image mcr.microsoft.com/dotnet/aspnet:8.0-alpine
2. "build"   : image mcr.microsoft.com/dotnet/sdk:8.0, restore NuGet, build Release
3. "publish" : dotnet publish -c Release -o /app/publish --no-restore
4. "final"   : copie depuis publish, USER app (non-root), EXPOSE 8080

Bonnes pratiques :
- Layer caching : copier .csproj et faire restore AVANT de copier tout le code source
- Utilisateur non-root pour la sécurité (addgroup/adduser sur alpine)
- HEALTHCHECK via wget sur /health (wget disponible sur alpine, pas curl)
- Variables d'env : ASPNETCORE_ENVIRONMENT, ASPNETCORE_URLS=http://+:8080
- Image finale cible < 200MB
```

### 04-infra-dockerfile-vite.txt
```
Tu es un expert Docker et frontend. Crée un Dockerfile multi-stage pour une app Vite + React + TypeScript.

Stage 1 - "builder" (node:20-alpine) :
- WORKDIR /app
- Copier package.json + yarn.lock, puis yarn install --frozen-lockfile
- Copier le reste du code source
- RUN yarn build (génère /app/dist)
- ARG VITE_API_URL pour injecter l'URL de l'API au moment du build

Stage 2 - "runner" (nginx:1.25-alpine) :
- Copier /app/dist vers /usr/share/nginx/html
- Copier un nginx.conf custom :
  * Gzip activé pour text/html, text/css, application/javascript, application/json
  * try_files $uri $uri/ /index.html pour le SPA routing
  * Location /api/ { proxy_pass http://api:8080/; proxy headers X-Real-IP, X-Forwarded-For }
  * Headers de cache : 1 an pour /assets/*, no-cache pour index.html
- EXPOSE 80, HEALTHCHECK via wget sur /
- Image finale cible < 30MB
```

### 05-infra-hot-reload.txt
```
Tu es un DevOps. Configure le hot-reload pour le développement local avec Docker Compose.

Pour l'API .NET :
- Crée docker-compose.override.yml avec le service api qui utilise dotnet watch run
- Monte le volume du code source local vers /app dans le container
- Ajoute les variables DOTNET_USE_POLLING_FILE_WATCHER=1 et ASPNETCORE_ENVIRONMENT=Development

Pour Vite :
- Lance vite --host 0.0.0.0 dans le container de dev
- Configure le HMR : VITE_HMR_HOST=localhost, VITE_HMR_PORT=5173
- Monte le volume src/ local

Crée le docker-compose.override.yml complet avec ces configurations, ainsi qu'un script shell
dev.sh qui lance "docker compose -f docker-compose.yml -f docker-compose.override.yml up".
```

### 06-infra-nginx.txt
```
Tu es un expert nginx. Crée un fichier nginx.conf complet pour servir une app SPA Vite et proxyfier une API ASP.NET Core.

Configuration requise :
- Serveur HTTP sur port 80
- Bloc location / : servir les fichiers statiques de /usr/share/nginx/html avec fallback index.html (SPA routing)
- Bloc location /api/ : proxy_pass vers http://api:8080/, avec headers :
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
- Gzip on avec types : text/plain, text/css, application/json, application/javascript, image/svg+xml
- Headers de cache : "public, max-age=31536000, immutable" pour /assets/*, "no-cache, no-store" pour index.html
- client_max_body_size 10M pour les uploads
- Timeouts : proxy_connect_timeout 60s, proxy_read_timeout 60s
```

### 07-infra-environments.txt
```
Tu es un DevOps. Mets en place la gestion des environnements pour un projet .NET + Vite + Docker.

Pour ASP.NET Core :
- appsettings.json (base avec toutes les clés), appsettings.Development.json, appsettings.Production.json
- Sections : Database:ConnectionString, Jwt:Secret, Jwt:Issuer, Jwt:Audience, Email:SmtpHost, Cors:AllowedOrigins
- User Secrets en dev (dotnet user-secrets), variables d'env en prod
- Ne jamais committer les secrets — ajoute les fichiers sensibles au .gitignore

Pour Vite :
- .env (base), .env.development, .env.production
- Variables : VITE_API_URL, VITE_APP_TITLE, VITE_VERSION
- Préfixe VITE_ obligatoire pour l'accès côté client
- .env.example commité avec toutes les clés mais sans valeurs sensibles

Pour Docker :
- .env.dev et .env.prod à la racine du projet docker
- Ajouter .env* au .gitignore (sauf .env.example)
```

### 08-infra-cicd.txt
```
Tu es un DevOps expert GitHub Actions. Crée un workflow CI/CD complet pour un monorepo .NET + Vite + Docker.

Fichier .github/workflows/ci.yml (déclenché sur push et PR vers develop et main) :
1. Job "test-backend" :
   - runs-on: ubuntu-latest
   - dotnet restore, dotnet build --no-restore, dotnet test --no-build --verbosity normal
2. Job "test-frontend" :
   - node 20, yarn install --frozen-lockfile, yarn type-check, yarn build
3. Job "docker-build" (seulement sur push vers main, dépend des 2 jobs précédents) :
   - Build les 2 images Docker avec tags : ghcr.io/org/garage-api:sha-${GITHUB_SHA::7} et :latest
   - Push vers GitHub Container Registry

Fichier .github/workflows/deploy.yml (sur push vers main uniquement) :
- Dépend du workflow ci.yml (workflow_run)
- SSH vers serveur de prod : docker compose pull && docker compose up -d
- Notification Slack en cas d'échec

Ajoute un fichier SECRETS.md documentant tous les secrets GitHub Actions nécessaires.
```

---

## Module 2 — Noyau & Auth

### 09-core-schema-db.txt
```
Tu es un architecte .NET et PostgreSQL. Crée les entités Entity Framework Core pour un système de gestion de garage.

Entités à modéliser avec leurs relations :
- Client : Id(Guid), Type(enum Particulier/Société), Nom, Prénom?, RaisonSociale?, Téléphone(unique), Email?, Adresse, Wilaya, IsActif, DateCreation, IsDeleted
- Véhicule : Id(Guid), ClientId(FK), Immatriculation(unique), VIN?, Marque, Modèle, Année, Carburant(enum), Transmission(enum), KilométrageActuel, DateDernièreVisite, IsActif
- OrdreReparation : Id(Guid), Numéro(unique, format OR-2024-0001), VéhiculeId(FK), TechnicienId(FK)?, Statut(enum), DateOuverture, DateFermeture?, Diagnostic, MontantTotal, RowVersion(byte[] pour concurrence optimiste)
- LigneOR : Id(Guid), ORId(FK), Type(enum Pièce/MO), ArticleId(FK)?, Description, Quantité, PrixUnitaire
- Article : Id(Guid), Référence(unique), Désignation, Catégorie(enum), StockActuel, StockMinimum, PrixAchat, PrixVente, IsActif
- Employé : Id(Guid), Nom, Prénom, Poste, SalaireBase, DateEmbauche, UserId(FK), IsActif

Configuration :
- Utilise Fluent API dans des fichiers IEntityTypeConfiguration<T> séparés
- Index sur tous les FK et champs de recherche fréquents (Téléphone, Immatriculation, Référence, Numéro)
- snake_case naming via EFCore.NamingConventions
- Soft delete via interface ISoftDelete + query filter global
```

### 10-core-efcore-migrations.txt
```
Tu es un expert ASP.NET Core 8 et Entity Framework Core. Configure EF Core avec PostgreSQL dans un projet Web API .NET 8.

Étapes complètes :
1. Packages NuGet : Microsoft.EntityFrameworkCore (8.x), Npgsql.EntityFrameworkCore.PostgreSQL, EFCore.NamingConventions, Microsoft.EntityFrameworkCore.Design
2. Crée ApplicationDbContext héritant de DbContext avec tous les DbSet<T> et la configuration Fluent API
3. Configure dans Program.cs avec la chaîne de connexion depuis IConfiguration["Database:ConnectionString"]
4. Applique UseSnakeCaseNamingConvention() pour PostgreSQL
5. Crée IDesignTimeDbContextFactory<ApplicationDbContext> pour les migrations sans démarrer l'app
6. Crée un service DatabaseSeeder avec les données initiales : rôles, utilisateur admin par défaut
7. Commandes à documenter dans un Makefile :
   make migrate name=NomMigration
   make db-update
   make db-seed

Ajoute un health check EF Core sur /health/db.
```

### 11-core-jwt-auth.txt
```
Tu es un expert sécurité ASP.NET Core 8. Implémente un système d'authentification JWT complet.

1. Entité AppUser héritant IdentityUser (Guid), avec propriété NavigationEmployé
2. Configuration Identity dans Program.cs : mot de passe min 8 chars, pas de lockout immédiat
3. JwtService (interface + implémentation injectable) :
   - GenerateAccessToken(AppUser user, IList<string> roles) → JWT signé HS256, expiration 15 min
     Claims : sub(userId), email, roles, jti(GUID unique)
   - GenerateRefreshToken() → string base64 de 64 bytes aléatoires cryptographiquement sûrs
   - Stocker le refresh token en DB (table RefreshTokens : token, userId, expiration, isRevoked)
4. AuthController :
   - POST /api/auth/login → retourne { accessToken, expiresIn, refreshToken }
   - POST /api/auth/refresh → valide refresh token, retourne nouveaux tokens
   - POST /api/auth/logout → révoque le refresh token courant
5. Configuration JWT dans Program.cs : AddAuthentication(JwtBearer) avec validation issuer, audience, lifetime, signature
6. Middleware pour extraire userId depuis les claims dans les controllers : service CurrentUserService
```

### 12-core-roles.txt
```
Tu es un expert ASP.NET Core Identity. Configure un système de rôles et permissions pour un garage.

Rôles à créer (seed dans la DB au démarrage) :
- Admin : accès total
- Technicien : créer/modifier OR, consulter stock, pas d'accès facturation ni RH
- Caissier : facturation, paiements, consultation OR en lecture
- RH : gestion employés et paie, pas d'accès OR techniques

Implémentation complète :
1. Seed des 4 rôles via RoleManager<IdentityRole<Guid>> dans le DatabaseSeeder
2. Extension methods sur ClaimsPrincipal :
   - bool IsAdmin()
   - bool CanManageBilling()
   - bool CanViewTechnicalDetails()
3. Policy-based authorization pour les cas complexes :
   - Policy "CanEditOR" : Admin OU Technicien assigné à l'OR
   - Policy "CanViewSalary" : Admin OU RH uniquement
4. Endpoint GET /api/auth/me → { userId, email, roles, permissions[] }
5. Attribut [Authorize(Policy = "CanEditOR")] sur les endpoints concernés
```

### 13-core-logging.txt
```
Tu es un expert ASP.NET Core 8. Mets en place la gestion globale des erreurs et le logging structuré avec Serilog.

1. Packages : Serilog.AspNetCore, Serilog.Sinks.Console, Serilog.Sinks.File, Serilog.Enrichers.Environment
2. Configuration Serilog dans Program.cs (avant tout le reste) :
   - Dev : Console avec output template coloré + niveau Debug
   - Prod : File (logs/garage-.txt, rolling daily, retenir 14 jours) + niveau Information
   - Enrichers : FromLogContext, WithMachineName, WithEnvironmentName, WithProperty("Application","GarageSystem")

3. Exceptions custom dans GarageSystem.Domain.Exceptions :
   - NotFoundException(string entityName, object id)
   - BusinessRuleException(string message)
   - ConflictException(string message)

4. Middleware ExceptionHandlingMiddleware :
   - Catch global, log avec Serilog (ILogger)
   - Map vers ProblemDetails RFC 7807 avec StatusCode approprié
   - Ne jamais exposer la stack trace en prod

5. Validation avec FluentValidation sur tous les DTOs :
   - Installer FluentValidation.AspNetCore
   - Retourner 400 avec la liste des erreurs de validation formatées en ProblemDetails
```

### 14-core-login-frontend.txt
```
Tu es un expert React + TypeScript + Vite. Crée le système d'authentification côté frontend.

1. Page /login :
   - Formulaire avec React Hook Form + Zod (email, mot de passe)
   - État de chargement sur le bouton submit
   - Affichage d'erreur global ("Identifiants incorrects")
   - Redirect vers /dashboard après login réussi (ou vers state.from si redirect depuis une route protégée)

2. services/authService.ts :
   - login(email, password) → POST /api/auth/login
   - logout() → POST /api/auth/logout + clear tokens
   - refreshToken() → POST /api/auth/refresh

3. Stockage tokens :
   - accessToken : variable module en mémoire (jamais localStorage pour éviter XSS)
   - refreshToken : localStorage (avec les risques documentés en commentaire)

4. Axios interceptors dans services/httpClient.ts :
   - Request : ajoute Authorization: Bearer {accessToken}
   - Response : sur 401, tente refreshToken() automatiquement, retry la requête originale, sinon redirect /login

5. Hook useAuth() : { user, isAuthenticated, login, logout, isLoading }
6. AuthContext + AuthProvider wrappant toute l'app dans main.tsx
7. Vérification du token au démarrage de l'app (appel GET /api/auth/me)
```

### 15-core-route-guards.txt
```
Tu es un expert React Router v6 et TypeScript. Crée un système de protection de routes par rôle.

1. Composant <PrivateRoute allowedRoles?: string[] /> :
   - Si non authentifié → <Navigate to="/login" state={{ from: location }} replace />
   - Si mauvais rôle → <Navigate to="/403" replace />
   - Sinon → <Outlet />

2. Structure complète de l'app router dans App.tsx :
   Routes publiques : /login
   Routes authentifiées (sans restriction de rôle) : /dashboard, /clients, /vehicules, /or, /stock
   Routes Admin+Caissier : /facturation, /caisse
   Routes Admin+RH : /rh, /rh/employes, /rh/paie
   Routes Admin uniquement : /parametres, /stats

3. Hook usePermission(requiredRoles: string[]) → boolean
4. Composant <CanAccess roles={[...]}>{children}</CanAccess> pour masquer des éléments UI
5. Page 403 : message d'accès refusé avec bouton retour dashboard
6. Mémorisation de la route avant redirection pour retour après login
```

---

## Module 3 — File d'attente & Entretien

### 16-or-create-api.txt
```
Tu es un expert ASP.NET Core 8. Crée l'endpoint de création d'un Ordre de Réparation (OR).

POST /api/ordres-reparation
Body (CreateORDto) : { vehiculeId, technicienId?, kilometrageActuel, typeIntervention(enum), diagnostic, priorite(enum Normal/Urgent) }

Logique métier dans OrdreReparationService.CreateAsync() :
1. Vérifier que le véhicule existe et est actif
2. Vérifier qu'aucun OR avec statut != Livré/Annulé n'est déjà ouvert pour ce véhicule (règle : 1 OR actif max par véhicule)
3. Mettre à jour Véhicule.KilométrageActuel si le nouveau km est supérieur
4. Générer le numéro d'OR : OR-{année}-{séquence 4 digits} — utilise une table séquence DB pour éviter les doublons concurrents
5. Créer l'OR avec statut "EnAttente", DateOuverture = DateTime.UtcNow
6. Retourner 201 Created

ORResponseDto : { id, numero, statut, dateOuverture, véhicule{id,immat,marque,modèle,km}, client{id,nom,téléphone}, technicien?, priorité }

Tests xUnit : cas nominal, véhicule inexistant, OR déjà actif, km invalide (inférieur à l'actuel).
```

### 17-or-list-today-api.txt
```
Tu es un expert ASP.NET Core 8 et EF Core. Crée l'endpoint de listing journalier des OR.

GET /api/ordres-reparation/today
Query params : statut?(EnAttente|EnCours|Suspendu|TerminéTechnicien|Livré), technicienId?

Requête EF Core optimisée (éviter N+1) :
- Filtrer par DateOuverture.Date == DateTime.Today (en UTC)
- Include projecté via Select() vers ORSummaryDto (ne pas charger les lignes OR)
- Order : EnCours et Urgents en premier, puis EnAttente, puis les autres
- IMemoryCache sur 30 secondes avec clé "or-today-{date}", invalidé sur toute modification d'OR

ORSummaryDto : { id, numero, statut, priorité, heureOuverture, tempsPasse(TimeSpan), véhicule{immat,marque,modèle}, client{nom,téléphone}, technicien{id,nom}?, nbLignes, montantEstimé }

Ajoute aussi :
- GET /api/ordres-reparation/stats-today → { total, enAttente, enCours, terminés, caTotalHT }
```

### 18-or-assign-api.txt
```
Tu es un expert ASP.NET Core 8. Implémente l'assignation d'un technicien à un OR.

PATCH /api/ordres-reparation/{id}/assigner
Body : { technicienId }

Règles métier :
1. L'OR doit être en statut EnAttente ou EnCours (sinon 409 Conflict)
2. Le technicien doit avoir le rôle Technicien et être actif
3. Si l'OR était EnAttente → passer au statut EnCours, enregistrer HeureDebut = UtcNow
4. Enregistrer dans HistoriqueAssignation : { orId, ancienTechnicienId?, nouveauTechnicienId, dateChangement, changedByUserId }
5. Notifier via IHubContext<OrdresHub> : méthode NotifyORAssigned({ orId, numero, technicien, timestamp })
6. Concurrence optimiste : utilise RowVersion sur l'entité OR, retourner 409 si conflit de version

Autorisation : Admin ou Caissier peuvent assigner n'importe quel technicien. Technicien peut s'auto-assigner.
```

### 19-or-status-api.txt
```
Tu es un expert ASP.NET Core 8. Crée l'endpoint de transition de statut d'un OR avec machine d'état.

PATCH /api/ordres-reparation/{id}/statut
Body : { nouveauStatut, commentaire? }

Classe ORStatutMachine dans le domain (pas dans le controller) :
Transitions autorisées :
  EnAttente → EnCours (si technicien assigné, sinon erreur métier)
  EnCours → Suspendu (commentaire obligatoire)
  EnCours → TerminéTechnicien
  Suspendu → EnCours
  TerminéTechnicien → Livré (uniquement si facture soldée associée)

Pour chaque transition :
1. Valider via ORStatutMachine.CanTransition(actuel, nouveau)
2. Créer une entrée HistoriqueStatutOR { orId, statutAvant, statutAprès, commentaire, userId, timestamp }
3. Si → TerminéTechnicien : calculer MontantTotal = SUM(Quantité * PrixUnitaire) des lignes
4. Si → Livré : mettre à jour Véhicule.DateDernièreVisite et KilométrageActuel
5. Broadcaster via SignalR : NotifyORStatusChanged({ orId, numero, statut, timestamp })
6. Invalider le cache "or-today-*"
```

### 20-or-kanban-frontend.txt
```
Tu es un expert React + TypeScript. Crée le tableau Kanban journalier des OR.

Route /or/kanban (page principale de l'atelier)

Colonnes : En attente | En cours | Suspendu | Terminé technicien | Livré

Composant ORCard affiche :
- Numéro OR (badge coloré par priorité), immatriculation en gros, marque/modèle
- Nom client + bouton téléphone (tel:)
- Avatar technicien avec initiales (ou "Non assigné" en orange)
- Composant <ORTimer /> (voir tâche dédiée)
- Badge type intervention
- Badge urgence si > 2h sans prise en charge

Interactions :
- Drag & Drop entre colonnes via @dnd-kit/core (react-beautiful-dnd est en maintenance)
  → onDragEnd appelle PATCH /api/ordres-reparation/{id}/statut
  → Optimistic update + rollback si erreur
- Click sur carte → <ORDetailDrawer /> (Drawer latéral Radix UI ou custom)
- Bouton "Assigner" visible sur les cartes EnAttente

Temps réel : useSignalR hook écoute OrdresHub, invalide le cache TanStack Query sur chaque événement.
Header de page : date du jour + compteurs par statut + bouton "Nouvel OR".
```

### 21-or-form-frontend.txt
```
Tu es un expert React + TypeScript + React Hook Form. Crée le formulaire de création d'un OR.

Wizard en 2 étapes :

Étape 1 — Client & Véhicule :
- Champ recherche client : <AsyncSelect> avec debounce 300ms → GET /api/clients/search?q=
  Résultat affiché : "{Nom} — {Téléphone} — {Nb véhicules} véhicule(s)"
- Après sélection client : liste de ses véhicules (GET /api/clients/{id}/vehicules)
  Chaque véhicule affiché : immatriculation, marque/modèle, km
- Bouton "Nouveau véhicule" → formulaire inline (immat, marque, modèle, année, carburant)

Étape 2 — Détails intervention :
- Kilométrage actuel (required, number, doit être >= km enregistré du véhicule)
- Type intervention (Select : Vidange | Révision | Diagnostic | Freinage | Distribution | Autre)
- Priorité (Radio : Normal / Urgent)
- Diagnostic initial (Textarea, 500 chars max)
- Technicien (Select optionnel, chargé depuis GET /api/employes?poste=Technicien)

Validation Zod à chaque étape, résumé en étape 2 avant soumission.
```

### 22-or-timer-frontend.txt
```
Tu es un expert React + TypeScript. Crée le composant minuteur de temps passé sur un OR.

Composant <ORTimer orId={string} startTime={Date | null} status={ORStatut} accumulatedMinutes={number} />

Comportement :
- Si statut === "EnCours" : démarre le timer depuis startTime, affiche HH:MM:SS, update toutes les secondes
- Si statut === "Suspendu" : affiche le temps accumulé sans incrémenter
- Si statut === "EnAttente" : affiche "—"
- Couleur progressive : vert (< 2h), orange (2-4h), rouge (> 4h)

Implémentation technique :
- useRef<number>(null) pour stocker l'ID du setInterval (pas de re-render inutile)
- useEffect cleanup pour clearInterval au unmount ET lors du changement de statut
- Synchronisation avec l'heure serveur : au montage, fetch GET /api/temps/serveur et calcule l'offset
- Persist dans sessionStorage le temps affiché (résistant au refresh onglet)
- Tooltip : "Temps cible : {cible}h pour ce type d'intervention"

Exporter aussi le hook useORTimer(orId, status, startTime) pour réutilisation.
```

### 23-or-signalr.txt
```
Tu es expert SignalR ASP.NET Core 8 + React TypeScript. Implémente le temps réel pour les statuts des OR.

BACKEND :
1. Crée OrdresHub : Hub, méthodes client exposées :
   - NotifyORCreated(ORSummaryDto or)
   - NotifyORStatusChanged(object { orId, numero, statut, timestamp })
   - NotifyORAssigned(object { orId, numero, technicienNom, timestamp })
2. Enregistrement dans Program.cs : AddSignalR(), MapHub<OrdresHub>("/hubs/ordres")
3. Authentification : le JWT est passé via query string pour les WebSockets
   options.Events.OnMessageReceived = ctx => { ctx.Token = ctx.Request.Query["access_token"]; }
4. Injecter IHubContext<OrdresHub> dans OrdreReparationService et appeler les notifications

FRONTEND :
1. Installe @microsoft/signalr
2. Hook useSignalR(hubUrl: string) :
   - Crée HubConnection avec withAutomaticReconnect([0, 2000, 5000, 10000])
   - Gère états : connecting | connected | reconnecting | disconnected
   - Expose on(event, handler) avec cleanup automatique dans useEffect
3. Dans la page Kanban : écouter les 3 événements → invalidateQueries TanStack Query
4. Toast notification (sonner ou react-hot-toast) avec l'info de chaque événement
5. Indicateur de connexion dans le header (point vert/orange/rouge)
```

---

## Module 4 — Stock & Achats Pièces

### 24-stock-articles-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le CRUD complet pour les articles du stock.

Entité Article complète : Id, Référence(unique), RéférenceOEM?, Désignation, Description?, Catégorie(enum), MarqueCompatible, FournisseurPrincipal, Unité(enum Pièce/Litre/Kg/Mètre), StockActuel(decimal), StockMinimum, StockMaximum?, PrixAchat(decimal), PrixVente(decimal), EmplacementRayonnage?, IsActif, DateDernierMouvement

Endpoints :
- GET /api/articles?search=&categorie=&stockBas=true&page=1&pageSize=20&sort=designation
  search sur Référence, RéférenceOEM, Désignation
  stockBas=true filtre StockActuel <= StockMinimum
- GET /api/articles/{id}
- POST /api/articles (valide unicité Référence)
- PUT /api/articles/{id}
- PATCH /api/articles/{id}/stock → { quantite, type(AjustementManuel|Inventaire), motif(required) }
  Crée un MouvementStock et met à jour DateDernierMouvement
- DELETE /api/articles/{id} → soft delete, refusé si StockActuel > 0 ou si utilisé dans un OR actif

GET /api/articles/categories → liste des catégories avec compteur d'articles par catégorie
```

### 25-stock-reception-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le système de réception de marchandises fournisseurs.

POST /api/bons-reception
Body : { fournisseur, référenceFournisseur?, dateReception, notes?, lignes: [{ articleId, quantiteRecue, prixUnitaireAchat, numeroLot? }] }

Logique transactionnelle (IDbContextTransaction) :
1. Vérifier que tous les articleIds existent et sont actifs
2. Créer le BonReception avec numéro BR-{année}-{séq}
3. Pour chaque ligne, dans une boucle :
   a. Créer la LigneBonReception
   b. Incrémenter Article.StockActuel += quantiteRecue
   c. Calculer nouveau PrixAchat moyen pondéré : (stockActuelAvant * ancienPA + qteRecue * nouveauPA) / (stockActuelAvant + qteRecue)
   d. Créer MouvementStock { type:EntréeBR, référenceDocument:numeroBR, articleId, quantité, stockAvant, stockAprès, userId }
   e. Mettre à jour Article.DateDernierMouvement
4. Commit ou Rollback complet

GET /api/bons-reception?dateFrom=&dateTo=&fournisseur=&page= avec pagination
GET /api/bons-reception/{id} avec lignes et mouvements
```

### 26-stock-consommation-or-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le système de consommation de pièces sur un OR.

POST /api/ordres-reparation/{orId}/lignes
Body : { type:"Piece"|"MO", articleId?, description, quantite, prixUnitaire? }

Règles :
1. L'OR doit être en statut EnCours (sinon 409)
2. Si type = "Piece" :
   a. Vérifier Article.StockActuel >= quantite (sinon 422 avec message clair)
   b. Utiliser une transaction pour décrémenter le stock atomiquement
   c. Créer MouvementStock { type:SortieOR, orId, quantité négative, stockAvant, stockAprès }
   d. PrixUnitaire par défaut = Article.PrixVente si non fourni
3. Si type = "MO" : description obligatoire, pas de décrément stock
4. Recalculer OR.MontantTotal en fin de transaction

GET /api/ordres-reparation/{orId}/lignes → toutes les lignes groupées par type

DELETE /api/ordres-reparation/{orId}/lignes/{ligneId} :
- Si c'était une pièce : réapprovisionner le stock (MouvementStock type AnnulationOR)
- Recalculer MontantTotal
- OR doit être EnCours pour modifier les lignes
```

### 27-stock-alertes-api.txt
```
Tu es un expert .NET Hangfire et notifications. Crée le système d'alertes de stock bas.

1. Job Hangfire récurrent "check-stock-min", planifié toutes les heures :
   RecurringJob.AddOrUpdate("check-stock-min", () => stockAlertService.CheckAsync(), "0 * * * *");

   Dans CheckAsync() :
   a. Requête : articles où StockActuel <= StockMinimum AND IsActif = true
   b. Pour chaque article : vérifier si AlerteStock active (non résolue) existe déjà pour éviter le spam
   c. Si non → créer AlerteStock { articleId, stockActuel, stockMinimum, dateDetection, statut:Active }
   d. Créer Notification in-app { type:StockBas, message:"Stock bas : {désignation} ({stockActuel} restants)", level:Warning }
   e. Broadcaster via SignalR : hub NotificationsHub → méthode "STOCK_ALERT"

2. Endpoints :
   GET /api/alertes/stock-bas → alertes actives avec détail article (pour le dashboard)
   PATCH /api/alertes/{id}/resoudre → { commentaire } → statut Résolue

3. Configurer Hangfire dans Program.cs avec PostgreSQL storage et dashboard sur /hangfire (auth Admin)
```

### 28-stock-list-frontend.txt
```
Tu es un expert React + TypeScript + TanStack Query. Crée la page de gestion du stock.

Route /stock/articles

Tableau avec colonnes : Référence | Désignation | Catégorie | Stock | Seuil min | PU HT vente | Emplacement | Statut stock | Actions
Colonne "Statut stock" : badge Vert (OK) / Orange (<150% seuil) / Rouge (≤ seuil)

Barre de filtres :
- Input recherche texte (debounce 300ms)
- Select catégorie (options depuis /api/articles/categories)
- Toggle "Stock bas uniquement" avec compteur en badge rouge
- Bouton "Réinitialiser filtres"

Performance :
- TanStack Virtual (@tanstack/react-virtual) pour virtualiser les lignes (> 1000 articles sans lag)
- Pagination server-side avec TanStack Query (keepPreviousData pour UX fluide)

Actions par ligne :
- Éditer → modal formulaire
- Mouvements → drawer historique
- Ajustement → modal rapide (quantité + motif)
- Désactiver (avec confirmation)

Boutons en header : "Nouvel article" | "Importer CSV" | "Exporter Excel"
```

---

## Module 5 — CRM & Suivi Véhicules

### 29-crm-historique-api.txt
```
Tu es un expert ASP.NET Core 8 et EF Core. Crée l'endpoint d'historique complet d'un véhicule.

GET /api/vehicules/{id}/historique

Réponse JSON structurée :
{
  vehicule: { id, immat, vin, marque, modèle, année, carburant, kmActuel },
  client: { id, nom, prénom, téléphone, email },
  statistiques: { nbInterventions, montantTotalHT, premièreVisite, dernièreVisite, kmParcourus, prochainEntretienEstimé },
  interventions: [
    { orId, numero, date, kmAuMoment, typeIntervention, technicien, statut, montantHT,
      pièces: [{ référence, désignation, qte, puHT, totalHT }],
      mainOeuvre: [{ description, heures, tauxHoraire, totalHT }] }
  ],
  offresEnvoyées: [{ id, types[], canal, dateEnvoi, statut }]
}

Requête optimisée :
- Une seule requête SQL via projection EF Core avec Include imbriqués
- Projection immédiate vers DTO (pas de chargement en mémoire des entités complètes)
- Tri interventions : DateOuverture DESC
- Calcul statistiques en SQL (SUM, COUNT, MIN, MAX agrégés dans la même requête)
```

### 30-crm-moteur-regles.txt
```
Tu es un expert .NET Domain-Driven Design. Crée un moteur de règles d'entretien préventif.

Namespace : GarageSystem.Domain.Services.Maintenance

Interface IRegleEntretien :
  string Nom { get; }
  NiveauUrgence CalculerUrgence(Vehicule v, List<OrdreReparation> historique) 
  // Retourne null si pas due, sinon l'urgence

Règles à implémenter (chacune dans sa classe) :
1. RegleVidangeHuile : dernier OR type Vidange + 5000km OU + 180 jours (selon config par cylindrée)
2. RegleKitDistribution : kmActuel > kmDernierKit + 60000 OU > 4 ans sans changement
3. ReglePlaquettesFrein : kmActuel > kmDernièresPlaquettes + 25000
4. RegleVidangeBoite : kmActuel > kmDernièreVidangeBoite + 80000 OU > 4 ans
5. RegleFiltreHabitacle : > 1 an depuis dernier changement
6. RegleRevisionGenerale : kmActuel > kmDernièreRévision + 15000 OU > 12 mois

MoteurOffresService.CalculerOffres(Vehicule v, List<OrdreReparation> historique) :
- Exécute toutes les règles
- Retourne List<OffreEntretien> { type, urgence(Immédiat/Bientôt/Préventif), kmRestants?, joursRestants?, messageSuggéré }
- Tri : Immédiat en premier

Configurer les seuils dans appsettings.json (pas hardcodés dans les règles).
```

### 31-crm-offres-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le système de génération et envoi d'offres aux clients.

GET /api/offres/a-envoyer?page=1&pageSize=50
→ liste des véhicules avec offres dues (calculées à la volée via MoteurOffresService)
→ Réponse : { vehiculeId, immat, client{nom,téléphone,email}, offres[], dernierEnvoi? }

POST /api/offres/envoyer
Body : { vehiculeIds: [guid], canal: "SMS"|"Email"|"LesDeux" }

Pour chaque vehiculeId :
1. Calculer les offres via MoteurOffresService
2. Récupérer le template de message approprié (SMS ou Email) depuis la DB
3. Substituer les variables dans le template
4. Créer OffreEnvoyée { vehiculeId, types:string[], canal, dateEnvoi, statut:Envoyée, messageEnvoyé }
5. Envoyer via INotificationService (interface avec implémentation Mock pour dev, Twilio/MailKit pour prod)
6. Retourner { vehiculesTraités, envoyées, échecs: [{ vehiculeId, raison }] }

PATCH /api/offres/{id}/statut → { statut: Acceptée|Refusée|SansRéponse }
GET /api/offres/vehicule/{vehiculeId} → historique des offres envoyées au client
```

### 32-crm-job-hangfire.txt
```
Tu es un expert .NET Hangfire. Configure le job de scan quotidien des véhicules à relancer.

1. Crée OffresScanJob avec IRecurringJob dans GarageSystem.Infrastructure.Jobs

   Méthode ExecuteAsync() :
   a. Charger tous les véhicules actifs avec leur historique des 2 dernières années (EF Core avec projection)
   b. Pour chaque véhicule : appeler MoteurOffresService.CalculerOffres()
   c. Si des offres de niveau Immédiat ou Bientôt existent :
      - Vérifier que la dernière OffreEnvoyée date de plus de 30 jours
      - Si oui : créer une Notification in-app pour l'équipe CRM
      - Broadcaster via SignalR NotificationsHub : "OFFRES_DISPONIBLES" avec { count, timestamp }
   d. Logger : "Scan terminé : {totalVéhicules} véhicules, {offresGénérées} offres détectées"

2. Enregistrement dans Program.cs :
   RecurringJob.AddOrUpdate<OffresScanJob>("scan-offres-vehicules", j => j.ExecuteAsync(), "0 8 * * *");
   // Tous les jours à 8h00

3. Endpoint admin : POST /api/offres/scan-maintenant → déclenche le job manuellement [Authorize(Roles="Admin")]
```

### 33-crm-vehicule-fiche-frontend.txt
```
Tu es un expert React + TypeScript. Crée la fiche véhicule avec timeline des interventions.

Route /vehicules/{id}

Layout deux colonnes (lg:grid lg:grid-cols-3 gap-6) :
Colonne gauche (1/3) :
- Photo placeholder (icône voiture SVG colorée selon carburant)
- Immatriculation en très grand (text-3xl font-bold)
- Badge marque/modèle/année
- Kilométrage avec icône compteur
- Lien client (card cliquable → /clients/{clientId})
- Bouton "Créer OR" (action principale)
- Bouton "Envoyer offre"

Colonne droite (2/3) — onglets [Timeline | Offres | Statistiques] :

Onglet Timeline :
- Composant <VehiculeTimeline> avec entrée par intervention
- Chaque intervention : date, km, type (badge coloré), technicien, montant
- Click → expand inline : liste des pièces et MO
- Filtre par type d'intervention (chips)

Onglet Offres :
- Cards d'offres dues (avec urgence color coding)
- Liste des offres envoyées avec statut chips

Données chargées depuis GET /api/vehicules/{id}/historique via TanStack Query.
```

---

## Module 6 — Facturation

### 34-billing-devis-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le système de gestion des devis.

POST /api/devis/depuis-or/{orId}
Logique :
1. Vérifier que l'OR n'a pas déjà un devis actif (statut != Refusé/Expiré)
2. Créer Devis { numéro:DEV-{année}-{séq}, orId, clientId(via OR→Véhicule→Client), statut:Brouillon }
3. Copier les lignes de l'OR vers les lignes du devis :
   - Pièces : référence, désignation, qte, puHT, tva(19%), totalHT
   - MO : description, heures, tauxHoraire(depuis config), totalHT, tva(19%)
4. Calculer : SousTotalHT, MontantTVA (19%), TotalTTC
5. DateExpiration = UtcNow + 30 jours

Transitions de statut :
PATCH /api/devis/{id}/valider → Validé (bloque la modification des lignes)
PATCH /api/devis/{id}/envoyer → EnvoyéClient, enregistre DateEnvoi
PATCH /api/devis/{id}/accepter → Accepté
PATCH /api/devis/{id}/refuser → { motif } → Refusé

GET /api/devis/{id} → devis complet avec lignes
GET /api/devis?orId=&clientId=&statut=&page= → liste avec filtres
```

### 35-billing-facture-api.txt
```
Tu es un expert ASP.NET Core 8. Crée l'endpoint de conversion devis → facture.

POST /api/factures/depuis-devis/{devisId}

Validation :
1. Devis statut = Accepté (sinon 422)
2. OR associé statut = TerminéTechnicien (sinon 409)
3. Pas de facture existante pour ce devis (sinon 409 "Facture déjà générée")

Création de la facture (dans une transaction) :
1. Numérotation séquentielle IMMUABLE : FAC-{année}-{séq} — ne jamais réutiliser un numéro
2. Snapshot client complet (nom, adresse, NIF au moment de la facturation — immuable)
3. Snapshot des lignes depuis le devis (prix figés à la date de facturation)
4. DateFacture = UtcNow, DateEchéance = UtcNow + 30 jours
5. Statut : Émise
6. Lier Facture → OR (OrdreReparation.FactureId = facture.Id)
7. Passer l'OR au statut Livré

Une facture ne peut pas être supprimée, seulement annulée via avoir.
Retourner 201 Created avec la facture complète.
```

### 36-billing-paiements-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le système d'enregistrement des paiements.

POST /api/factures/{factureId}/paiements
Body : { montant(decimal > 0), modePaiement(enum Espèces/Virement/Chèque/CB), référence?, datePaiement(date, <= aujourd'hui) }

Logique transactionnelle :
1. Facture doit être Émise ou PartiellemntPayée (sinon 409)
2. montant <= (Facture.TotalTTC - Facture.MontantDéjàPayé), sinon 422 "Montant dépasse le restant dû"
3. Créer le Paiement
4. Mettre à jour Facture.MontantDéjàPayé += montant
5. Si MontantDéjàPayé >= TotalTTC → Facture.Statut = Soldée, Facture.DateSolde = UtcNow
6. Sinon → Facture.Statut = PartiellemntPayée

Endpoints complémentaires :
GET /api/factures/{id}/paiements → liste des paiements
GET /api/factures?statut=&clientId=&dateFrom=&dateTo=&page= → liste avec filtres et tri
GET /api/caisse/recap-jour → { totalEspèces, totalVirement, totalChèque, totalCB, totalGeneral, nbFacturesSoldées }
```

### 37-billing-pdf-api.txt
```
Tu es un expert .NET QuestPDF. Crée la génération de PDF professionnels pour factures et devis.

Package : QuestPDF (licence Community, gratuite pour revenus < 1M$/an)
Configurer en Program.cs : QuestPDF.Settings.License = LicenseType.Community;

Classe FacturePdfDocument : IDocument
Layout Page A4, marges 2cm :

HEADER (fond gris clair) :
- Logo garage (depuis config, base64 PNG), Nom, Adresse, Téléphone, NIF/RC
- À droite : "FACTURE" en grand (ou "DEVIS"), Numéro, Date, Échéance

SECTION CLIENT :
- "Facturé à :" + snapshot client (nom, adresse, NIF si société)

TABLEAU LIGNES :
Colonnes : N° | Désignation | Qté | Prix HT | TVA% | Total HT
- Lignes pièces et MO avec alternance de couleur
- Séparateur avant le bloc totaux

BLOC TOTAUX (aligné à droite) :
Sous-total HT | TVA 19% | TOTAL TTC (en gras, plus grand)

FOOTER : "Payé le {date} par {mode}" (si soldée) | Conditions de règlement | Mentions légales

Endpoint GET /api/factures/{id}/pdf → FileContentResult("application/pdf")
Endpoint GET /api/devis/{id}/pdf → idem

Paramétrer les infos du garage dans appsettings.json section "Garage" : nom, adresse, logo, NIF.
```

### 38-billing-frontend.txt
```
Tu es un expert React + TypeScript. Crée la page de gestion des factures.

Route /facturation/factures

Stat cards en header (4 colonnes) :
- CA du mois (TTC) | Encaissé | Reste à encaisser | Factures en retard (avec badge rouge)

Tableau colonnes : N° | Date | Échéance | Client | Véhicule | Total TTC | Statut | Actions
Badges statut : Émise (bleu) | Partiellement payée (orange) | Soldée (vert) | En retard (rouge) | Annulée (gris)

Filtres : date range picker | select statut (multi) | autocomplete client
Tri par colonne (click sur l'en-tête)

Modal "Enregistrer paiement" :
- Montant (pre-rempli avec le restant dû)
- Mode de paiement (radio buttons avec icônes)
- Référence (input, affiché uniquement si Virement ou Chèque)
- Date paiement (date picker, défaut aujourd'hui)
- Résumé : "Nouveau solde : {montant}"

Actions par ligne :
- PDF (ouvre dans nouvel onglet)
- Paiement (modal)
- Annuler (admin, confirmation obligatoire + motif)
```

---

## Module 7 — Sociétés Abonnées

### 39-fleet-societes-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le CRUD des sociétés et leurs contrats.

Entité Société : Id(Guid), RaisonSociale, NRC(unique), NIF, AdresseSiège, TéléphoneRespAchats, EmailFacturation, IsActif
Entité Contrat : Id, SociétéId(FK), DateDébut, DateFin?, TypeTarif(enum Forfait/PrixRéduit/TarifNormal), PlafondMensuelDZD?(decimal), RemisePourcentage?(0-100), ConditionsParticulières?, IsActif

Endpoints Sociétés : GET/POST/PUT + PATCH /{id}/desactiver
GET /api/societes/{id}/contrat-actif → contrat valide à la date d'aujourd'hui (DateDébut <= today AND (DateFin IS NULL OR DateFin >= today))

Endpoints Contrats :
POST /api/societes/{id}/contrats → crée nouveau contrat, archive l'ancien (IsActif = false)
GET /api/societes/{id}/contrats → historique

Service TarifContratService.AppliquerTarif(Contrat contrat, decimal montantNormal) :
- Forfait : retourner le montant forfaitaire fixe (config par type d'intervention)
- PrixRéduit : montantNormal * (1 - RemisePourcentage/100)
- TarifNormal : montantNormal
```

### 40-fleet-flotte-api.txt
```
Tu es un expert ASP.NET Core 8. Crée la gestion de flotte pour les sociétés abonnées.

Entité VéhiculeSociété : Id, SociétéId(FK), VéhiculeId(FK), NuméroFlotte?, ConducteurHabituel?, DateAffectation, DateRetrait?, IsActif

Endpoints :
GET /api/societes/{id}/flotte → véhicules actifs avec stats du mois courant (nb OR, montant)
POST /api/societes/{id}/flotte → body : { vehiculeId? (existant) ou vehicule{immat, marque, modèle, année} (nouveau), numFlotte?, conducteur? }
  Si vehiculeId fourni : affecter le véhicule existant
  Sinon : créer le véhicule ET l'affecter (transaction)
DELETE /api/societes/{id}/flotte/{vehiculeId} → retire le véhicule de la flotte (DateRetrait = today, IsActif = false sur VéhiculeSociété)

GET /api/societes/{id}/or-du-mois?mois=2024-11 → tous les OR du mois pour les véhicules de la flotte (pour facturation groupée)

Lors de la création d'un OR pour un véhicule de flotte : détecter automatiquement la société et appliquer le tarif du contrat actif.
```

### 41-fleet-facturation-groupee-api.txt
```
Tu es un expert ASP.NET Core 8. Crée la facturation mensuelle groupée pour les sociétés.

POST /api/societes/{id}/facture-mensuelle
Body : { mois:"2024-11", orIds?:[...] } — si orIds vide, prendre tous les OR du mois non encore facturés groupément

Logique (transaction complète) :
1. Récupérer les OR qualifiés : statut = Livré, VéhiculeSociété.SociétéId = id, mois correspondant, FactureGroupéeId IS NULL
2. Vérifier qu'il y a au moins 1 OR
3. Appliquer le tarif du contrat actif sur chaque OR (TarifContratService)
4. Calculer le plafond : si dépassement → continuer mais enregistrer un flag DépassementPlafond = true
5. Créer FactureGroupée { numéro:FAC-SOC-{année}-{séq}, société(snapshot), période, lignes regroupées par véhicule, totaux }
6. Marquer les OR : OrdreReparation.FactureGroupéeId = factureGroupée.Id

Endpoints complémentaires :
GET /api/societes/{id}/historique-factures?page= → toutes les factures groupées
GET /api/societes/{id}/facture-mensuelle/preview?mois= → aperçu sans créer (dry run)
```

---

## Module 8 — RH & Paie Employés

### 42-rh-employes-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le CRUD complet pour les employés.

Entité Employé : Id(Guid), Nom, Prénom, DateNaissance, Téléphone, Email, Adresse, Poste(enum), Département, SalaireBase(decimal), TypeContrat(enum CDI/CDD/Temporaire), DateEmbauche, DateFinContrat?, NuméroSécuritéSociale(chiffré en DB via EF Core Value Converter + AES), UserId(FK AppUser)?, IsActif

Endpoints :
GET /api/employes?poste=&departement=&actif= avec pagination
GET /api/employes/{id} → profil complet (salaire masqué si pas rôle RH/Admin)
POST /api/employes → crée l'employé ET le AppUser en même temps (transaction), envoie email bienvenue avec mot de passe temporaire
PUT /api/employes/{id}
PATCH /api/employes/{id}/desactiver → IsActif = false, désactive aussi AppUser.LockoutEnd = DateTimeOffset.MaxValue

Sécurité :
- SalaireBase et NSS : retournés seulement si rôle RH ou Admin (sinon null dans le DTO)
- Utilise une projection conditionnelle basée sur le rôle de l'utilisateur courant
```

### 43-rh-pointage-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le système de pointage des employés.

Entité Pointage : Id, EmployéId(FK), Date, HeureEntrée(TimeOnly), HeureSortie?(TimeOnly), TypeJour(enum Travaillé/Congé/Maladie/Férié/Weekend), NbHeuresTravaillées(decimal, calculé), NbHeuresSup(decimal, calculé), Notes?

POST /api/pointage/entree
Body : { employeId } (ou utiliser l'employé connecté si pas fourni)
- Vérifier qu'il n'existe pas déjà un pointage EntrÉe ce jour pour cet employé
- HeureEntrée = TimeOnly.FromDateTime(DateTime.Now)
- Créer Pointage { statut:EnCours }

POST /api/pointage/sortie
Body : { employeId? }
- Trouver le pointage En cours du jour
- HeureSortie = TimeOnly.Now
- Calculer NbHeuresTravaillées = (HeureSortie - HeureEntrée).TotalHours
- NbHeuresSup = Math.Max(0, NbHeuresTravaillées - 8)
- Mettre à jour le pointage

GET /api/pointage?employeId=&mois=2024-11 → pointages du mois
GET /api/pointage/aujourd-hui → { présents:[{employé, heureEntrée}], absents:[{employé}] }
GET /api/pointage/mensuel/{employeId}/{annee}/{mois} → { jours:[], totalHeures, heuresSup, joursAbsents, conges }
```

### 44-rh-paie-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le moteur de calcul de paie mensuelle.

POST /api/paie/calculer
Body : { employeId, mois:"2024-11" }

Classe PaieCalculateurService.CalculerBulletin(Employé emp, List<Pointage> pointages, List<Prime> primes) :

1. JoursTravaillés = pointages.Count(p => p.TypeJour == Travaillé)
2. JoursOuvrablesMois = calculer les jours ouvrables du mois (hors weekends + jours fériés algériens)
3. SalaireBase propratisé = SalaireBase * (JoursTravaillés / JoursOuvrablesMois)
4. MajHeureSup = (SalaireBase / 173.33m) * 1.25m * TotalHeuresSup
5. TotalPrimes = SUM des primes du mois
6. SalaireBrut = SalaireBasePropratisé + MajHeureSup + TotalPrimes
7. Cotisations (paramétrable dans appsettings) :
   - CNAS salarié : 9% du brut
   - Retraite anticipée : 2% (si applicable)
   - IRG : calcul par tranche (tranches DZ configurables)
8. SalaireNet = SalaireBrut - TotalCotisations

Retourner BulletinPaie complet. Si bulletin déjà généré pour ce mois → 409 Conflict.
PATCH /api/paie/{id}/marquer-paye → { datePaiement, modePaiement }
GET /api/paie/{id}/pdf → bulletin PDF via QuestPDF
```

### 45-rh-conges-api.txt
```
Tu es un expert ASP.NET Core 8. Crée la gestion des congés et absences.

Entité DemandeConge : Id, EmployéId(FK), Type(enum Annuel/Maladie/Maternité/Événementiel/SansRetenue), DateDébut, DateFin, NbJours(calculé), Motif, Statut(enum EnAttente/Approuvé/Refusé), ApprobateurId?, DateDecision?, CommentaireDecision?

Endpoints :
POST /api/conges → soumettre une demande
  Validations :
  - DateDébut >= demain (pas de congé rétroactif sauf rôle RH)
  - Pas de chevauchement avec congés existants (Approuvé)
  - SoldeConge.AnnuelRestant >= NbJours si type Annuel

GET /api/conges/mes-demandes → pour l'employé connecté
GET /api/conges/a-approuver → pour RH/Admin uniquement (statut EnAttente)
PATCH /api/conges/{id}/approuver → { commentaire? } → créer les Pointages de type Congé pour chaque jour
PATCH /api/conges/{id}/refuser → { motif } obligatoire

Entité SoldeConge : Id, EmployéId, Année, AnnuelTotal(ex:30), AnnuelPris, AnnuelRestant(calculé)
```

---

## Module 9 — Statistiques & Alertes

### 46-stats-ca-api.txt
```
Tu es un expert ASP.NET Core 8 et SQL. Crée les endpoints de statistiques financières.

GET /api/stats/ca?granularite=jour|semaine|mois&dateFrom=&dateTo=

Requête EF Core via GroupBy avec projection :
var stats = await _db.Factures
  .Where(f => f.Statut != FactureStatut.Annulée && f.DateFacture >= dateFrom && f.DateFacture <= dateTo)
  .GroupBy(f => granularite == "jour" ? f.DateFacture.Date : ...)
  .Select(g => new { période = g.Key, caHT = g.Sum(f => f.SousTotalHT), ... })
  .ToListAsync();

Calculer l'évolution vs la période précédente (même durée).

Autres endpoints :
GET /api/stats/recap-journee → { caHT, caTTC, nbOR, nbFactures, paiementsParMode:[{mode,montant}] }
GET /api/stats/top-clients?limit=10&mois= → classement par CA généré
GET /api/stats/evolution-annuelle?annee=2024 → 12 mois avec CA mensuel
GET /api/stats/performance-techniciens?mois= → { technicien, nbOR, heuresMO, caGeneré, txCompletion }

Cache IMemoryCache TTL 5 minutes sur tous les endpoints stats, avec clé incluant les paramètres.
```

### 47-stats-techniciens-api.txt
```
Tu es un expert ASP.NET Core 8. Crée les statistiques de performance des techniciens.

GET /api/stats/techniciens?mois=2024-11&sort=caGenere|nbOR|txCompletion

Pour chaque technicien actif :
- NbORAssignés dans la période
- NbORTerminés (statut TerminéTechnicien ou Livré)
- TauxCompletion = (NbORTerminés / NbORAssignés * 100) si NbORAssignés > 0 sinon 0
- TempsMoyenParOR (minutes, calculé via HistoriqueStatutOR)
- TotalHeuresMO = SUM des lignes de type MO sur les OR terminés
- CAGeneré = SUM(MontantTotal) des OR terminés

GET /api/stats/techniciens/{id}/evolution?nbMois=6 → performance mensuelle sur N derniers mois

Réponse : { période, classement:[...], meilleurCA:{id,nom,montant}, meilleurTaux:{id,nom,taux}, tempsMoyenGlobal }
```

### 48-stats-stock-api.txt
```
Tu es un expert ASP.NET Core 8. Crée les statistiques de consommation et rotation du stock.

GET /api/stats/stock/rotation?jours=90
Pour chaque article ayant eu des mouvements :
  StockMoyen = (StockDebut + StockFin) / 2 (approximation sur la période)
  ConsommationPériode = SUM(abs(quantité)) des mouvements SortieOR
  Rotation = ConsommationPériode / StockMoyen (ratio annualisé)

GET /api/stats/stock/top-articles?limit=20&type=volume|montant&mois=
GET /api/stats/stock/dormants?joursInactif=90 → articles sans mouvement depuis N jours avec valeur stock immobilisée

GET /api/stats/stock/abc
Classification ABC :
1. Trier les articles par valeur consommée DESC (qte * prixAchat)
2. Calculer le cumulatif en %
3. A : articles représentant 0-80% de la valeur
4. B : 80-95%
5. C : 95-100%
Retourner chaque article avec sa classe (A/B/C) et son rang
```

### 49-stats-dashboard-frontend.txt
```
Tu es un expert React + TypeScript + Recharts. Crée le dashboard principal de statistiques.

Route /stats

Sélecteur de période en haut (Today | 7 jours | 30 jours | Ce mois | Cette année)
Refresh automatique toutes les 5 minutes via TanStack Query refetchInterval.

Layout :
Ligne 1 — 4 Stat Cards : CA du jour | CA du mois | OR en cours (live) | Alertes actives
Ligne 2 — 2 graphiques côte à côte :
  - LineChart : CA des 30 derniers jours (axe Y en DZD, tooltip formaté)
  - BarChart horizontal : Top 5 techniciens par CA du mois
Ligne 3 — 2 graphiques :
  - PieChart : répartition CA par type d'intervention (avec légende)
  - Liste Top 10 clients (avec sparkline)
Ligne 4 :
  - BarChart grouped : comparaison mensuelle sur 6 mois (CA vs nb OR)

Chaque graphique Recharts :
- ResponsiveContainer width="100%"
- Tooltip avec Intl.NumberFormat pour les montants DZD
- Animation initiale de 600ms
- État de chargement via Skeleton (shadcn/ui ou custom)
```

### 50-stats-alertes-frontend.txt
```
Tu es un expert React + TypeScript. Crée le panneau d'alertes actives en temps réel.

Composant <AlertesPanel /> affiché dans le layout principal (sidebar ou floating panel)

Catégories (badge avec compteur coloré sur l'icône cloche dans la navbar) :
1. Stock bas (rouge) → lien vers /stock?filter=stockBas
2. Plafonds contrats > 80% (orange) → lien vers /societes/{id}
3. OR en attente > 2h non assignés (jaune) → lien vers /or/kanban
4. Offres à envoyer (bleu) → lien vers /crm/offres

Chaque alerte = ligne cliquable : icône type + message court + temps relatif ("il y a 23 min")
Maximum 10 alertes visibles, lien "Voir toutes" pour la page dédiée.

Temps réel via useSignalR :
- Écouter : "STOCK_ALERT", "PLAFOND_ALERT", "OR_WAITING_TOO_LONG", "OFFRES_DISPONIBLES"
- Chaque événement : ajouter l'alerte en haut de la liste + son discret (si permission accordée)
- Invalider le compteur total dans la navbar

Badge total dans la navbar : useQuery sur GET /api/alertes/count avec refetch 60s.
```

---

## Module 10 — Référentiels

### 51-ref-clients-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le CRUD complet pour les clients.

Entité Client (complète) : Id(Guid), Type(enum Particulier/Société), Nom, Prénom?, RaisonSociale?, Téléphone(unique, format algérien validé), TéléphoneAlt?, Email?, Adresse, Wilaya(enum les 58 wilayas), DateNaissance?(Particulier), NRC?(Société), NIF?(Société), IsActif, DateCreation

Endpoints :
GET /api/clients?search=&type=&wilaya=&page=1&pageSize=20
  search cherche dans : Nom, Prénom, RaisonSociale, Téléphone, Email, ET dans Véhicule.Immatriculation des véhicules du client
GET /api/clients/{id} → profil + véhicules + statistiques { nbOR, caTotalHT, dernièreVisite }
POST /api/clients → valide unicité Téléphone (international format +213...)
PUT /api/clients/{id}
DELETE /api/clients/{id} → soft delete, refusé si OR actif en cours

GET /api/clients/search?q= → top 10 pour autocomplete : { id, displayName, telephone, nbVehicules }
GET /api/clients/{id}/vehicules → véhicules du client avec dernier OR
```

### 52-ref-vehicules-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le CRUD complet pour les véhicules.

Entité Véhicule : Id(Guid), ClientId(FK), Immatriculation(unique, regex algérien [0-9]{5}-[0-9]{3}-[0-9]{2}), VIN?(17 chars), Marque, Modèle, Version?, Année(1990-annéeCourante), Carburant(enum), Cylindrée?, Transmission(enum), Couleur?, KilométrageActuel, KilométrageDernièreVisite, DateDernièreVisite, IsActif

Endpoints :
GET /api/vehicules?search=&marque=&carburant=&clientId=&avecEntretienDu=true&page=
  avecEntretienDu=true → filtrer les véhicules avec au moins une offre d'entretien due (appel MoteurOffresService)
GET /api/vehicules/{id} → + client + nb OR + offres dues
POST /api/vehicules { + clientId obligatoire }
PUT /api/vehicules/{id}
PATCH /api/vehicules/{id}/kilometrage → { km } — valider km >= KilométrageActuel
GET /api/vehicules/search?q= → autocomplete sur immatriculation + marque/modèle
GET /api/vehicules/{id}/prochain-entretien → résultat MoteurOffresService (sans créer d'offre)
```

### 53-ref-articles-api.txt
```
Tu es un expert ASP.NET Core 8. Crée le CRUD pour le catalogue articles/pièces détachées.

Entité Article (version complète) :
Id, Référence(unique, alphanum), RéférenceOEM?, Désignation, Description?, Catégorie(enum), MarquesCompatibles(string, séparées par virgule), FournisseurPrincipalId(FK)?
Unité(enum Pièce/Litre/Kg/Mètre), StockActuel(decimal), StockMinimum, StockMaximum?
PrixAchat(decimal), PrixVente(decimal), MargeHT(calculée = (PV-PA)/PA*100)
EmplacementRayonnage?, CodeBarre?, IsActif, DateDernierMouvement, DateDernièreCommande?

Endpoints :
GET /api/articles?search=&categorie=&fournisseur=&stockBas=&page=&sort=
GET /api/articles/{id} → + derniers mouvements (10 derniers)
POST/PUT/DELETE articles (CRUD standard avec validations)
GET /api/articles/categories → [{ nom, count }]
GET /api/articles/search-oem?ref= → recherche par code OEM (pour identifier pièce d'après numéro constructeur)
GET /api/articles/search?q= → autocomplete pour les formulaires OR (retourne ref, designation, stock, pv)
```

### 54-ref-materiels-api.txt
```
Tu es un expert ASP.NET Core 8. Crée la gestion des équipements de l'atelier.

Entité Matériel : Id, Nom, Type(enum Élévateur/Outil/Diagnostic/Informatique/Autre), Marque, Modèle, NuméroSérie, DateAchat, ValeurAchat, FournisseurSAV?, ContactSAV?, DernièreMaintenance?, ProchaineMaintenance?, IntervalleMaintenanceJours(int), StatutFonctionnement(enum OK/EnPanne/EnMaintenance), Notes?

Endpoints CRUD standards + :
PATCH /api/materiels/{id}/maintenance-effectuee → { dateEffective, commentaire }
  Met à jour DernièreMaintenance = dateEffective
  Calcule ProchaineMaintenance = dateEffective + IntervalleMaintenanceJours
  Remet StatutFonctionnement = OK si était EnMaintenance

PATCH /api/materiels/{id}/signaler-panne → { description } → statut EnPanne, crée une notification

GET /api/materiels/a-maintenir?jours=30 → équipements avec ProchaineMaintenance dans les N prochains jours

Job Hangfire hebdomadaire "check-maintenance-materiels" :
- Vérifie les maintenances imminentes (ProchaineMaintenance <= today + 7)
- Crée une notification pour chaque matériel concerné
```

### 55-ref-clients-list-frontend.txt
```
Tu es un expert React + TypeScript + TanStack Query. Crée la page de gestion des clients.

Route /clients

Deux modes d'affichage (toggle persisté en localStorage) :
1. Tableau : Nom/Raison sociale | Type | Téléphone | Wilaya | Nb véhicules | Nb OR | Dernière visite | Actions
2. Grille de cartes : avatar initiales coloré + infos clés + stats

Barre de recherche universelle (debounce 300ms, cherche nom/tel/immat)
Filtres sidebar collapsible : Type (Particulier/Société), Wilaya (select multi), Avec OR actif (toggle)

Actions par client :
- Voir fiche → /clients/{id}
- Créer OR → /or/nouveau?clientId={id}
- Appeler → ouverture tel:
- Modifier → modal

Modal "Nouveau client" :
- Toggle Particulier / Société (change les champs affichés)
- Validation Zod avec React Hook Form
- Champ téléphone avec format algérien automatique (+213 ou 0...)
- Soumission → POST → fermeture modal + refresh liste + toast success

Pagination server-side, 20 par page, avec info "X clients trouvés".
```

### 56-ref-vehicules-list-frontend.txt
```
Tu es un expert React + TypeScript. Crée la page de gestion des véhicules avec vue rapide.

Route /vehicules

Tableau avec colonnes : Immatriculation | Marque/Modèle/Année | Carburant | Km | Client | Dernière visite | Entretiens dus | Actions
Colonne "Entretiens dus" : icône verte (OK) ou badge rouge/orange avec nombre d'entretiens en retard

Filtres : Marque (multi-select avec suggestions), Carburant (checkboxes), Client (autocomplete), Avec entretien dû (toggle)

Drawer "Vue rapide" (ouvert par click sur la ligne) :
- Largeur 480px depuis la droite
- Header : immat + marque/modèle + client lié (cliquable)
- Section "3 dernières interventions" (liste condensée avec dates et montants)
- Section "Entretiens recommandés" (cards avec urgence et description)
- Boutons d'action : "Voir fiche complète" | "Créer OR" | "Envoyer offre"

Modal "Nouveau véhicule" :
- Étape 1 : sélection/création client
- Étape 2 : détails véhicule
- Validation immatriculation format algérien en temps réel
```

### 57-ref-import-csv.txt
```
Tu es un expert .NET CsvHelper + React. Crée le système d'import/export du catalogue pièces en CSV.

BACKEND :
Package CsvHelper (NuGet). Classe ArticleCsvRecord correspondant aux colonnes du fichier.

POST /api/articles/import-csv (multipart/form-data, champ "file")
1. Valider l'extension (.csv) et la taille (max 5MB)
2. Lire avec CsvHelper, configuration : HasHeaderRecord=true, ignorer les colonnes inconnues
3. Pour chaque ligne, valider :
   - référence : obligatoire, unique (vérifier en batch)
   - prixAchat et prixVente : > 0
   - categorie : valeur de l'enum
   - stockMinimum : >= 0
4. Si erreurs de validation → retourner 422 avec la liste SANS rien importer (fail fast)
5. Mode upsert : INSERT si référence nouvelle, UPDATE si existante (EF Core ExecuteUpdate)
6. Retourner ImportResult { total, créés, misÀJour, durée }

GET /api/articles/template-csv → CSV avec en-têtes + 2 lignes d'exemple

FRONTEND :
- Zone drag & drop (react-dropzone)
- Bouton "Télécharger le template"
- Progression pendant l'upload
- Résultat : cards succès/erreurs
```

---

## Module 11 — Fonctionnalités additionnelles

### 58-extra-portail-client.txt
```
Tu es un expert ASP.NET Core 8 + React. Crée un portail client simplifié (accès web public).

Idée : le client reçoit un lien unique par SMS pour suivre l'avancement de son OR.

BACKEND :
POST /api/portail/generer-lien → { orId } → génère un token unique (UUID + HMAC, expiration 7 jours), retourne l'URL
GET /api/portail/or/{token} → vérifie et retourne l'OR (statut, étapes, montant estimé) sans authentification JWT
POST /api/portail/or/{token}/approuver-devis → { accept:true/false } → met à jour le statut du devis

FRONTEND (pages publiques sans auth) :
Route /portail/or/{token}

Page de suivi simplifiée :
- Logo garage + nom
- Progression visuelle : "Réception → Diagnostic → En cours → Terminé → À récupérer"
- Statut actuel mis en évidence
- Infos véhicule (immat, marque, modèle)
- Si devis en attente d'approbation : afficher le détail + boutons Accepter/Refuser
- Mise à jour en temps réel via SSE (Server-Sent Events) — plus simple que SignalR pour les non-authentifiés
```

### 59-extra-planning-atelier.txt
```
Tu es un expert React + TypeScript. Crée le planning atelier de type Gantt simplifié.

Route /atelier/planning

Vue calendrier hebdomadaire (lundi → samedi) :
- Colonnes = jours de la semaine
- Lignes = techniciens (un technicien par ligne)
- Cellules = créneaux de 30 minutes (8h → 19h)

Chaque OR affecté apparaît comme un bloc coloré sur la ligne du technicien, de HeureDebut à HeureFin estimée.
Le bloc affiche : numéro OR + marque véhicule + type intervention.

Drag & Drop des blocs :
- Déplacer un OR vers un autre créneau / un autre technicien → appelle PATCH /api/or/{id}/replanifier
- Détecter les conflits (chevauchements) en temps réel avec une bordure rouge

Sidebar gauche : liste des OR "non planifiés" (statut EnAttente, sans technicien ni heure)
Bouton "Optimiser" → envoie la liste des OR non planifiés à l'API et reçoit une suggestion de planning

Navigation : flèches semaine précédente / suivante, bouton "Aujourd'hui".
```

### 60-extra-notification-push.txt
```
Tu es expert Web Push API + ASP.NET Core 8. Implémente les notifications push navigateur.

BACKEND :
1. Installer WebPush NuGet
2. Générer VAPID keys au premier démarrage : VapidHelper.GenerateVapidKeys(), stocker en DB config
3. Entité PushSubscription : { endpoint, p256dh, auth, userId, dateCreation, userAgent }
4. POST /api/notifications/subscribe → enregistrer la subscription
5. DELETE /api/notifications/unsubscribe → supprimer
6. Service PushNotificationService :
   - SendToUser(userId, PushPayload payload) → envoyer à toutes les subscriptions de l'user
   - PushPayload : { title, body, icon, url, tag (pour remplacer une notif existante du même type) }
   - Gérer erreur 410 Gone : supprimer la subscription expirée
   - Envoyer en parallèle si plusieurs appareils

FRONTEND :
1. Service sw.ts (service worker) : gère l'événement "push", affiche la notification, gère "notificationclick" → ouvrir l'URL
2. Dans l'app au premier login : demander permission Notifications, s'abonner via pushManager.subscribe(), envoyer au backend
3. Page préférences : toggle "Recevoir les notifications" avec liste des types d'alertes activables
```

### 61-extra-comptabilite-export.txt
```
Tu es expert ASP.NET Core 8 et comptabilité algérienne. Crée l'export comptable vers Sage ou Excel.

Objectif : export des écritures comptables du mois pour éviter la double saisie.

Structure d'une écriture comptable :
{ date, journal(VTE/ACH/BAN/OD), numéroEcriture, compte(PCG algérien), libellé, débit, crédit, référenceDocument }

Mapping comptable des événements :
- Facture émise : Débit 411 (Clients) / Crédit 706 (Prestations) + Crédit 44571 (TVA collectée 19%)
- Paiement reçu : Débit 5141 (Banque) ou 5311 (Caisse) / Crédit 411 (Clients)
- Réception stock : Débit 3X (Stocks) / Crédit 401 (Fournisseurs)
- Salaires : Débit 6411 (Salaires) / Crédit 431 (CNAS) + Crédit 5141 (Net à payer)

GET /api/comptabilite/export?mois=2024-11&format=xlsx|csv
- Générer le grand livre du mois avec toutes les écritures
- Format Excel : une feuille par journal, feuille de synthèse balance des comptes
- Format CSV : import direct Sage Comptabilité (vérifier le format d'import Sage DZ)

Documentation dans le fichier : conventions de comptes utilisées, paramétrage recommandé.
```

---

## Usage rapide

```bash
# Se placer dans le bon dossier et lancer un prompt
cd garage-system/backend
claude < ../prompts/16-or-create-api.txt

cd garage-system/frontend
claude < ../prompts/20-or-kanban-frontend.txt

# Ou en mode interactif avec contexte
cd garage-system
claude
# Puis coller le contenu du prompt
```

> **Conseil** : placer le fichier `CLAUDE.md` à la racine de chaque dossier (`backend/` et `frontend/`) pour que Claude Code charge automatiquement le contexte du projet à chaque session.

---

## Module 12 — Migration UI vers shadcn/ui

> **Objectif** : remplacer les composants UI ad-hoc par shadcn/ui (Radix UI + Tailwind CSS).  
> **Règle absolue** : migrer composant par composant, jamais tout en une seule PR. Chaque étape doit laisser l'app fonctionnelle.

---

### Phase 0 — Setup Tailwind + shadcn/ui

#### 62-ui-setup-tailwind-shadcn.txt
```
Tu es un expert Vite + React + TypeScript. Installe et configure Tailwind CSS v3 et shadcn/ui dans le projet frontend existant (Vite + React 18 + TS).

Étapes exactes :

1. Installer les dépendances :
   yarn add -D tailwindcss postcss autoprefixer
   yarn add class-variance-authority clsx tailwind-merge lucide-react
   npx tailwindcss init -p

2. Configurer tailwind.config.js :
   - content: ["./index.html", "./src/**/*.{ts,tsx}"]
   - Ajouter le plugin @tailwindcss/forms si besoin (formulaires)
   - Theme extend : palette de couleurs garage (primary, accent, destructive, muted)
   - Ajouter les variables CSS pour shadcn (border-radius, couleurs via CSS variables)

3. Modifier src/index.css :
   - Ajouter les directives @tailwind base/components/utilities
   - Déclarer les CSS variables :root et .dark (couleurs shadcn standard)

4. Initialiser shadcn/ui :
   npx shadcn@latest init
   Répondre aux questions : TypeScript=Yes, style=default, baseColor=slate, cssVariables=Yes, alias=@/components/ui

5. Configurer tsconfig.json / vite.config.ts pour l'alias @/ → ./src/

6. Installer les premiers composants de base :
   npx shadcn@latest add button card badge input label select dialog sheet table tabs

7. Créer src/lib/utils.ts avec la fonction cn() (cn = clsx + twMerge).

Vérification : importer <Button /> dans App.tsx et vérifier que le style s'applique correctement.
```

---

### Phase 1 — Composants fondamentaux

#### 63-ui-design-system.txt
```
Tu es un expert React + TypeScript + Tailwind CSS. Crée le design system de base pour le garage en s'appuyant sur shadcn/ui.

Fichiers à créer dans src/components/ui/ (ne pas modifier les fichiers générés par shadcn, créer des wrappers) :

1. src/components/ui/stat-card.tsx
   Composant <StatCard label title value delta? icon? trend? />
   - Card shadcn avec padding 6
   - Titre en texte muted-foreground, valeur en text-2xl font-bold
   - Delta optionnel : badge vert si positif, rouge si négatif
   - Icône lucide-react en coin supérieur droit (couleur primaire)

2. src/components/ui/data-table.tsx
   Wrapper autour de la Table shadcn avec :
   - Props : columns: ColumnDef<T>[], data: T[], isLoading?: boolean, emptyMessage?: string
   - Loading : afficher 5 lignes de Skeleton
   - Empty state : centré avec icône et message

3. src/components/ui/page-header.tsx
   Composant <PageHeader title subtitle? actions? />
   - Layout flex items-center justify-between
   - Breadcrumb optionnel via shadcn Breadcrumb

4. src/components/ui/status-badge.tsx
   Composant <StatusBadge status variant />
   - Variants : or-status (EnAttente|EnCours|Suspendu|Terminé|Livré)
   - Variants : stock-status (ok|low|critical)
   - Variants : invoice-status (emise|partielle|soldee|retard|annulee)
   - Couleurs cohérentes via cva() de class-variance-authority

5. src/components/ui/confirm-dialog.tsx
   Wrapper AlertDialog shadcn :
   <ConfirmDialog trigger title description onConfirm variant="destructive"? />

Documenter chaque composant avec des exemples d'utilisation en commentaire JSDoc.
```

---

### Phase 2 — Migration des pages existantes

#### 64-ui-migrate-layout.txt
```
Tu es un expert React + TypeScript + shadcn/ui. Migre le layout principal de l'application vers shadcn/ui.

Fichier : src/components/layout/AppLayout.tsx

Nouveau layout basé sur shadcn/ui + Tailwind :

Structure :
- Sidebar fixe gauche (w-64) avec :
  * Logo garage en haut (image ou texte stylisé)
  * Navigation par groupe : Atelier (Kanban, Planning) | Stock | CRM | Facturation | RH | Stats | Paramètres
  * Chaque nav item : icon lucide-react + label + badge de compteur si pertinent
  * Utilisateur connecté en bas : avatar + nom + rôle + bouton déconnexion

- Zone principale droite :
  * Topbar : breadcrumb à gauche, bouton notifications (cloche avec badge) + avatar profil à droite
  * Contenu : <main> avec padding et scroll

Composants shadcn à utiliser :
- Sidebar : div custom Tailwind (pas de composant shadcn dédié)
- Avatar (shadcn) pour l'utilisateur
- DropdownMenu (shadcn) pour le menu utilisateur
- Sheet (shadcn) pour la sidebar mobile (responsive)

Responsive :
- Mobile : sidebar cachée, burger menu → Sheet
- lg+ : sidebar fixe toujours visible

Utiliser cn() pour les classes conditionnelles (item actif vs inactif).
```

#### 65-ui-migrate-dashboard.txt
```
Tu es un expert React + TypeScript + shadcn/ui + Recharts. Migre la page Dashboard vers shadcn/ui.

Fichier : src/pages/DashboardPage.tsx

La page doit utiliser les composants du design system créés en Phase 1.

Layout :
1. <PageHeader title="Tableau de bord" subtitle={`${dateAujourd'hui}`} />

2. Grille 4 colonnes : 4 <StatCard /> avec données de /api/stats/recap-journee :
   - CA du jour (DZD) avec delta vs hier
   - OR en cours (nombre, live via useQuery refetchInterval=30000)
   - Alertes actives (badge rouge si > 0)
   - Factures en retard (badge orange)

3. Grille 2 colonnes :
   - Card "OR du jour" : mini-table (numéro, véhicule, statut via <StatusBadge />, technicien)
     Lien "Voir le Kanban →"
   - Card "Alertes stock bas" : liste avec <StatusBadge status="critical" /> et lien vers stock

4. Card "Évolution CA — 30 derniers jours" (pleine largeur) :
   Recharts <LineChart> avec ResponsiveContainer, tooltip en DZD, loading via Skeleton shadcn

Chaque Card utilise le composant Card de shadcn (Card, CardHeader, CardTitle, CardContent).
Utiliser useQuery TanStack Query pour chaque bloc de données.
```

#### 66-ui-migrate-kanban.txt
```
Tu es un expert React + TypeScript + shadcn/ui + @dnd-kit. Migre la page Kanban OR vers shadcn/ui.

Fichier : src/pages/or/KanbanPage.tsx

Header de page :
- <PageHeader title="Kanban Atelier" subtitle={dateAujourd'hui} />
- Stats rapides en ligne : badges (EnAttente: N | EnCours: N | Terminés: N)
- Bouton "Nouvel OR" (Button shadcn variant="default")

Colonnes Kanban :
Chaque colonne = une Card shadcn avec CardHeader (titre + compteur badge) et CardContent scrollable.
Couleurs d'en-tête par statut : slate (attente), blue (en cours), yellow (suspendu), green (terminé), gray (livré).

Composant <ORCard /> migré vers shadcn/ui :
- Card avec shadow-sm hover:shadow-md transition
- Badge shadcn pour le numéro OR (variant selon priorité : default ou destructive)
- <StatusBadge /> pour le statut
- <ORTimer /> inchangé (composant métier, pas UI)
- Avatar shadcn pour le technicien (initiales)
- Boutons d'action : Button variant="ghost" size="sm" avec icônes lucide-react

Sheet shadcn pour le drawer de détail OR (remplace tout composant drawer custom).

Garder toute la logique @dnd-kit existante, seul le markup/style change.
```

#### 67-ui-migrate-stock.txt
```
Tu es un expert React + TypeScript + shadcn/ui. Migre la page Stock Articles vers shadcn/ui.

Fichier : src/pages/stock/ArticlesPage.tsx

Toolbar :
- Input shadcn avec icône Search (lucide) pour la recherche
- Select shadcn pour la catégorie
- Switch shadcn + label "Stock bas seulement" avec Badge rouge (compteur)
- Button "Réinitialiser" variant="ghost"
- Séparateur vertical
- Button "Nouvel article" | Button variant="outline" "Importer CSV" | Button variant="outline" "Exporter"

Table via <DataTable /> du design system :
Colonnes définies avec ColumnDef<Article>[] :
- Référence (code monospace)
- Désignation + description en sous-titre gris
- Catégorie (Badge shadcn)
- Stock : nombre + unité + <StatusBadge stock-status />
- Seuil min
- Prix vente (formaté DZD)
- Emplacement
- Actions : DropdownMenu shadcn (Éditer | Mouvements | Ajustement | Désactiver)

Dialog shadcn pour le formulaire "Nouvel article" / "Éditer article" :
- React Hook Form + Zod (inchangé)
- Utiliser les composants Form, FormField, FormItem, FormLabel, FormControl, FormMessage de shadcn

Sheet shadcn pour le drawer "Historique des mouvements".

Modal ajustement rapide → AlertDialog ou Dialog shadcn.
```

#### 68-ui-migrate-rh.txt
```
Tu es un expert React + TypeScript + shadcn/ui. Migre les pages RH vers shadcn/ui.

Fichiers : src/pages/rh/EmployesPage.tsx, PointagePage.tsx, PaiePage.tsx, CongesPage.tsx

Patterns communs à appliquer dans toutes ces pages :

1. <PageHeader /> avec titre, sous-titre et bouton d'action principal

2. Tabs shadcn pour la navigation entre vues (ex: PaiePage : "Bulletins" | "Primes" | "Historique")

3. Toutes les tables → <DataTable /> du design system

4. Tous les formulaires → Dialog shadcn + Form shadcn + React Hook Form (inchangé)

5. Confirmations de suppression/désactivation → <ConfirmDialog /> du design system

Spécificités EmployesPage :
- Avatar shadcn pour les employés (initiales colorées par département)
- Badge pour le poste (couleur par type : Technicien=blue, Caissier=green, RH=purple)
- Badge pour le type contrat (CDI=vert, CDD=orange, Temporaire=gray)

Spécificités PointagePage :
- Calendar shadcn pour sélectionner le mois
- Tableau avec statut Présent/Absent/Congé via <StatusBadge />
- Progress shadcn pour le taux de présence

Spécificités PaiePage :
- Card récapitulatif mensuel (SalaireBrut, Cotisations, NetAPayer) avec séparateurs
- Button variant="outline" + icône Download pour télécharger le PDF

Spécificités CongesPage :
- Badge par statut demande : EnAttente=yellow, Approuvé=green, Refusé=red
- DateRangePicker (construire avec 2 inputs date ou utiliser react-day-picker déjà inclus dans shadcn Calendar)
```

---

### Phase 3 — Thème & Cohérence finale

#### 69-ui-theme-dark-mode.txt
```
Tu es un expert React + TypeScript + Tailwind CSS + shadcn/ui. Ajoute le dark mode et finalise le thème.

1. Palette de couleurs personnalisée pour le garage (dans tailwind.config.js + CSS variables) :
   Mode clair :
   - primary : bleu foncé (#1E3A5F) — couleur principale du garage
   - accent  : orange (#F97316) — couleur d'alerte/action
   - background : blanc cassé (#FAFAFA)
   - card : blanc (#FFFFFF)
   Mode sombre :
   - primary : bleu clair (#60A5FA)
   - accent  : orange vif (#FB923C)
   - background : #0F172A
   - card : #1E293B

2. ThemeProvider :
   Créer src/contexts/ThemeContext.tsx :
   - Utilise localStorage pour persister la préférence ("light"|"dark"|"system")
   - Applique la classe "dark" sur <html> selon la préférence + prefers-color-scheme
   - Hook useTheme() : { theme, setTheme }

3. Bouton toggle dark/dark dans la Topbar (icône Sun/Moon lucide-react) via DropdownMenu (Light | Dark | Système)

4. Audit visuel des composants :
   - Vérifier que tous les <StatusBadge />, <StatCard />, <DataTable /> s'affichent correctement en dark mode
   - Aucune couleur hardcodée — tout via variables CSS ou classes Tailwind dark:

5. Animations :
   - Ajouter transition-colors duration-200 sur tous les éléments interactifs
   - Sidebar nav items : hover avec bg-accent/10, actif avec bg-accent/20 et border-l-2 border-primary
```

#### 70-ui-forms-validation.txt
```
Tu es un expert React + TypeScript + React Hook Form + Zod + shadcn/ui. Standardise tous les formulaires.

Créer src/components/ui/form-field-wrapper.tsx :
Composant utilitaire qui encapsule FormField + FormItem + FormLabel + FormControl + FormMessage de shadcn.
Props : name, label, required?, description?, children (le champ React Hook Form).

Composants de formulaire à créer dans src/components/form/ :
1. <PhoneInput /> : Input shadcn avec auto-formatage algérien (0555 XXX XXX ou +213)
2. <AmountInput /> : Input shadcn avec suffixe "DZD", type="number", min=0, step="0.01"
3. <DatePickerField /> : Popover + Calendar shadcn, formatage DD/MM/YYYY, locale fr
4. <AsyncSelectField /> : Input recherche avec debounce 300ms, résultats en Popover, sélection unique ou multiple
5. <RoleSelectField /> : Select shadcn pré-rempli avec les rôles disponibles pour l'utilisateur connecté

Pattern de formulaire standard à appliquer partout :
const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues })
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormFieldWrapper name="..." label="..." required>
      <Input {...field} />
    </FormFieldWrapper>
    <Button type="submit" disabled={form.formState.isSubmitting}>
      {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
      Enregistrer
    </Button>
  </form>
</Form>

Toast (sonner) pour tous les retours : success, error, info — uniformiser les messages.
```

---

### Checklist de migration

```
Phase 0 — Setup
  [ ] Tailwind CSS installé et configuré
  [ ] shadcn/ui initialisé (npx shadcn@latest init)
  [ ] Composants de base ajoutés (button, card, badge, input, dialog, sheet, table, tabs, select, label)
  [ ] Alias @/ configuré dans vite.config.ts + tsconfig.json
  [ ] cn() disponible dans src/lib/utils.ts

Phase 1 — Design system
  [ ] StatCard
  [ ] DataTable (avec Skeleton + empty state)
  [ ] PageHeader
  [ ] StatusBadge (or-status, stock-status, invoice-status)
  [ ] ConfirmDialog

Phase 2 — Pages migrées
  [ ] AppLayout (sidebar + topbar)
  [ ] DashboardPage
  [ ] KanbanPage + ORCard
  [ ] ArticlesPage (Stock)
  [ ] EmployesPage + PointagePage + PaiePage + CongesPage (RH)
  [ ] ClientsPage
  [ ] VéhiculesPage + VehiculeDetailPage
  [ ] FacturesPage + DevisPage
  [ ] StatsPage

Phase 3 — Finalisation
  [ ] Dark mode opérationnel
  [ ] Formulaires standardisés (PhoneInput, AmountInput, DatePicker, AsyncSelect)
  [ ] Toast uniformisés (sonner)
  [ ] Audit responsive mobile (Sheet sidebar)
  [ ] Aucune couleur hardcodée restante
```
