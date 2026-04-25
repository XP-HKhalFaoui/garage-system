#!/bin/bash
# Lance l'environnement de développement avec hot-reload
set -e

if [ ! -f .env ]; then
  echo "Copying .env.example → .env"
  cp .env.example .env
fi

docker compose -f docker-compose.yml -f docker-compose.dev.yml up "$@"
