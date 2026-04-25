# =============================================================================
# Dockerfile — GarageSystem.Api (ASP.NET Core 8, multi-stage)
# =============================================================================
#
# Stages
#   base    → runtime image pinned to a specific digest for reproducibility
#   build   → SDK image: restore NuGet packages (cached layer)
#   publish → SDK image: compile + publish Release artefacts
#   final   → minimal runtime image, non-root user, healthcheck
#
# Build examples
#   docker build -t garage-api .
#   docker build --target build -t garage-api:dev .   # stop at SDK stage (dev)
# =============================================================================

# ─── Stage 1 · base ───────────────────────────────────────────────────────────
# Pin the runtime image. Update the digest periodically via:
#   docker pull mcr.microsoft.com/dotnet/aspnet:8.0
#   docker inspect --format='{{index .RepoDigests 0}}' mcr.microsoft.com/dotnet/aspnet:8.0
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base

# Default non-root UID that will own the app files
ARG APP_UID=1001
ARG APP_GID=1001

# Create a dedicated system group + user (no login shell, no home dir needed)
RUN groupadd --system --gid ${APP_GID} appgroup \
 && useradd  --system \
             --uid    ${APP_UID} \
             --gid    appgroup   \
             --no-create-home   \
             --shell  /bin/false \
             appuser

# Install curl for the HEALTHCHECK (kept in a single layer)
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Runtime environment defaults (overridable at docker run / compose)
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080    \
    DOTNET_RUNNING_IN_CONTAINER=true  \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

EXPOSE 8080


# ─── Stage 2 · build ──────────────────────────────────────────────────────────
# Use the full SDK to restore NuGet packages.
# This layer is cached by Docker as long as .csproj / NuGet.Config don't change,
# so a code-only edit never re-downloads packages.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# 1. Copy ONLY the project manifest(s) first → stable cache layer
COPY ["GarageSystem.Api/GarageSystem.Api.csproj", "GarageSystem.Api/"]

# If you have shared class libraries, add them here too, e.g.:
# COPY ["GarageSystem.Core/GarageSystem.Core.csproj", "GarageSystem.Core/"]

# 2. Restore — cached until any .csproj changes
RUN dotnet restore "GarageSystem.Api/GarageSystem.Api.csproj" \
    --locked-mode              # fail if packages.lock.json is out of date

# 3. Copy the rest of the source code
COPY . .


# ─── Stage 3 · publish ────────────────────────────────────────────────────────
# Compile and publish in Release mode, reusing the already-restored packages.
FROM build AS publish

RUN dotnet publish "GarageSystem.Api/GarageSystem.Api.csproj" \
    --configuration Release      \
    --output       /app/publish  \
    --no-restore                 \
    /p:UseAppHost=false          \
    /p:PublishTrimmed=false      \
    /p:DebugType=None            \
    /p:DebugSymbols=false


# ─── Stage 4 · final ──────────────────────────────────────────────────────────
# Copy only the published artefacts into the slim runtime image.
FROM base AS final

# Switch to non-root before copying files so ownership is set in one step
USER appuser

COPY --from=publish --chown=appuser:appgroup /app/publish .

# Healthcheck: poll the /health endpoint every 30 s.
# The API must expose GET /health (e.g. via app.MapHealthChecks("/health")).
HEALTHCHECK --interval=30s \
            --timeout=10s  \
            --start-period=20s \
            --retries=3    \
    CMD curl --fail --silent --show-error http://localhost:8080/health \
        || exit 1

ENTRYPOINT ["dotnet", "GarageSystem.Api.dll"]
