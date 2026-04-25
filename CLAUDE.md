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
  /docs                         → documentation
