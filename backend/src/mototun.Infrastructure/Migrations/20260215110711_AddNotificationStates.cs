using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mototun.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationStates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificationStates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RevendeurId = table.Column<int>(type: "int", nullable: false),
                    NotificationId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    IsDismissed = table.Column<bool>(type: "bit", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DismissedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationStates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationStates_Revendeurs_RevendeurId",
                        column: x => x.RevendeurId,
                        principalTable: "Revendeurs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationStates_RevendeurId_IsRead_IsDismissed",
                table: "NotificationStates",
                columns: new[] { "RevendeurId", "IsRead", "IsDismissed" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationStates_RevendeurId_NotificationId",
                table: "NotificationStates",
                columns: new[] { "RevendeurId", "NotificationId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationStates_UpdatedAt",
                table: "NotificationStates",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationStates");
        }
    }
}
