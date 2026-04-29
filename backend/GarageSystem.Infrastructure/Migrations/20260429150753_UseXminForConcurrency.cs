using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GarageSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UseXminForConcurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "row_version",
                table: "ordre_reparation");

            migrationBuilder.CreateTable(
                name: "société",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    raison_sociale = table.Column<string>(type: "text", nullable: false),
                    nrc = table.Column<string>(type: "text", nullable: false),
                    nif = table.Column<string>(type: "text", nullable: false),
                    adresse_siège = table.Column<string>(type: "text", nullable: false),
                    téléphone_resp_achats = table.Column<string>(type: "text", nullable: false),
                    email_facturation = table.Column<string>(type: "text", nullable: false),
                    is_actif = table.Column<bool>(type: "boolean", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    date_suppression = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_société", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "contrat",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    société_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date_début = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    type_tarif = table.Column<int>(type: "integer", nullable: false),
                    plafond_mensuel_dzd = table.Column<decimal>(type: "numeric", nullable: true),
                    remise_pourcentage = table.Column<decimal>(type: "numeric", nullable: true),
                    conditions_particulières = table.Column<string>(type: "text", nullable: true),
                    is_actif = table.Column<bool>(type: "boolean", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_contrat", x => x.id);
                    table.ForeignKey(
                        name: "fk_contrat_société_société_id",
                        column: x => x.société_id,
                        principalTable: "société",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "facture_groupée",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    numéro = table.Column<string>(type: "text", nullable: false),
                    société_id = table.Column<Guid>(type: "uuid", nullable: false),
                    société_raison_sociale = table.Column<string>(type: "text", nullable: false),
                    société_nif = table.Column<string>(type: "text", nullable: false),
                    société_adresse = table.Column<string>(type: "text", nullable: false),
                    période_mois = table.Column<int>(type: "integer", nullable: false),
                    période_année = table.Column<int>(type: "integer", nullable: false),
                    sous_total_ht = table.Column<decimal>(type: "numeric", nullable: false),
                    montant_tva = table.Column<decimal>(type: "numeric", nullable: false),
                    total_ttc = table.Column<decimal>(type: "numeric", nullable: false),
                    dépassement_plafond = table.Column<bool>(type: "boolean", nullable: false),
                    statut = table.Column<int>(type: "integer", nullable: false),
                    date_facture = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    motifs_annulation = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_facture_groupée", x => x.id);
                    table.ForeignKey(
                        name: "fk_facture_groupée_société_société_id",
                        column: x => x.société_id,
                        principalTable: "société",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "véhicule_société",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    société_id = table.Column<Guid>(type: "uuid", nullable: false),
                    véhicule_id = table.Column<Guid>(type: "uuid", nullable: false),
                    vehicule_id = table.Column<Guid>(type: "uuid", nullable: false),
                    numéro_flotte = table.Column<string>(type: "text", nullable: true),
                    conducteur_habituel = table.Column<string>(type: "text", nullable: true),
                    date_affectation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_retrait = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_actif = table.Column<bool>(type: "boolean", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_véhicule_société", x => x.id);
                    table.ForeignKey(
                        name: "fk_véhicule_société_société_société_id",
                        column: x => x.société_id,
                        principalTable: "société",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_véhicule_société_vehicule_vehicule_id",
                        column: x => x.vehicule_id,
                        principalTable: "vehicule",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ligne_facture_groupée",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    facture_groupée_id = table.Column<Guid>(type: "uuid", nullable: false),
                    or_id = table.Column<Guid>(type: "uuid", nullable: false),
                    immatriculation = table.Column<string>(type: "text", nullable: false),
                    numéro_flotte = table.Column<string>(type: "text", nullable: true),
                    type_intervention = table.Column<string>(type: "text", nullable: false),
                    date_or = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    montant_ht = table.Column<decimal>(type: "numeric", nullable: false),
                    taux_tva = table.Column<decimal>(type: "numeric", nullable: false),
                    total_ttc = table.Column<decimal>(type: "numeric", nullable: false),
                    tarif_appliqué = table.Column<bool>(type: "boolean", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ligne_facture_groupée", x => x.id);
                    table.ForeignKey(
                        name: "fk_ligne_facture_groupée_facture_groupée_facture_groupée_id",
                        column: x => x.facture_groupée_id,
                        principalTable: "facture_groupée",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_ligne_facture_groupée_ordre_reparation_or_id",
                        column: x => x.or_id,
                        principalTable: "ordre_reparation",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_contrat_société_id",
                table: "contrat",
                column: "société_id");

            migrationBuilder.CreateIndex(
                name: "ix_facture_groupée_numéro",
                table: "facture_groupée",
                column: "numéro",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_facture_groupée_société_id",
                table: "facture_groupée",
                column: "société_id");

            migrationBuilder.CreateIndex(
                name: "ix_ligne_facture_groupée_facture_groupée_id",
                table: "ligne_facture_groupée",
                column: "facture_groupée_id");

            migrationBuilder.CreateIndex(
                name: "ix_ligne_facture_groupée_or_id",
                table: "ligne_facture_groupée",
                column: "or_id");

            migrationBuilder.CreateIndex(
                name: "ix_société_nrc",
                table: "société",
                column: "nrc",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_véhicule_société_société_id",
                table: "véhicule_société",
                column: "société_id");

            migrationBuilder.CreateIndex(
                name: "ix_véhicule_société_vehicule_id",
                table: "véhicule_société",
                column: "vehicule_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contrat");

            migrationBuilder.DropTable(
                name: "ligne_facture_groupée");

            migrationBuilder.DropTable(
                name: "véhicule_société");

            migrationBuilder.DropTable(
                name: "facture_groupée");

            migrationBuilder.DropTable(
                name: "société");

            migrationBuilder.AddColumn<byte[]>(
                name: "row_version",
                table: "ordre_reparation",
                type: "bytea",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);
        }
    }
}
