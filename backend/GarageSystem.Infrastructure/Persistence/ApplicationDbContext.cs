using GarageSystem.Domain.Common;
using GarageSystem.Domain.Entities;
using GarageSystem.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<AppUser, AppRole, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Vehicule> Vehicules => Set<Vehicule>();
    public DbSet<OrdreReparation> OrdresReparation => Set<OrdreReparation>();
    public DbSet<LigneOR> LignesOR => Set<LigneOR>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<MouvementStock> MouvementsStock => Set<MouvementStock>();
    public DbSet<Employe> Employes => Set<Employe>();
    public DbSet<Facture> Factures => Set<Facture>();
    public DbSet<LigneFacture> LignesFacture => Set<LigneFacture>();
    public DbSet<Paiement> Paiements => Set<Paiement>();
    public DbSet<Devis> Devis => Set<Devis>();
    public DbSet<LigneDevis> LignesDevis => Set<LigneDevis>();
    public DbSet<HistoriqueStatutOR> HistoriqueStatutsOR => Set<HistoriqueStatutOR>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Global query filters: soft delete
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(ISoftDelete).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(ApplicationDbContext)
                    .GetMethod(nameof(SetSoftDeleteFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!
                    .MakeGenericMethod(entityType.ClrType);
                method.Invoke(null, new object[] { builder });
            }
        }
    }

    private static void SetSoftDeleteFilter<T>(ModelBuilder builder) where T : class, ISoftDelete
    {
        builder.Entity<T>().HasQueryFilter(e => !e.IsDeleted);
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.DateModification = DateTime.UtcNow;
        }
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
