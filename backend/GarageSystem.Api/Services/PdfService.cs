using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using Microsoft.Extensions.Options;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace GarageSystem.Api.Services;

public class GarageConfig
{
    public string Nom { get; set; } = "Mon Garage";
    public string Adresse { get; set; } = "";
    public string Telephone { get; set; } = "";
    public string NIF { get; set; } = "";
    public string LogoBase64 { get; set; } = "";
}

public class PdfService(IOptions<GarageConfig> garageOptions)
{
    private readonly GarageConfig _garage = garageOptions.Value;

    public byte[] GenerateFacturePdf(Facture facture, string? immatriculation)
        => GenerateDocument(
            isDevis: false,
            numéro: facture.Numéro,
            date: facture.DateFacture,
            échéance: facture.DateEchéance,
            clientNom: facture.ClientNom,
            clientAdresse: facture.ClientAdresse,
            clientNIF: facture.ClientNIF,
            immatriculation: immatriculation,
            sousTotalHT: facture.SousTotalHT,
            montantTVA: facture.MontantTVA,
            totalTTC: facture.TotalTTC,
            statut: facture.Statut.ToString(),
            dateSolde: facture.DateSolde,
            modePaiement: facture.Paiements.LastOrDefault()?.ModePaiement.ToString(),
            lignes: facture.Lignes.Select(l => (l.Description, l.Quantité, l.PrixUnitaireHT, l.TauxTVA, l.TotalHT)).ToList());

    public byte[] GenerateDevisPdf(Devis devis, string clientNom, string clientAdresse, string? clientNIF)
        => GenerateDocument(
            isDevis: true,
            numéro: devis.Numéro,
            date: devis.DateCreation,
            échéance: devis.DateExpiration,
            clientNom: clientNom,
            clientAdresse: clientAdresse,
            clientNIF: clientNIF,
            immatriculation: null,
            sousTotalHT: devis.SousTotalHT,
            montantTVA: devis.MontantTVA,
            totalTTC: devis.TotalTTC,
            statut: devis.Statut.ToString(),
            dateSolde: null,
            modePaiement: null,
            lignes: devis.Lignes.Select(l => (l.Description, l.Quantité, l.PrixUnitaireHT, l.TauxTVA, l.Quantité * l.PrixUnitaireHT)).ToList());

    private byte[] GenerateDocument(
        bool isDevis,
        string numéro,
        DateTime date,
        DateTime échéance,
        string clientNom,
        string clientAdresse,
        string? clientNIF,
        string? immatriculation,
        decimal sousTotalHT,
        decimal montantTVA,
        decimal totalTTC,
        string statut,
        DateTime? dateSolde,
        string? modePaiement,
        List<(string Description, decimal Quantité, decimal PrixHT, decimal TVA, decimal TotalHT)> lignes)
    {
        return Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.8f, Unit.Centimetre);
                page.DefaultTextStyle(t => t.FontSize(9).FontFamily("Arial"));

                page.Content().Column(col =>
                {
                    // ── Header ──────────────────────────────────────────────
                    col.Item().Row(row =>
                    {
                        // Garage info
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text(_garage.Nom).Bold().FontSize(16).FontColor("#1e40af");
                            if (!string.IsNullOrEmpty(_garage.Adresse))
                                c.Item().Text(_garage.Adresse).FontColor("#6b7280");
                            if (!string.IsNullOrEmpty(_garage.Telephone))
                                c.Item().Text($"Tél : {_garage.Telephone}").FontColor("#6b7280");
                            if (!string.IsNullOrEmpty(_garage.NIF))
                                c.Item().Text($"NIF : {_garage.NIF}").FontColor("#6b7280");
                        });

                        // Document title
                        row.ConstantItem(180).Column(c =>
                        {
                            c.Item().AlignRight()
                                .Text(isDevis ? "DEVIS" : "FACTURE")
                                .Bold().FontSize(22).FontColor(isDevis ? "#d97706" : "#2563eb");
                            c.Item().AlignRight().Text(numéro).Bold().FontSize(11);
                            c.Item().AlignRight().Text($"Date : {date:dd/MM/yyyy}").FontColor("#374151");
                            c.Item().AlignRight()
                                .Text(isDevis ? $"Valable jusqu'au : {échéance:dd/MM/yyyy}" : $"Échéance : {échéance:dd/MM/yyyy}")
                                .FontColor("#374151");
                        });
                    });

                    col.Item().PaddingVertical(8).LineHorizontal(1).LineColor("#e5e7eb");

