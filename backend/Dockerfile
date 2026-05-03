# =============================================================================
# Dockerfile — GarageSystem.Api (ASP.NET Core 8, multi-stage)
# Stages:
#   base    → slim runtime image, non-root user
#   build   → SDK: restore NuGet (cache layer keyed on .csproj files)
#   publish → SDK: compile + publish Release artefacts
#   final   → runtime image with published output + healthcheck
# =============================================================================

# ─── Stage 1 · base ───────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base

ARG APP_UID=1001
ARG APP_GID=1001

RUN groupadd --system --gid ${APP_GID} appgroup \
 && useradd  --system --uid ${APP_UID} --gid appgroup \
             --no-create-home --shell /bin/false appuser

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080    \
    DOTNET_RUNNING_IN_CONTAINER=true  \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

EXPOSE 8080


# ─── Stage 2 · build ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Copy .csproj files for all projects so NuGet restore is cached independently
COPY ["GarageSystem.Api/GarageSystem.Api.csproj",             "GarageSystem.Api/"]
COPY ["GarageSystem.Domain/GarageSystem.Domain.csproj",       "GarageSystem.Domain/"]
COPY ["GarageSystem.Infrastructure/GarageSystem.Infrastructure.csproj", "GarageSystem.Infrastructure/"]

RUN dotnet restore "GarageSystem.Api/GarageSystem.Api.csproj"

COPY . .


# ─── Stage 3 · publish ────────────────────────────────────────────────────────
FROM build AS publish

RUN dotnet publish "GarageSystem.Api/GarageSystem.Api.csproj" \
    --configuration Release     \
    --output       /app/publish \
    /p:UseAppHost=false         \
    /p:PublishTrimmed=false     \
    /p:DebugType=None           \
    /p:DebugSymbols=false


# ─── Stage 4 · final ──────────────────────────────────────────────────────────
FROM base AS final

USER appuser

COPY --from=publish --chown=appuser:appgroup /app/publish .

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl --fail --silent --show-error http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "GarageSystem.Api.dll"]
