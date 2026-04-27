using GarageSystem.Domain.Common;
using GarageSystem.Domain.Entities;
using GarageSystem.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<AppUser, AppRole, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    // OR
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Vehicule> Vehicules => Set<Vehicule>();
    public DbSet<OrdreReparation> OrdresReparation => Set<OrdreReparation>();
    public DbSet<LigneOR> LignesOR => Set<LigneOR>();
    public DbSet<HistoriqueStatutOR> HistoriqueStatutsOR => Set<HistoriqueStatutOR>();

    // Stock
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<MouvementStock> MouvementsStock => Set<MouvementStock>();
    public DbSet<BonReception> BonsReception => Set<BonReception>();
    public DbSet<LigneBonReception> LignesBonReception => Set<LigneBonReception>();
    public DbSet<AlerteStock> AlertesStock => Set<AlerteStock>();

    // Facturation
    public DbSet<Devis> Devis => Set<Devis>();
    public DbSet<LigneDevis> LignesDevis => Set<LigneDevis>();
    public DbSet<Facture> Factures => Set<Facture>();
    public DbSet<LigneFacture> LignesFacture => Set<LigneFacture>();
    public DbSet<Paiement> Paiements => Set<Paiement>();

    // CRM
    public DbSet<OffreEnvoyee> OffresEnvoyees => Set<OffreEnvoyee>();
    public DbSet<Notification> Notifications => Set<Notification>();

    // RH
    public DbSet<Employe> Employes => Set<Employe>();
    public DbSet<Pointage> Pointages => Set<Pointage>();
    public DbSet<DemandeConge> DemandesConge => Set<DemandeConge>();
    public DbSet<SoldeConge> SoldesConge => Set<SoldeConge>();
    public DbSet<Prime> Primes => Set<Prime>();
    public DbSet<BulletinPaie> BulletinsPaie => Set<BulletinPaie>();

    // Auth
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Global soft-delete query filters
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(ISoftDelete).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(ApplicationDbContext)
                    .GetMethod(nameof(SetSoftDeleteFilter),
                        System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!
                    .MakeGenericMethod(entityType.ClrType);
                method.Invoke(null, [builder]);
            }
        }

        // Index fréquents
        builder.Entity<Article>().HasIndex(a => a.Référence).IsUnique();
        builder.Entity<Client>().HasIndex(c => c.Téléphone).IsUnique();
        builder.Entity<Vehicule>().HasIndex(v => v.Immatriculation).IsUnique();
        builder.Entity<OrdreReparation>().HasIndex(o => o.Numéro).IsUnique();
        builder.Entity<BonReception>().HasIndex(b => b.Numéro).IsUnique();

        // Concurrence optimiste sur OR
        builder.Entity<OrdreReparation>()
            .Property(o => o.RowVersion)
            .IsRowVersion();
    }

    private static void SetSoftDeleteFilter<T>(ModelBuilder builder) where T : class, ISoftDelete
        => builder.Entity<T>().HasQueryFilter(e => !e.IsDeleted);

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
            if (entry.State == EntityState.Modified)
                entry.Entity.DateModification = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<ISoftDelete>())
        {
            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.DateSuppression = DateTime.UtcNow;
            }
        }
        return base.SaveChangesAsync(ct);
    }
}
