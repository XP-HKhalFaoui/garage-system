# Garage System — Makefile
.PHONY: dev prod build test migrate db-update db-seed logs clean

# ── Docker ────────────────────────────────────────────────────────────────────
dev:
	./dev.sh

prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

clean:
	docker compose down -v --remove-orphans

# ── EF Core Migrations ────────────────────────────────────────────────────────
migrate:
	cd backend && dotnet ef migrations add $(name) --project GarageSystem.Infrastructure --startup-project GarageSystem.Api

db-update:
	cd backend && dotnet ef database update --project GarageSystem.Infrastructure --startup-project GarageSystem.Api

db-seed:
	cd backend && dotnet run --project GarageSystem.Api -- --seed

# ── Tests ─────────────────────────────────────────────────────────────────────
test:
	cd backend && dotnet test --verbosity normal

test-watch:
	cd backend && dotnet watch test
