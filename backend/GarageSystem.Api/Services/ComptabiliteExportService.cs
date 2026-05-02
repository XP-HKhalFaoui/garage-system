using ClosedXML.Excel;
using GarageSystem.Domain.Enums;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace GarageSystem.Api.Services;

public record EcritureComptable(
    DateTime Date,
    string Journal,
    string NuméroEcriture,
    string Compte,
    string Libellé,
    decimal Débit,
    decimal Crédit,
    string RéférenceDocument
);

public class ComptabiliteExportService
{
    private readonly ApplicationDbContext _db;

    public ComptabiliteExportService(ApplicationDbContext db) => _db = db;

    public async Task<List<EcritureComptable>> GetEcrituresAsync(int année, int mois)
    {
        var début = new DateTime(année, mois, 1, 0, 0, 0, DateTimeKind.Utc);
        var fin = début.AddMonths(1);
        var écritures = new List<EcritureComptable>();
        int seq = 1;

        // Factures émises → 411 / 706 / 44571
        var factures = await _db.Factures
            .Include(f => f.Lignes)
            .Where(f => f.DateFacture >= début && f.DateFacture < fin && f.Statut != FactureStatut.Annulee)
            .AsNoTracking()
            .ToListAsync();

        foreach (var f in factures)
        {
            var numEcriture = $"VTE-{année}{mois:D2}-{seq++:D4}";
            var ht = f.SousTotalHT;
            var tva = f.MontantTVA;

            écritures.Add(new EcritureComptable(f.DateFacture, "VTE", numEcriture, "411", $"Client - {f.ClientNom}", f.TotalTTC, 0, f.Numéro));
            écritures.Add(new EcritureComptable(f.DateFacture, "VTE", numEcriture, "706", $"Prestation - {f.Numéro}", 0, ht, f.Numéro));
            if (tva > 0)
                écritures.Add(new EcritureComptable(f.DateFacture, "VTE", numEcriture, "44571", $"TVA collectée - {f.Numéro}", 0, tva, f.Numéro));
        }

        // Paiements reçus → 5141 ou 5311 / 411
        var paiements = await _db.Paiements
            .Include(p => p.Facture)
            .Where(p => p.DatePaiement >= début && p.DatePaiement < fin)
            .AsNoTracking()
            .ToListAsync();

        foreach (var p in paiements)
        {
            var numEcriture = $"BAN-{année}{mois:D2}-{seq++:D4}";
            var compteDébit = p.ModePaiement == ModePaiement.Espèces ? "5311" : "5141";
            écritures.Add(new EcritureComptable(p.DatePaiement, "BAN", numEcriture, compteDébit, $"Paiement {p.Facture?.Numéro}", p.Montant, 0, p.Facture?.Numéro ?? ""));
            écritures.Add(new EcritureComptable(p.DatePaiement, "BAN", numEcriture, "411", $"Client - {p.Facture?.ClientNom}", 0, p.Montant, p.Facture?.Numéro ?? ""));
        }

        // Réceptions stock → 3X / 401
        var bons = await _db.BonsReception
            .Include(b => b.Lignes)
            .Where(b => b.DateReception >= début && b.DateReception < fin)
            .AsNoTracking()
            .ToListAsync();

        foreach (var b in bons)
        {
            var numEcriture = $"ACH-{année}{mois:D2}-{seq++:D4}";
            var total = b.MontantTotal;
            écritures.Add(new EcritureComptable(b.DateReception, "ACH", numEcriture, "370", $"Stock - {b.Numéro}", total, 0, b.Numéro));
            écritures.Add(new EcritureComptable(b.DateReception, "ACH", numEcriture, "401", $"Fournisseur - {b.Fournisseur}", 0, total, b.Numéro));
        }

        // Salaires → 6411 / 431 / 5141
        var moisStr = $"{année}-{mois:D2}";
        var paies = await _db.BulletinsPaie
            .Where(p => p.Mois == moisStr)
            .AsNoTracking()
            .ToListAsync();

        foreach (var p in paies)
        {
            var numEcriture = $"OD-{année}{mois:D2}-{seq++:D4}";
            écritures.Add(new EcritureComptable(new DateTime(année, mois, 1, 0, 0, 0, DateTimeKind.Utc), "OD", numEcriture, "6411", $"Salaires {mois}/{année}", p.SalaireNet + p.CotisationCNAS, 0, numEcriture));
            écritures.Add(new EcritureComptable(new DateTime(année, mois, 1, 0, 0, 0, DateTimeKind.Utc), "OD", numEcriture, "431", $"CNAS {mois}/{année}", 0, p.CotisationCNAS, numEcriture));
            écritures.Add(new EcritureComptable(new DateTime(année, mois, 1, 0, 0, 0, DateTimeKind.Utc), "OD", numEcriture, "5141", $"Net à payer {mois}/{année}", 0, p.SalaireNet, numEcriture));
        }

        return écritures.OrderBy(e => e.Date).ThenBy(e => e.Journal).ToList();
    }

