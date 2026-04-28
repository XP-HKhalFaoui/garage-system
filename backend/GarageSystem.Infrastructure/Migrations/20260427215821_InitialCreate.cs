using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GarageSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "article",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    référence = table.Column<string>(type: "text", nullable: false),
                    référence_oem = table.Column<string>(type: "text", nullable: true),
                    désignation = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    catégorie = table.Column<int>(type: "integer", nullable: false),
                    marques_compatibles = table.Column<string>(type: "text", nullable: true),
                    unité = table.Column<int>(type: "integer", nullable: false),
                    stock_actuel = table.Column<decimal>(type: "numeric", nullable: false),
                    stock_minimum = table.Column<decimal>(type: "numeric", nullable: false),
                    stock_maximum = table.Column<decimal>(type: "numeric", nullable: true),
                    prix_achat = table.Column<decimal>(type: "numeric", nullable: false),
                    prix_vente = table.Column<decimal>(type: "numeric", nullable: false),
                    emplacement_rayonnage = table.Column<string>(type: "text", nullable: true),
                    code_barre = table.Column<string>(type: "text", nullable: true),
                    is_actif = table.Column<bool>(type: "boolean", nullable: false),
                    date_dernier_mouvement = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    date_dernière_commande = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    date_suppression = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_article", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalized_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    concurrency_stamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_asp_net_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employe_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_actif = table.Column<bool>(type: "boolean", nullable: false),
                    user_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalized_user_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalized_email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    email_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: true),
                    security_stamp = table.Column<string>(type: "text", nullable: true),
                    concurrency_stamp = table.Column<string>(type: "text", nullable: true),
                    phone_number = table.Column<string>(type: "text", nullable: true),
                    phone_number_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    two_factor_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    lockout_end = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lockout_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    access_failed_count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_asp_net_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "bon_reception",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    numéro = table.Column<string>(type: "text", nullable: false),
                    fournisseur = table.Column<string>(type: "text", nullable: false),
                    référence_fournisseur = table.Column<string>(type: "text", nullable: true),
                    date_reception = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    montant_total = table.Column<decimal>(type: "numeric", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bon_reception", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "client",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    nom = table.Column<string>(type: "text", nullable: false),
                    prénom = table.Column<string>(type: "text", nullable: true),
                    raison_sociale = table.Column<string>(type: "text", nullable: true),
                    téléphone = table.Column<string>(type: "text", nullable: false),
                    téléphone_alt = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    adresse = table.Column<string>(type: "text", nullable: false),
                    wilaya = table.Column<int>(type: "integer", nullable: false),
                    date_naissance = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    nrc = table.Column<string>(type: "text", nullable: true),
                    nif = table.Column<string>(type: "text", nullable: true),
                    is_actif = table.Column<bool>(type: "boolean", nullable: false),
                    portail_token = table.Column<Guid>(type: "uuid", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    date_suppression = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_client", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "devis",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    numéro = table.Column<string>(type: "text", nullable: false),
                    or_id = table.Column<Guid>(type: "uuid", nullable: false),
                    client_id = table.Column<Guid>(type: "uuid", nullable: false),
                    statut = table.Column<int>(type: "integer", nullable: false),
                    date_expiration = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_envoi = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    motif_refus = table.Column<string>(type: "text", nullable: true),
                    sous_total_ht = table.Column<decimal>(type: "numeric", nullable: false),
                    montant_tva = table.Column<decimal>(type: "numeric", nullable: false),
                    total_ttc = table.Column<decimal>(type: "numeric", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_devis", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "employe",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    nom = table.Column<string>(type: "text", nullable: false),
                    prénom = table.Column<string>(type: "text", nullable: false),
                    date_naissance = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    téléphone = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: true),
                    adresse = table.Column<string>(type: "text", nullable: false),
                    poste = table.Column<int>(type: "integer", nullable: false),
                    département = table.Column<string>(type: "text", nullable: true),
                    salaire_base = table.Column<decimal>(type: "numeric", nullable: false),
                    type_contrat = table.Column<int>(type: "integer", nullable: false),
                    date_embauche = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_fin_contrat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    numéro_sécurité_sociale = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<string>(type: "text", nullable: true),
                    is_actif = table.Column<bool>(type: "boolean", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    date_suppression = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_employe", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "facture",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    numéro = table.Column<string>(type: "text", nullable: false),
                    or_id = table.Column<Guid>(type: "uuid", nullable: true),
                    devis_id = table.Column<Guid>(type: "uuid", nullable: true),
                    client_nom = table.Column<string>(type: "text", nullable: false),
                    client_adresse = table.Column<string>(type: "text", nullable: false),
                    client_nif = table.Column<string>(type: "text", nullable: true),
                    date_facture = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_echéance = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_solde = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    sous_total_ht = table.Column<decimal>(type: "numeric", nullable: false),
                    montant_tva = table.Column<decimal>(type: "numeric", nullable: false),
                    total_ttc = table.Column<decimal>(type: "numeric", nullable: false),
                    montant_déjà_payé = table.Column<decimal>(type: "numeric", nullable: false),
                    statut = table.Column<int>(type: "integer", nullable: false),
                    motifs_annulation = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_facture", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "notification",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "text", nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    level = table.Column<string>(type: "text", nullable: false),
                    is_read = table.Column<bool>(type: "boolean", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: true),
                    action_url = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_notification", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "refresh_token",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    token = table.Column<string>(type: "text", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    expiration = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_revoked = table.Column<bool>(type: "boolean", nullable: false),
                    replaced_by_token = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_refresh_token", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "alerte_stock",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    article_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stock_actuel = table.Column<decimal>(type: "numeric", nullable: false),
                    stock_minimum = table.Column<decimal>(type: "numeric", nullable: false),
                    date_detection = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    statut = table.Column<string>(type: "text", nullable: false),
                    commentaire = table.Column<string>(type: "text", nullable: true),
                    date_resolution = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_alerte_stock", x => x.id);
                    table.ForeignKey(
                        name: "fk_alerte_stock_article_article_id",
                        column: x => x.article_id,
                        principalTable: "article",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "mouvement_stock",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    article_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    quantité = table.Column<decimal>(type: "numeric", nullable: false),
                    stock_avant = table.Column<decimal>(type: "numeric", nullable: false),
                    stock_après = table.Column<decimal>(type: "numeric", nullable: false),
                    or_id = table.Column<Guid>(type: "uuid", nullable: true),
                    référence_document = table.Column<string>(type: "text", nullable: true),
                    motif = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mouvement_stock", x => x.id);
                    table.ForeignKey(
                        name: "fk_mouvement_stock_article_article_id",
                        column: x => x.article_id,
                        principalTable: "article",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false),
                    claim_type = table.Column<string>(type: "text", nullable: true),
                    claim_value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_asp_net_role_claims", x => x.id);
                    table.ForeignKey(
                        name: "fk_asp_net_role_claims_asp_net_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "AspNetRoles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    claim_type = table.Column<string>(type: "text", nullable: true),
                    claim_value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_asp_net_user_claims", x => x.id);
                    table.ForeignKey(
                        name: "fk_asp_net_user_claims_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    login_provider = table.Column<string>(type: "text", nullable: false),
                    provider_key = table.Column<string>(type: "text", nullable: false),
                    provider_display_name = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_asp_net_user_logins", x => new { x.login_provider, x.provider_key });
                    table.ForeignKey(
                        name: "fk_asp_net_user_logins_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_asp_net_user_roles", x => new { x.user_id, x.role_id });
                    table.ForeignKey(
                        name: "fk_asp_net_user_roles_asp_net_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "AspNetRoles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_asp_net_user_roles_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    login_provider = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_asp_net_user_tokens", x => new { x.user_id, x.login_provider, x.name });
                    table.ForeignKey(
                        name: "fk_asp_net_user_tokens_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ligne_bon_reception",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    bon_reception_id = table.Column<Guid>(type: "uuid", nullable: false),
                    article_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantite_recue = table.Column<decimal>(type: "numeric", nullable: false),
                    prix_unitaire_achat = table.Column<decimal>(type: "numeric", nullable: false),
                    numéro_lot = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ligne_bon_reception", x => x.id);
                    table.ForeignKey(
                        name: "fk_ligne_bon_reception_article_article_id",
                        column: x => x.article_id,
                        principalTable: "article",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_ligne_bon_reception_bon_reception_bon_reception_id",
                        column: x => x.bon_reception_id,
                        principalTable: "bon_reception",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vehicule",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    client_id = table.Column<Guid>(type: "uuid", nullable: false),
                    immatriculation = table.Column<string>(type: "text", nullable: false),
                    vin = table.Column<string>(type: "text", nullable: true),
                    marque = table.Column<string>(type: "text", nullable: false),
                    modele = table.Column<string>(type: "text", nullable: false),
                    version = table.Column<string>(type: "text", nullable: true),
                    année = table.Column<int>(type: "integer", nullable: false),
                    carburant = table.Column<int>(type: "integer", nullable: false),
                    cylindrée = table.Column<int>(type: "integer", nullable: true),
                    transmission = table.Column<int>(type: "integer", nullable: false),
                    couleur = table.Column<string>(type: "text", nullable: true),
                    kilométrage_actuel = table.Column<decimal>(type: "numeric", nullable: false),
                    kilométrage_dernière_visite = table.Column<decimal>(type: "numeric", nullable: false),
                    date_dernière_visite = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_actif = table.Column<bool>(type: "boolean", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    date_suppression = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vehicule", x => x.id);
                    table.ForeignKey(
                        name: "fk_vehicule_client_client_id",
                        column: x => x.client_id,
                        principalTable: "client",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ligne_devis",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    devis_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    quantité = table.Column<decimal>(type: "numeric", nullable: false),
                    prix_unitaire_ht = table.Column<decimal>(type: "numeric", nullable: false),
                    taux_tva = table.Column<decimal>(type: "numeric", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ligne_devis", x => x.id);
                    table.ForeignKey(
                        name: "fk_ligne_devis_devis_devis_id",
                        column: x => x.devis_id,
                        principalTable: "devis",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "bulletin_paie",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employe_id = table.Column<Guid>(type: "uuid", nullable: false),
                    mois = table.Column<string>(type: "text", nullable: false),
                    jours_travaillés = table.Column<int>(type: "integer", nullable: false),
                    jours_ouvrables_mois = table.Column<int>(type: "integer", nullable: false),
                    salaire_base = table.Column<decimal>(type: "numeric", nullable: false),
                    salaire_base_propratisé = table.Column<decimal>(type: "numeric", nullable: false),
                    maj_heures_sup = table.Column<decimal>(type: "numeric", nullable: false),
                    total_primes = table.Column<decimal>(type: "numeric", nullable: false),
                    salaire_brut = table.Column<decimal>(type: "numeric", nullable: false),
                    cotisation_cnas = table.Column<decimal>(type: "numeric", nullable: false),
                    cotisation_retraite = table.Column<decimal>(type: "numeric", nullable: false),
                    irg = table.Column<decimal>(type: "numeric", nullable: false),
                    total_cotisations = table.Column<decimal>(type: "numeric", nullable: false),
                    salaire_net = table.Column<decimal>(type: "numeric", nullable: false),
                    statut = table.Column<string>(type: "text", nullable: false),
                    date_paiement = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    mode_paiement = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bulletin_paie", x => x.id);
                    table.ForeignKey(
                        name: "fk_bulletin_paie_employe_employe_id",
                        column: x => x.employe_id,
                        principalTable: "employe",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "demande_conge",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employe_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    date_début = table.Column<DateOnly>(type: "date", nullable: false),
                    date_fin = table.Column<DateOnly>(type: "date", nullable: false),
                    nb_jours = table.Column<int>(type: "integer", nullable: false),
                    motif = table.Column<string>(type: "text", nullable: false),
                    statut = table.Column<int>(type: "integer", nullable: false),
                    approbateur_id = table.Column<Guid>(type: "uuid", nullable: true),
                    date_decision = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    commentaire_decision = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_demande_conge", x => x.id);
                    table.ForeignKey(
                        name: "fk_demande_conge_employe_employe_id",
                        column: x => x.employe_id,
                        principalTable: "employe",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pointage",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employe_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    heure_entrée = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    heure_sortie = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    type_jour = table.Column<int>(type: "integer", nullable: false),
                    nb_heures_travaillées = table.Column<decimal>(type: "numeric", nullable: false),
                    nb_heures_sup = table.Column<decimal>(type: "numeric", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_pointage", x => x.id);
                    table.ForeignKey(
                        name: "fk_pointage_employe_employe_id",
                        column: x => x.employe_id,
                        principalTable: "employe",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prime",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employe_id = table.Column<Guid>(type: "uuid", nullable: false),
                    mois = table.Column<string>(type: "text", nullable: false),
                    type = table.Column<string>(type: "text", nullable: false),
                    montant = table.Column<decimal>(type: "numeric", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_prime", x => x.id);
                    table.ForeignKey(
                        name: "fk_prime_employe_employe_id",
                        column: x => x.employe_id,
                        principalTable: "employe",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "solde_conge",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    employe_id = table.Column<Guid>(type: "uuid", nullable: false),
                    année = table.Column<int>(type: "integer", nullable: false),
                    annuel_total = table.Column<int>(type: "integer", nullable: false),
                    annuel_pris = table.Column<int>(type: "integer", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_solde_conge", x => x.id);
                    table.ForeignKey(
                        name: "fk_solde_conge_employe_employe_id",
                        column: x => x.employe_id,
                        principalTable: "employe",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ligne_facture",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    facture_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    quantité = table.Column<decimal>(type: "numeric", nullable: false),
                    prix_unitaire_ht = table.Column<decimal>(type: "numeric", nullable: false),
                    taux_tva = table.Column<decimal>(type: "numeric", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ligne_facture", x => x.id);
                    table.ForeignKey(
                        name: "fk_ligne_facture_facture_facture_id",
                        column: x => x.facture_id,
                        principalTable: "facture",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "paiement",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    facture_id = table.Column<Guid>(type: "uuid", nullable: false),
                    montant = table.Column<decimal>(type: "numeric", nullable: false),
                    mode_paiement = table.Column<int>(type: "integer", nullable: false),
                    référence = table.Column<string>(type: "text", nullable: true),
                    date_paiement = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_paiement", x => x.id);
                    table.ForeignKey(
                        name: "fk_paiement_facture_facture_id",
                        column: x => x.facture_id,
                        principalTable: "facture",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "offre_envoyee",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    vehicule_id = table.Column<Guid>(type: "uuid", nullable: false),
                    types = table.Column<string>(type: "text", nullable: false),
                    canal = table.Column<string>(type: "text", nullable: false),
                    date_envoi = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    statut = table.Column<string>(type: "text", nullable: false),
                    message_envoyé = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_offre_envoyee", x => x.id);
                    table.ForeignKey(
                        name: "fk_offre_envoyee_vehicule_vehicule_id",
                        column: x => x.vehicule_id,
                        principalTable: "vehicule",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ordre_reparation",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    numéro = table.Column<string>(type: "text", nullable: false),
                    vehicule_id = table.Column<Guid>(type: "uuid", nullable: false),
                    technicien_id = table.Column<Guid>(type: "uuid", nullable: true),
                    statut = table.Column<int>(type: "integer", nullable: false),
                    priorité = table.Column<int>(type: "integer", nullable: false),
                    type_intervention = table.Column<int>(type: "integer", nullable: false),
                    date_ouverture = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_fermeture = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    heure_debut = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    diagnostic = table.Column<string>(type: "text", nullable: true),
                    montant_total = table.Column<decimal>(type: "numeric", nullable: false),
                    facture_id = table.Column<Guid>(type: "uuid", nullable: true),
                    facture_groupée_id = table.Column<Guid>(type: "uuid", nullable: true),
                    row_version = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ordre_reparation", x => x.id);
                    table.ForeignKey(
                        name: "fk_ordre_reparation_employe_technicien_id",
                        column: x => x.technicien_id,
                        principalTable: "employe",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_ordre_reparation_vehicule_vehicule_id",
                        column: x => x.vehicule_id,
                        principalTable: "vehicule",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "historique_statut_or",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    or_id = table.Column<Guid>(type: "uuid", nullable: false),
                    statut_avant = table.Column<int>(type: "integer", nullable: false),
                    statut_après = table.Column<int>(type: "integer", nullable: false),
                    commentaire = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<string>(type: "text", nullable: true),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_historique_statut_or", x => x.id);
                    table.ForeignKey(
                        name: "fk_historique_statut_or_ordre_reparation_or_id",
                        column: x => x.or_id,
                        principalTable: "ordre_reparation",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ligne_or",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    or_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    article_id = table.Column<Guid>(type: "uuid", nullable: true),
                    description = table.Column<string>(type: "text", nullable: false),
                    quantité = table.Column<decimal>(type: "numeric", nullable: false),
                    prix_unitaire = table.Column<decimal>(type: "numeric", nullable: false),
                    date_creation = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ligne_or", x => x.id);
                    table.ForeignKey(
                        name: "fk_ligne_or_article_article_id",
                        column: x => x.article_id,
                        principalTable: "article",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_ligne_or_ordre_reparation_or_id",
                        column: x => x.or_id,
                        principalTable: "ordre_reparation",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_alerte_stock_article_id",
                table: "alerte_stock",
                column: "article_id");

            migrationBuilder.CreateIndex(
                name: "ix_article_référence",
                table: "article",
                column: "référence",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_asp_net_role_claims_role_id",
                table: "AspNetRoleClaims",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_asp_net_user_claims_user_id",
                table: "AspNetUserClaims",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_asp_net_user_logins_user_id",
                table: "AspNetUserLogins",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_asp_net_user_roles_role_id",
                table: "AspNetUserRoles",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "normalized_email");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "normalized_user_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_bon_reception_numéro",
                table: "bon_reception",
                column: "numéro",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_bulletin_paie_employe_id",
                table: "bulletin_paie",
                column: "employe_id");

            migrationBuilder.CreateIndex(
                name: "ix_client_téléphone",
                table: "client",
                column: "téléphone",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_demande_conge_employe_id",
                table: "demande_conge",
                column: "employe_id");

            migrationBuilder.CreateIndex(
                name: "ix_historique_statut_or_or_id",
                table: "historique_statut_or",
                column: "or_id");

            migrationBuilder.CreateIndex(
                name: "ix_ligne_bon_reception_article_id",
                table: "ligne_bon_reception",
                column: "article_id");

            migrationBuilder.CreateIndex(
                name: "ix_ligne_bon_reception_bon_reception_id",
                table: "ligne_bon_reception",
                column: "bon_reception_id");

            migrationBuilder.CreateIndex(
                name: "ix_ligne_devis_devis_id",
                table: "ligne_devis",
                column: "devis_id");

            migrationBuilder.CreateIndex(
                name: "ix_ligne_facture_facture_id",
                table: "ligne_facture",
                column: "facture_id");

            migrationBuilder.CreateIndex(
                name: "ix_ligne_or_article_id",
                table: "ligne_or",
                column: "article_id");

            migrationBuilder.CreateIndex(
                name: "ix_ligne_or_or_id",
                table: "ligne_or",
                column: "or_id");

            migrationBuilder.CreateIndex(
                name: "ix_mouvement_stock_article_id",
                table: "mouvement_stock",
                column: "article_id");

            migrationBuilder.CreateIndex(
                name: "ix_offre_envoyee_vehicule_id",
                table: "offre_envoyee",
                column: "vehicule_id");

            migrationBuilder.CreateIndex(
                name: "ix_ordre_reparation_numéro",
                table: "ordre_reparation",
                column: "numéro",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_ordre_reparation_technicien_id",
                table: "ordre_reparation",
                column: "technicien_id");

            migrationBuilder.CreateIndex(
                name: "ix_ordre_reparation_vehicule_id",
                table: "ordre_reparation",
                column: "vehicule_id");

            migrationBuilder.CreateIndex(
                name: "ix_paiement_facture_id",
                table: "paiement",
                column: "facture_id");

            migrationBuilder.CreateIndex(
                name: "ix_pointage_employe_id",
                table: "pointage",
                column: "employe_id");

            migrationBuilder.CreateIndex(
                name: "ix_prime_employe_id",
                table: "prime",
                column: "employe_id");

            migrationBuilder.CreateIndex(
                name: "ix_solde_conge_employe_id",
                table: "solde_conge",
                column: "employe_id");

            migrationBuilder.CreateIndex(
                name: "ix_vehicule_client_id",
                table: "vehicule",
                column: "client_id");

            migrationBuilder.CreateIndex(
                name: "ix_vehicule_immatriculation",
                table: "vehicule",
                column: "immatriculation",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alerte_stock");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "bulletin_paie");

            migrationBuilder.DropTable(
                name: "demande_conge");

            migrationBuilder.DropTable(
                name: "historique_statut_or");

            migrationBuilder.DropTable(
                name: "ligne_bon_reception");

            migrationBuilder.DropTable(
                name: "ligne_devis");

            migrationBuilder.DropTable(
                name: "ligne_facture");

            migrationBuilder.DropTable(
                name: "ligne_or");

            migrationBuilder.DropTable(
                name: "mouvement_stock");

            migrationBuilder.DropTable(
                name: "notification");

            migrationBuilder.DropTable(
                name: "offre_envoyee");

            migrationBuilder.DropTable(
                name: "paiement");

            migrationBuilder.DropTable(
                name: "pointage");

            migrationBuilder.DropTable(
                name: "prime");

            migrationBuilder.DropTable(
                name: "refresh_token");

            migrationBuilder.DropTable(
                name: "solde_conge");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "bon_reception");

            migrationBuilder.DropTable(
                name: "devis");

            migrationBuilder.DropTable(
                name: "ordre_reparation");

            migrationBuilder.DropTable(
                name: "article");

            migrationBuilder.DropTable(
                name: "facture");

            migrationBuilder.DropTable(
                name: "employe");

            migrationBuilder.DropTable(
                name: "vehicule");

            migrationBuilder.DropTable(
                name: "client");
        }
    }
}
