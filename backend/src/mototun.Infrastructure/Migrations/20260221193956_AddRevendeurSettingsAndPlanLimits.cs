using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mototun.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRevendeurSettingsAndPlanLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RevendeurSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RevendeurId = table.Column<int>(type: "int", nullable: false),
                    WarningAfterHours = table.Column<int>(type: "int", nullable: false),
                    StuckAfterHours = table.Column<int>(type: "int", nullable: false),
                    EscalationAfterHours = table.Column<int>(type: "int", nullable: false),
                    RepeatEveryHours = table.Column<int>(type: "int", nullable: false),
                    EnableEscalation = table.Column<bool>(type: "bit", nullable: false),
                    EnableEmail = table.Column<bool>(type: "bit", nullable: false),
                    EnableSms = table.Column<bool>(type: "bit", nullable: false),
                    EnableWhatsApp = table.Column<bool>(type: "bit", nullable: false),
                    PlanTier = table.Column<int>(type: "int", nullable: false),
                    MonthlyInvoiceLimit = table.Column<int>(type: "int", nullable: false),
                    ActiveClientLimit = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RevendeurSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RevendeurSettings_Revendeurs_RevendeurId",
                        column: x => x.RevendeurId,
                        principalTable: "Revendeurs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RevendeurSettings_PlanTier",
                table: "RevendeurSettings",
                column: "PlanTier");

            migrationBuilder.CreateIndex(
                name: "IX_RevendeurSettings_RevendeurId",
                table: "RevendeurSettings",
                column: "RevendeurId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RevendeurSettings_UpdatedAt",
                table: "RevendeurSettings",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RevendeurSettings");
        }
    }
}