    public byte[] ExportToExcel(List<EcritureComptable> écritures, int année, int mois)
    {
        using var wb = new XLWorkbook();
        var journals = écritures.GroupBy(e => e.Journal).OrderBy(g => g.Key);

        foreach (var journal in journals)
        {
            var ws = wb.Worksheets.Add(journal.Key);
            ws.Cell(1, 1).Value = "Date"; ws.Cell(1, 2).Value = "Journal";
            ws.Cell(1, 3).Value = "N° Écriture"; ws.Cell(1, 4).Value = "Compte";
            ws.Cell(1, 5).Value = "Libellé"; ws.Cell(1, 6).Value = "Débit";
            ws.Cell(1, 7).Value = "Crédit"; ws.Cell(1, 8).Value = "Réf. Document";

            var headerRow = ws.Range(1, 1, 1, 8);
            headerRow.Style.Font.Bold = true;
            headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#1e3a5f");
            headerRow.Style.Font.FontColor = XLColor.White;

            int row = 2;
            foreach (var e in journal.OrderBy(x => x.Date))
            {
                ws.Cell(row, 1).Value = e.Date.ToString("dd/MM/yyyy");
                ws.Cell(row, 2).Value = e.Journal;
                ws.Cell(row, 3).Value = e.NuméroEcriture;
                ws.Cell(row, 4).Value = e.Compte;
                ws.Cell(row, 5).Value = e.Libellé;
                if (e.Débit > 0) ws.Cell(row, 6).Value = (double)e.Débit;
                if (e.Crédit > 0) ws.Cell(row, 7).Value = (double)e.Crédit;
                ws.Cell(row, 8).Value = e.RéférenceDocument;
                row++;
            }
            ws.Columns().AdjustToContents();
        }

        // Feuille synthèse — balance des comptes
        var balance = wb.Worksheets.Add("Balance");
        balance.Cell(1, 1).Value = "Compte"; balance.Cell(1, 2).Value = "Total Débit"; balance.Cell(1, 3).Value = "Total Crédit"; balance.Cell(1, 4).Value = "Solde";
        var balanceHeader = balance.Range(1, 1, 1, 4);
        balanceHeader.Style.Font.Bold = true;
        balanceHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#1e3a5f");
        balanceHeader.Style.Font.FontColor = XLColor.White;

        int brow = 2;
        foreach (var compte in écritures.GroupBy(e => e.Compte).OrderBy(g => g.Key))
        {
            var totalDébit = compte.Sum(e => e.Débit);
            var totalCrédit = compte.Sum(e => e.Crédit);
            balance.Cell(brow, 1).Value = compte.Key;
            balance.Cell(brow, 2).Value = (double)totalDébit;
            balance.Cell(brow, 3).Value = (double)totalCrédit;
            balance.Cell(brow, 4).Value = (double)(totalDébit - totalCrédit);
            brow++;
        }
        balance.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public string ExportToCsv(List<EcritureComptable> écritures)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Date;Journal;NuméroEcriture;Compte;Libellé;Débit;Crédit;RéférenceDocument");
        foreach (var e in écritures)
        {
            sb.AppendLine($"{e.Date:dd/MM/yyyy};{e.Journal};{e.NuméroEcriture};{e.Compte};" +
                $"\"{e.Libellé}\";{e.Débit:F2};{e.Crédit:F2};{e.RéférenceDocument}");
        }
        return sb.ToString();
    }
}
