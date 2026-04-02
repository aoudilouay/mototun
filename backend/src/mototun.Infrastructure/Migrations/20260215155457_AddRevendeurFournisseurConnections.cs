using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mototun.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRevendeurFournisseurConnections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RevendeurFournisseurConnections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RevendeurId = table.Column<int>(type: "int", nullable: false),
                    FournisseurId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    RequestedByRole = table.Column<int>(type: "int", nullable: false),
                    RequestedByUserId = table.Column<int>(type: "int", nullable: false),
                    RejectReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RespondedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RevendeurFournisseurConnections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RevendeurFournisseurConnections_Fournisseurs_FournisseurId",
                        column: x => x.FournisseurId,
                        principalTable: "Fournisseurs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RevendeurFournisseurConnections_Revendeurs_RevendeurId",
                        column: x => x.RevendeurId,
                        principalTable: "Revendeurs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RevendeurFournisseurConnections_FournisseurId_Status",
                table: "RevendeurFournisseurConnections",
                columns: new[] { "FournisseurId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_RevendeurFournisseurConnections_RevendeurId_FournisseurId",
                table: "RevendeurFournisseurConnections",
                columns: new[] { "RevendeurId", "FournisseurId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RevendeurFournisseurConnections_RevendeurId_Status",
                table: "RevendeurFournisseurConnections",
                columns: new[] { "RevendeurId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_RevendeurFournisseurConnections_UpdatedAt",
                table: "RevendeurFournisseurConnections",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RevendeurFournisseurConnections");
        }
    }
}
