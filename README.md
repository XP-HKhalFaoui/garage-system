# Système de Gestion Garage

Application de gestion complète pour un garage automobile — suivi des véhicules, ordres de réparation, facturation et reporting.

## Stack

| Couche    | Technologie                                      |
|-----------|--------------------------------------------------|
| Backend   | ASP.NET Core 8 · EF Core 8 · PostgreSQL 16       |
| Frontend  | Vite · React 18 · TypeScript                     |
| Infra     | Docker · Docker Compose · Nginx reverse proxy    |

## Prérequis

- [Node.js 20+](https://nodejs.org/)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Quick Start

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env

# 2. Lancer tous les services
docker compose up
```

L'API sera disponible sur `http://localhost:8080` et le frontend sur `http://localhost:80`.

## Structure du monorepo

```
/garage-system
  /backend/GarageSystem.API     → ASP.NET Core 8 Web API
  /frontend                     → Vite + React 18 + TypeScript
  /docker                       → Fichiers Docker Compose et Nginx
  /docs                         → Documentation technique
  docker-compose.yml            → Configuration de base
  docker-compose.dev.yml        → Surcharges développement
  docker-compose.prod.yml       → Surcharges production
  .env.example                  → Variables d'environnement (modèle)
  Makefile                      → Commandes utilitaires
```

## Branches

| Branche      | Rôle                                    |
|--------------|-----------------------------------------|
| `main`       | Code prêt pour la production            |
| `develop`    | Branche d'intégration                   |
| `feature/*`  | Développement de nouvelles fonctionnalités |

## Documentation

La documentation technique est disponible dans le dossier [`/docs`](./docs).