                    // ── Client ───────────────────────────────────────────────
                    col.Item().PaddingBottom(12).Column(c =>
                    {
                        c.Item().Text("Facturé à :").SemiBold().FontColor("#6b7280").FontSize(8);
                        c.Item().PaddingTop(4).Text(clientNom).SemiBold().FontSize(11);
                        if (!string.IsNullOrEmpty(clientAdresse))
                            c.Item().Text(clientAdresse).FontColor("#374151");
                        if (!string.IsNullOrEmpty(clientNIF))
                            c.Item().Text($"NIF : {clientNIF}").FontColor("#374151");
                        if (!string.IsNullOrEmpty(immatriculation))
                            c.Item().Text($"Véhicule : {immatriculation}").FontColor("#374151");
                    });

                    // ── Tableau lignes ───────────────────────────────────────
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(25);     // N°
                            cols.RelativeColumn(4);      // Désignation
                            cols.ConstantColumn(45);     // Qté
                            cols.ConstantColumn(65);     // Prix HT
                            cols.ConstantColumn(40);     // TVA%
                            cols.ConstantColumn(70);     // Total HT
                        });

                        // En-têtes
                        static IContainer HeaderCell(IContainer c) =>
                            c.Background("#1e40af").PaddingVertical(6).PaddingHorizontal(4);

                        table.Header(h =>
                        {
                            h.Cell().Element(HeaderCell).Text("N°").FontColor("#fff").Bold().FontSize(8);
                            h.Cell().Element(HeaderCell).Text("Désignation").FontColor("#fff").Bold().FontSize(8);
                            h.Cell().Element(HeaderCell).AlignRight().Text("Qté").FontColor("#fff").Bold().FontSize(8);
                            h.Cell().Element(HeaderCell).AlignRight().Text("Prix HT").FontColor("#fff").Bold().FontSize(8);
                            h.Cell().Element(HeaderCell).AlignCenter().Text("TVA%").FontColor("#fff").Bold().FontSize(8);
                            h.Cell().Element(HeaderCell).AlignRight().Text("Total HT").FontColor("#fff").Bold().FontSize(8);
                        });

                        for (int i = 0; i < lignes.Count; i++)
                        {
                            var l = lignes[i];
                            var bg = i % 2 == 0 ? "#f9fafb" : "#ffffff";

                            IContainer DataCell(IContainer c) =>
                                c.Background(bg).PaddingVertical(5).PaddingHorizontal(4);

                            table.Cell().Element(DataCell).Text($"{i + 1}").FontColor("#9ca3af");
                            table.Cell().Element(DataCell).Text(l.Description);
                            table.Cell().Element(DataCell).AlignRight().Text($"{l.Quantité:G}");
                            table.Cell().Element(DataCell).AlignRight().Text($"{l.PrixHT:N2}");
                            table.Cell().Element(DataCell).AlignCenter().Text($"{l.TVA:G}%").FontColor("#6b7280");
                            table.Cell().Element(DataCell).AlignRight().Text($"{l.TotalHT:N2}").SemiBold();
                        }
                    });

                    // ── Totaux ───────────────────────────────────────────────
                    col.Item().PaddingTop(8).AlignRight().Width(220).Column(c =>
                    {
                        void TotalRow(string label, decimal montant, bool bold = false, string color = "#111827")
                        {
                            c.Item().Row(r =>
                            {
                                r.RelativeItem().Text(label).FontColor("#6b7280");
                                r.ConstantItem(90).AlignRight()
                                    .Text($"{montant:N2} DA")
                                    .FontColor(color)
                                    .Bold();
                            });
                            c.Item().PaddingVertical(2).LineHorizontal(0.5f).LineColor("#f3f4f6");
                        }

                        TotalRow("Sous-total HT :", sousTotalHT);
                        TotalRow($"TVA (19%) :", montantTVA);
                        c.Item().Background("#1e40af").Padding(6).Row(r =>
                        {
                            r.RelativeItem().Text("TOTAL TTC :").FontColor("#fff").Bold();
                            r.ConstantItem(90).AlignRight()
                                .Text($"{totalTTC:N2} DA").FontColor("#fff").Bold().FontSize(11);
                        });
                    });

                    // ── Footer paiement ──────────────────────────────────────
                    if (dateSolde.HasValue)
                    {
                        col.Item().PaddingTop(16).Background("#f0fdf4").Border(1).BorderColor("#bbf7d0")
                            .Padding(8).Row(r =>
                            {
                                r.AutoItem().Text("✓ ").FontColor("#16a34a").Bold();
                                r.RelativeItem()
                                    .Text($"Payé le {dateSolde.Value:dd/MM/yyyy}" +
                                          (modePaiement != null ? $" par {modePaiement}" : ""))
                                    .FontColor("#16a34a").SemiBold();
                            });
                    }

                    col.Item().PaddingTop(16).Text("Conditions de règlement : Paiement à réception de facture.")
                        .FontColor("#9ca3af").FontSize(8).Italic();

                    col.Item().PaddingTop(4)
                        .Text("Document généré par le système de gestion GarageSystem.")
                        .FontColor("#d1d5db").FontSize(7).Italic();
                });
            });
        }).GeneratePdf();
    }
}
