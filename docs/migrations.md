# Migrations EF Core — Garage System

## Commandes (depuis la racine du monorepo)

```bash
# Créer une migration
make migrate name=NomMigration

# Équivalent manuel
cd backend
dotnet ef migrations add NomMigration \
  --project GarageSystem.Infrastructure \
  --startup-project GarageSystem.Api

# Appliquer les migrations
make db-update
# ou
dotnet ef database update \
  --project GarageSystem.Infrastructure \
  --startup-project GarageSystem.Api
```

## Historique des migrations à créer (dans cet ordre)

| # | Nom                    | Contenu                                              |
|---|------------------------|------------------------------------------------------|
| 1 | `InitialCreate`        | Tables Identity (AspNetUsers, AspNetRoles…)          |
| 2 | `AddCoreEntities`      | Client, Vehicule, OrdreReparation, LigneOR, Employe  |
| 3 | `AddStockModule`       | Article, MouvementStock, BonReception, AlerteStock   |
| 4 | `AddBillingModule`     | Devis, LigneDevis, Facture, LigneFacture, Paiement   |
| 5 | `AddRefreshTokens`     | RefreshToken (auth)                                   |
| 6 | `AddHistoriqueStatutOR`| HistoriqueStatutOR                                   |

## En production (Docker)

Les migrations sont appliquées automatiquement au démarrage via :
```csharp
// À ajouter dans Program.cs (avant app.Run())
using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
await db.Database.MigrateAsync();
```
