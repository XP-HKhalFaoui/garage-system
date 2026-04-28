using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace GarageSystem.Infrastructure.Persistence;

public class DatabaseSeeder
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<AppUser> _users;
    private readonly RoleManager<AppRole> _roles;
    private readonly IConfiguration _config;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(
        ApplicationDbContext db,
        UserManager<AppUser> users,
        RoleManager<AppRole> roles,
        IConfiguration config,
        ILogger<DatabaseSeeder> logger)
    {
        _db     = db;
        _users  = users;
        _roles  = roles;
        _config = config;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        await SeedRolesAsync();
        await SeedAdminUserAsync();
        await SeedMockDataAsync();
    }

    // ─── Roles & Admin ────────────────────────────────────────────────────────

    private async Task SeedRolesAsync()
    {
        string[] roles = ["Admin", "Gérant", "Mécanicien", "Réceptionniste", "Comptable", "RH"];

        foreach (var role in roles)
        {
            if (!await _roles.RoleExistsAsync(role))
            {
                await _roles.CreateAsync(new AppRole(role));
                _logger.LogInformation("Rôle créé : {Role}", role);
            }
        }
    }

    private async Task SeedAdminUserAsync()
    {
        var email    = _config["Seed:AdminEmail"]    ?? "admin@garage.local";
        var password = _config["Seed:AdminPassword"] ?? "Admin1234!";

        if (await _users.FindByEmailAsync(email) is not null)
            return;

        var user = new AppUser
        {
            UserName       = email,
            Email          = email,
            EmailConfirmed = true,
            IsActif        = true,
        };

        var result = await _users.CreateAsync(user, password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            _logger.LogError("Échec création admin : {Errors}", errors);
            return;
        }

        await _users.AddToRoleAsync(user, "Admin");
        _logger.LogInformation("Utilisateur admin créé : {Email}", email);
    }

    // ─── Mock data ────────────────────────────────────────────────────────────

    private async Task SeedMockDataAsync()
    {
        if (await _db.Clients.AnyAsync())
            return; // already seeded

        _logger.LogInformation("Seed des données de démonstration...");

        var clients   = SeedClients();
        var employes  = SeedEmployes();
        var articles  = SeedArticles();

        await _db.Clients.AddRangeAsync(clients);
        await _db.Employes.AddRangeAsync(employes);
        await _db.Articles.AddRangeAsync(articles);

        // Véhicules depend on clients
        var vehicules = SeedVehicules(clients);
        await _db.Vehicules.AddRangeAsync(vehicules);

        await _db.SaveChangesAsync();
        _logger.LogInformation("Données de démonstration insérées.");
    }

    // ─── Clients ──────────────────────────────────────────────────────────────

    private static List<Client> SeedClients() =>
    [
        new()
        {
            Id         = Guid.NewGuid(),
            Type       = ClientType.Particulier,
            Nom        = "Benali",
            Prénom     = "Karim",
            Téléphone  = "0550123456",
            Email      = "karim.benali@email.dz",
            Adresse    = "12 Rue des Martyrs, Alger Centre",
            Wilaya     = Wilaya.Alger,
            DateNaissance = new DateTime(1985, 3, 20, 0, 0, 0, DateTimeKind.Utc),
            IsActif    = true,
            DateCreation = DateTime.UtcNow,
        },
        new()
        {
            Id         = Guid.NewGuid(),
            Type       = ClientType.Particulier,
            Nom        = "Hadjadj",
            Prénom     = "Samira",
            Téléphone  = "0661234567",
            Email      = "samira.hadjadj@email.dz",
            Adresse    = "7 Cité El Badr, Oran",
            Wilaya     = Wilaya.Oran,
            DateNaissance = new DateTime(1990, 7, 15, 0, 0, 0, DateTimeKind.Utc),
            IsActif    = true,
            DateCreation = DateTime.UtcNow,
        },
        new()
        {
            Id         = Guid.NewGuid(),
            Type       = ClientType.Particulier,
            Nom        = "Bouzidi",
            Prénom     = "Mohamed",
            Téléphone  = "0771234567",
            Email      = "m.bouzidi@email.dz",
            Adresse    = "3 Avenue de l'ALN, Constantine",
            Wilaya     = Wilaya.Constantine,
            DateNaissance = new DateTime(1978, 11, 5, 0, 0, 0, DateTimeKind.Utc),
            IsActif    = true,
            DateCreation = DateTime.UtcNow,
        },
        new()
        {
            Id         = Guid.NewGuid(),
            Type       = ClientType.Société,
            Nom        = "SARL TransAlg",
            RaisonSociale = "SARL TransAlg",
            Téléphone  = "0213023456789",
            Email      = "contact@transalg.dz",
            Adresse    = "Zone Industrielle, Sétif",
            Wilaya     = Wilaya.Sétif,
            NRC        = "23/00-B/1234567",
            NIF        = "001234567890123",
            IsActif    = true,
            DateCreation = DateTime.UtcNow,
        },
        new()
        {
            Id         = Guid.NewGuid(),
            Type       = ClientType.Particulier,
            Nom        = "Meziane",
            Prénom     = "Fatima",
            Téléphone  = "0551987654",
            Email      = "fatima.meziane@email.dz",
            Adresse    = "15 Rue Ibn Khaldoun, Annaba",
            Wilaya     = Wilaya.Annaba,
            DateNaissance = new DateTime(1995, 2, 28, 0, 0, 0, DateTimeKind.Utc),
            IsActif    = true,
            DateCreation = DateTime.UtcNow,
        },
        new()
        {
            Id         = Guid.NewGuid(),
            Type       = ClientType.Société,
            Nom        = "EURL BTP Construct",
            RaisonSociale = "EURL BTP Construct",
            Téléphone  = "0213046789012",
            Email      = "info@btpconstruct.dz",
            Adresse    = "Lotissement Les Pins, Blida",
            Wilaya     = Wilaya.Blida,
            NRC        = "09/00-B/9876543",
            NIF        = "009876543210987",
            IsActif    = true,
            DateCreation = DateTime.UtcNow,
        },
    ];

    // ─── Véhicules ────────────────────────────────────────────────────────────

    private static List<Vehicule> SeedVehicules(List<Client> clients)
    {
        var karim   = clients[0];
        var samira  = clients[1];
        var mohamed = clients[2];
        var transalg = clients[3];
        var fatima  = clients[4];
        var btp     = clients[5];

        return
        [
            new()
            {
                ClientId               = karim.Id,
                Immatriculation        = "16-001-ALG-01",
                VIN                    = "VF3BRHFPA11234567",
                Marque                 = "Peugeot",
                Modele                 = "308",
                Version                = "1.6 HDi Allure",
                Année                  = 2018,
                Carburant              = Carburant.Diesel,
                Cylindrée              = 1560,
                Transmission           = Transmission.Manuelle,
                Couleur                = "Gris Platinium",
                KilométrageActuel      = 87_500,
                KilométrageDernièreVisite = 82_000,
                DateDernièreVisite     = new DateTime(2025, 11, 15, 0, 0, 0, DateTimeKind.Utc),
                IsActif                = true,
                DateCreation           = DateTime.UtcNow,
            },
            new()
            {
                ClientId               = samira.Id,
                Immatriculation        = "31-042-ORA-01",
                VIN                    = "VF1RFD00058765432",
                Marque                 = "Renault",
                Modele                 = "Symbol",
                Version                = "1.2 Expression",
                Année                  = 2020,
                Carburant              = Carburant.Essence,
                Cylindrée              = 1149,
                Transmission           = Transmission.Manuelle,
                Couleur                = "Blanc Glacier",
                KilométrageActuel      = 42_100,
                KilométrageDernièreVisite = 40_000,
                DateDernièreVisite     = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc),
                IsActif                = true,
                DateCreation           = DateTime.UtcNow,
            },
            new()
            {
                ClientId               = mohamed.Id,
                Immatriculation        = "25-115-CON-01",
                VIN                    = "WVWZZZ3BZ3E123456",
                Marque                 = "Volkswagen",
                Modele                 = "Golf",
                Version                = "V 2.0 TDI Confortline",
                Année                  = 2015,
                Carburant              = Carburant.Diesel,
                Cylindrée              = 1968,
                Transmission           = Transmission.Manuelle,
                Couleur                = "Noir Profond",
                KilométrageActuel      = 135_000,
                KilométrageDernièreVisite = 128_000,
                DateDernièreVisite     = new DateTime(2025, 9, 3, 0, 0, 0, DateTimeKind.Utc),
                IsActif                = true,
                DateCreation           = DateTime.UtcNow,
            },
            new()
            {
                ClientId               = transalg.Id,
                Immatriculation        = "19-003-SET-01",
                VIN                    = "YV2RT28R5WA123456",
                Marque                 = "Mitsubishi",
                Modele                 = "L200",
                Version                = "2.5 DI-D Double Cab",
                Année                  = 2019,
                Carburant              = Carburant.Diesel,
                Cylindrée              = 2477,
                Transmission           = Transmission.Automatique,
                Couleur                = "Blanc",
                KilométrageActuel      = 210_000,
                KilométrageDernièreVisite = 200_000,
                DateDernièreVisite     = new DateTime(2025, 12, 20, 0, 0, 0, DateTimeKind.Utc),
                IsActif                = true,
                DateCreation           = DateTime.UtcNow,
            },
            new()
            {
                ClientId               = transalg.Id,
                Immatriculation        = "19-004-SET-01",
                VIN                    = "YV2RT28R5WA654321",
                Marque                 = "Toyota",
                Modele                 = "Hilux",
                Version                = "2.8 D-4D GR-S",
                Année                  = 2021,
                Carburant              = Carburant.Diesel,
                Cylindrée              = 2755,
                Transmission           = Transmission.Automatique,
                Couleur                = "Argent",
                KilométrageActuel      = 95_000,
                KilométrageDernièreVisite = 90_000,
                DateDernièreVisite     = new DateTime(2026, 2, 5, 0, 0, 0, DateTimeKind.Utc),
                IsActif                = true,
                DateCreation           = DateTime.UtcNow,
            },
            new()
            {
                ClientId               = fatima.Id,
                Immatriculation        = "23-077-ANN-01",
                VIN                    = "VF7JBRHZE93456789",
                Marque                 = "Citroën",
                Modele                 = "C3",
                Version                = "1.2 PureTech Feel",
                Année                  = 2022,
                Carburant              = Carburant.Essence,
                Cylindrée              = 1199,
                Transmission           = Transmission.Manuelle,
                Couleur                = "Bleu Cobalt",
                KilométrageActuel      = 28_000,
                KilométrageDernièreVisite = 25_000,
                DateDernièreVisite     = new DateTime(2026, 3, 18, 0, 0, 0, DateTimeKind.Utc),
                IsActif                = true,
                DateCreation           = DateTime.UtcNow,
            },
            new()
            {
                ClientId               = btp.Id,
                Immatriculation        = "09-055-BLI-01",
                VIN                    = "VSSZZZ6KZHR456789",
                Marque                 = "Seat",
                Modele                 = "Ibiza",
                Version                = "1.0 TSI Style",
                Année                  = 2017,
                Carburant              = Carburant.Essence,
                Cylindrée              = 999,
                Transmission           = Transmission.Manuelle,
                Couleur                = "Rouge",
                KilométrageActuel      = 98_200,
                KilométrageDernièreVisite = 90_000,
                DateDernièreVisite     = new DateTime(2025, 8, 22, 0, 0, 0, DateTimeKind.Utc),
                IsActif                = true,
                DateCreation           = DateTime.UtcNow,
            },
        ];
    }

    // ─── Employés ─────────────────────────────────────────────────────────────

    private static List<Employe> SeedEmployes() =>
    [
        new()
        {
            Nom            = "Khaldi",
            Prénom         = "Rachid",
            DateNaissance  = new DateTime(1982, 6, 10, 0, 0, 0, DateTimeKind.Utc),
            Téléphone      = "0550001122",
            Email          = "r.khaldi@garage.local",
            Adresse        = "Cité des Orangers, Alger",
            Poste          = TypePoste.Technicien,
            Département    = "Atelier",
            SalaireBase    = 65_000,
            TypeContrat    = TypeContrat.CDI,
            DateEmbauche   = new DateTime(2019, 4, 1, 0, 0, 0, DateTimeKind.Utc),
            IsActif        = true,
            DateCreation   = DateTime.UtcNow,
        },
        new()
        {
            Nom            = "Amrani",
            Prénom         = "Sofiane",
            DateNaissance  = new DateTime(1990, 9, 25, 0, 0, 0, DateTimeKind.Utc),
            Téléphone      = "0660011223",
            Email          = "s.amrani@garage.local",
            Adresse        = "Bab Ezzouar, Alger",
            Poste          = TypePoste.Technicien,
            Département    = "Atelier",
            SalaireBase    = 58_000,
            TypeContrat    = TypeContrat.CDI,
            DateEmbauche   = new DateTime(2021, 9, 15, 0, 0, 0, DateTimeKind.Utc),
            IsActif        = true,
            DateCreation   = DateTime.UtcNow,
        },
        new()
        {
            Nom            = "Ouali",
            Prénom         = "Nadia",
            DateNaissance  = new DateTime(1993, 3, 8, 0, 0, 0, DateTimeKind.Utc),
            Téléphone      = "0770011223",
            Email          = "n.ouali@garage.local",
            Adresse        = "Kouba, Alger",
            Poste          = TypePoste.Receptionniste,
            Département    = "Accueil",
            SalaireBase    = 48_000,
            TypeContrat    = TypeContrat.CDI,
            DateEmbauche   = new DateTime(2022, 2, 1, 0, 0, 0, DateTimeKind.Utc),
            IsActif        = true,
            DateCreation   = DateTime.UtcNow,
        },
        new()
        {
            Nom            = "Ferhat",
            Prénom         = "Yacine",
            DateNaissance  = new DateTime(1987, 12, 17, 0, 0, 0, DateTimeKind.Utc),
            Téléphone      = "0551234321",
            Email          = "y.ferhat@garage.local",
            Adresse        = "El Harrach, Alger",
            Poste          = TypePoste.Caissier,
            Département    = "Comptabilité",
            SalaireBase    = 52_000,
            TypeContrat    = TypeContrat.CDI,
            DateEmbauche   = new DateTime(2020, 7, 1, 0, 0, 0, DateTimeKind.Utc),
            IsActif        = true,
            DateCreation   = DateTime.UtcNow,
        },
        new()
        {
            Nom            = "Belkacem",
            Prénom         = "Houria",
            DateNaissance  = new DateTime(1985, 5, 22, 0, 0, 0, DateTimeKind.Utc),
            Téléphone      = "0661122334",
            Email          = "h.belkacem@garage.local",
            Adresse        = "Dar El Beïda, Alger",
            Poste          = TypePoste.RH,
            Département    = "Ressources Humaines",
            SalaireBase    = 60_000,
            TypeContrat    = TypeContrat.CDI,
            DateEmbauche   = new DateTime(2018, 1, 15, 0, 0, 0, DateTimeKind.Utc),
            IsActif        = true,
            DateCreation   = DateTime.UtcNow,
        },
        new()
        {
            Nom            = "Kaci",
            Prénom         = "Lounès",
            DateNaissance  = new DateTime(1998, 8, 30, 0, 0, 0, DateTimeKind.Utc),
            Téléphone      = "0778899001",
            Email          = "l.kaci@garage.local",
            Adresse        = "Draria, Alger",
            Poste          = TypePoste.Technicien,
            Département    = "Atelier",
            SalaireBase    = 45_000,
            TypeContrat    = TypeContrat.CDD,
            DateEmbauche   = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            DateFinContrat = new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            IsActif        = true,
            DateCreation   = DateTime.UtcNow,
        },
        new()
        {
            Nom            = "Mezrag",
            Prénom         = "Amel",
            DateNaissance  = new DateTime(1991, 4, 14, 0, 0, 0, DateTimeKind.Utc),
            Téléphone      = "0552233445",
            Email          = "a.mezrag@garage.local",
            Adresse        = "Hussien Dey, Alger",
            Poste          = TypePoste.Admin,
            Département    = "Direction",
            SalaireBase    = 80_000,
            TypeContrat    = TypeContrat.CDI,
            DateEmbauche   = new DateTime(2017, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            IsActif        = true,
            DateCreation   = DateTime.UtcNow,
        },
    ];

    // ─── Articles ─────────────────────────────────────────────────────────────

    private static List<Article> SeedArticles() =>
    [
        // Filtres
        new()
        {
            Référence          = "FLT-001",
            RéférenceOEM       = "1109AJ",
            Désignation        = "Filtre à huile Peugeot/Citroën 1.6 HDi",
            Catégorie          = ArticleCategorie.Filtres,
            MarquesCompatibles = "Peugeot,Citroën,Ford",
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 25,
            StockMinimum       = 10,
            StockMaximum       = 50,
            PrixAchat          = 350,
            PrixVente          = 650,
            EmplacementRayonnage = "A-01",
            CodeBarre          = "3400936117867",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        new()
        {
            Référence          = "FLT-002",
            RéférenceOEM       = "7701478635",
            Désignation        = "Filtre à air Renault 1.2 TCe / 1.5 dCi",
            Catégorie          = ArticleCategorie.Filtres,
            MarquesCompatibles = "Renault,Dacia",
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 18,
            StockMinimum       = 8,
            StockMaximum       = 40,
            PrixAchat          = 420,
            PrixVente          = 780,
            EmplacementRayonnage = "A-02",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        new()
        {
            Référence          = "FLT-003",
            Désignation        = "Filtre à carburant universel diesel",
            Catégorie          = ArticleCategorie.Filtres,
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 12,
            StockMinimum       = 5,
            PrixAchat          = 550,
            PrixVente          = 950,
            EmplacementRayonnage = "A-03",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        // Huiles
        new()
        {
            Référence          = "HUI-001",
            Désignation        = "Huile moteur Total Quartz 5W-30 ACEA C3",
            Description        = "Bidon 5L — homologation PSA B71 2290",
            Catégorie          = ArticleCategorie.Huiles,
            Unité              = ArticleUnité.Litre,
            StockActuel        = 80,
            StockMinimum       = 20,
            StockMaximum       = 150,
            PrixAchat          = 1_800,
            PrixVente          = 2_800,
            EmplacementRayonnage = "B-01",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        new()
        {
            Référence          = "HUI-002",
            Désignation        = "Huile moteur Mobil 1 5W-40 Full Synthetic",
            Description        = "Bidon 4L",
            Catégorie          = ArticleCategorie.Huiles,
            Unité              = ArticleUnité.Litre,
            StockActuel        = 40,
            StockMinimum       = 10,
            PrixAchat          = 2_200,
            PrixVente          = 3_500,
            EmplacementRayonnage = "B-02",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        new()
        {
            Référence          = "HUI-003",
            Désignation        = "Liquide de frein DOT 4",
            Catégorie          = ArticleCategorie.Huiles,
            Unité              = ArticleUnité.Litre,
            StockActuel        = 15,
            StockMinimum       = 5,
            PrixAchat          = 600,
            PrixVente          = 1_100,
            EmplacementRayonnage = "B-03",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        // Freinage
        new()
        {
            Référence          = "FRE-001",
            RéférenceOEM       = "425302",
            Désignation        = "Plaquettes de frein avant Renault Symbol / Logan",
            Catégorie          = ArticleCategorie.Freinage,
            MarquesCompatibles = "Renault,Dacia",
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 8,
            StockMinimum       = 4,
            PrixAchat          = 1_200,
            PrixVente          = 2_200,
            EmplacementRayonnage = "C-01",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        new()
        {
            Référence          = "FRE-002",
            Désignation        = "Disques de frein avant Volkswagen Golf V/VI (288mm)",
            Catégorie          = ArticleCategorie.Freinage,
            MarquesCompatibles = "Volkswagen,Audi,Skoda,Seat",
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 6,
            StockMinimum       = 2,
            PrixAchat          = 2_800,
            PrixVente          = 4_800,
            EmplacementRayonnage = "C-02",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        // Transmission
        new()
        {
            Référence          = "TRA-001",
            Désignation        = "Courroie de distribution kit complet 1.6 HDi",
            Catégorie          = ArticleCategorie.Transmission,
            MarquesCompatibles = "Peugeot,Citroën,Ford",
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 4,
            StockMinimum       = 2,
            PrixAchat          = 4_500,
            PrixVente          = 7_500,
            EmplacementRayonnage = "D-01",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        new()
        {
            Référence          = "TRA-002",
            Désignation        = "Huile boîte de vitesses ATF Dexron VI",
            Catégorie          = ArticleCategorie.Transmission,
            Unité              = ArticleUnité.Litre,
            StockActuel        = 20,
            StockMinimum       = 8,
            PrixAchat          = 850,
            PrixVente          = 1_500,
            EmplacementRayonnage = "D-02",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        // Moteur
        new()
        {
            Référence          = "MOT-001",
            Désignation        = "Bougie d'allumage NGK BKR6EK (lot de 4)",
            Catégorie          = ArticleCategorie.Moteur,
            MarquesCompatibles = "Universel essence",
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 20,
            StockMinimum       = 8,
            PrixAchat          = 1_600,
            PrixVente          = 2_800,
            EmplacementRayonnage = "E-01",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        new()
        {
            Référence          = "MOT-002",
            Désignation        = "Joint de culasse 2.0 TDI BKD/BKP",
            Catégorie          = ArticleCategorie.Moteur,
            MarquesCompatibles = "Volkswagen,Audi,Seat,Skoda",
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 3,
            StockMinimum       = 1,
            PrixAchat          = 3_200,
            PrixVente          = 5_500,
            EmplacementRayonnage = "E-02",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        // Suspension
        new()
        {
            Référence          = "SUS-001",
            Désignation        = "Amortisseur avant Peugeot 308 I (droit ou gauche)",
            Catégorie          = ArticleCategorie.Suspension,
            MarquesCompatibles = "Peugeot",
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 4,
            StockMinimum       = 2,
            PrixAchat          = 3_800,
            PrixVente          = 6_500,
            EmplacementRayonnage = "F-01",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        // Électrique
        new()
        {
            Référence          = "ELE-001",
            Désignation        = "Batterie 12V 60Ah 540A (L2)",
            Catégorie          = ArticleCategorie.Électrique,
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 5,
            StockMinimum       = 2,
            PrixAchat          = 7_500,
            PrixVente          = 12_000,
            EmplacementRayonnage = "G-01",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        new()
        {
            Référence          = "ELE-002",
            Désignation        = "Alternateur reconditionné Renault 1.5 dCi 90A",
            Catégorie          = ArticleCategorie.Électrique,
            MarquesCompatibles = "Renault,Dacia,Nissan",
            Unité              = ArticleUnité.Pièce,
            StockActuel        = 2,
            StockMinimum       = 1,
            PrixAchat          = 9_000,
            PrixVente          = 15_000,
            EmplacementRayonnage = "G-02",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
        // Accessoires
        new()
        {
            Référence          = "ACC-001",
            Désignation        = "Liquide de refroidissement G12+ (concentré 1L)",
            Catégorie          = ArticleCategorie.Accessoires,
            Unité              = ArticleUnité.Litre,
            StockActuel        = 30,
            StockMinimum       = 10,
            PrixAchat          = 480,
            PrixVente          = 850,
            EmplacementRayonnage = "H-01",
            IsActif            = true,
            DateCreation       = DateTime.UtcNow,
        },
    ];
}
