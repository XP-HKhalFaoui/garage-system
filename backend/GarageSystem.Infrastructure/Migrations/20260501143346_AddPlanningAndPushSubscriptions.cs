using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GarageSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanningAndPushSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "heure_fin",
                table: "ordre_reparation",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "push_subscription_entity",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    endpoint = table.Column<string>(type: "text", nullable: false),
                    p256dh = table.Column<string>(type: "text", nullable: false),
                    auth = table.Column<string>(type: "text", nullable: false),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    date_creation = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    date_modification = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_push_subscription_entity", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "push_subscription_entity");

            migrationBuilder.DropColumn(
                name: "heure_fin",
                table: "ordre_reparation");
        }
    }
}
