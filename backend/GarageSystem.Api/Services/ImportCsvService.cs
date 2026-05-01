using CsvHelper;
using CsvHelper.Configuration;
using GarageSystem.Api.DTOs.Stock;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Globalization;

namespace GarageSystem.Api.Services;

public class ArticleCsvRecord
{
    public string Référence { get; set; } = string.Empty;
    public string? RéférenceOEM { get; set; }
    public string Désignation { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Catégorie { get; set; } = string.Empty;
    public string? MarquesCompatibles { get; set; }
    public string Unité { get; set; } = "Pièce";
    public decimal StockMinimum { get; set; }
    public decimal? StockMaximum { get; set; }
    public decimal PrixAchat { get; set; }
    public decimal PrixVente { get; set; }
    public string? EmplacementRayonnage { get; set; }
    public string? CodeBarre { get; set; }
}

public class ImportCsvService
{
    private readonly ApplicationDbContext _db;

    public ImportCsvService(ApplicationDbContext db) => _db = db;

    public async Task<ImportCsvResultDto> ImportAsync(Stream fileStream)
    {
        var sw = Stopwatch.StartNew();
        var erreurs = new List<ImportCsvErreurDto>();
        var records = new List<(int Ligne, ArticleCsvRecord Record)>();

        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            IgnoreBlankLines = true,
            MissingFieldFound = null,
            HeaderValidated = null,
        };

        using var reader = new StreamReader(fileStream);
        using var csv = new CsvReader(reader, config);

        try
        {
            await csv.ReadAsync();
            csv.ReadHeader();

            int ligne = 2;
            while (await csv.ReadAsync())
            {
                try
                {
                    var rec = csv.GetRecord<ArticleCsvRecord>();
                    if (rec != null) records.Add((ligne, rec));
                }
                catch (Exception ex)
                {
                    erreurs.Add(new ImportCsvErreurDto(ligne, "", $"Erreur lecture : {ex.Message}"));
                }
                ligne++;
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Fichier CSV invalide : {ex.Message}");
        }

        // Validation
        var réfsVues = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (ligne, rec) in records)
        {
            if (string.IsNullOrWhiteSpace(rec.Référence))
            {
                erreurs.Add(new ImportCsvErreurDto(ligne, rec.Référence, "Référence obligatoire"));
                continue;
            }
            if (!réfsVues.Add(rec.Référence))
                erreurs.Add(new ImportCsvErreurDto(ligne, rec.Référence, "Référence dupliquée dans le fichier"));
            if (rec.PrixAchat <= 0)
                erreurs.Add(new ImportCsvErreurDto(ligne, rec.Référence, "PrixAchat doit être > 0"));
            if (rec.PrixVente <= 0)
                erreurs.Add(new ImportCsvErreurDto(ligne, rec.Référence, "PrixVente doit être > 0"));
            if (rec.StockMinimum < 0)
                erreurs.Add(new ImportCsvErreurDto(ligne, rec.Référence, "StockMinimum doit être >= 0"));
            if (!Enum.TryParse<ArticleCategorie>(rec.Catégorie, true, out _))
                erreurs.Add(new ImportCsvErreurDto(ligne, rec.Référence, $"Catégorie invalide : {rec.Catégorie}"));
            if (!Enum.TryParse<ArticleUnité>(rec.Unité, true, out _))
                erreurs.Add(new ImportCsvErreurDto(ligne, rec.Référence, $"Unité invalide : {rec.Unité}"));
        }

        if (erreurs.Count > 0)
            return new ImportCsvResultDto(records.Count, 0, 0, sw.Elapsed.TotalMilliseconds, erreurs);

        // Upsert
        var réfs = records.Select(r => r.Record.Référence).ToList();
        var existants = await _db.Articles
            .Where(a => réfs.Contains(a.Référence) && !a.IsDeleted)
            .ToDictionaryAsync(a => a.Référence, StringComparer.OrdinalIgnoreCase);

        int créés = 0, misÀJour = 0;
        foreach (var (_, rec) in records)
        {
            Enum.TryParse<ArticleCategorie>(rec.Catégorie, true, out var cat);
            Enum.TryParse<ArticleUnité>(rec.Unité, true, out var unité);

            if (existants.TryGetValue(rec.Référence, out var existant))
            {
                existant.Désignation = rec.Désignation;
                existant.Description = rec.Description;
                existant.Catégorie = cat;
                existant.MarquesCompatibles = rec.MarquesCompatibles;
                existant.Unité = unité;
                existant.StockMinimum = rec.StockMinimum;
                existant.StockMaximum = rec.StockMaximum;
                existant.PrixAchat = rec.PrixAchat;
                existant.PrixVente = rec.PrixVente;
                existant.EmplacementRayonnage = rec.EmplacementRayonnage;
                existant.RéférenceOEM = rec.RéférenceOEM;
                misÀJour++;
            }
            else
            {
                _db.Articles.Add(new Article
                {
                    Id = Guid.NewGuid(),
                    Référence = rec.Référence,
                    RéférenceOEM = rec.RéférenceOEM,
                    Désignation = rec.Désignation,
                    Description = rec.Description,
                    Catégorie = cat,
                    MarquesCompatibles = rec.MarquesCompatibles,
                    Unité = unité,
                    StockMinimum = rec.StockMinimum,
                    StockMaximum = rec.StockMaximum,
                    PrixAchat = rec.PrixAchat,
                    PrixVente = rec.PrixVente,
                    EmplacementRayonnage = rec.EmplacementRayonnage,
                    CodeBarre = rec.CodeBarre,
                    IsActif = true,
                    IsDeleted = false,
                    DateCreation = DateTime.UtcNow,
                });
                créés++;
            }
        }

        await _db.SaveChangesAsync();
        sw.Stop();

        return new ImportCsvResultDto(records.Count, créés, misÀJour, sw.Elapsed.TotalMilliseconds, erreurs);
    }

    public static string GenerateTemplate()
    {
        var lignes = new[]
        {
            "Référence,RéférenceOEM,Désignation,Description,Catégorie,MarquesCompatibles,Unité,StockMinimum,StockMaximum,PrixAchat,PrixVente,EmplacementRayonnage,CodeBarre",
            "FIL-HUI-001,OEM12345,Filtre à huile moteur,Filtre haute performance,Filtres,Toyota;Honda,Pièce,5,50,120.00,185.00,A1-R3,",
            "HUI-MOT-5W30,,Huile moteur 5W30 1L,Huile synthétique,Huiles,,Litre,10,100,850.00,1200.00,B2-R1,"
        };
        return string.Join("\n", lignes);
    }
}
