using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mototun.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceTimelineEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InvoiceTimelineEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InvoiceId = table.Column<int>(type: "int", nullable: false),
                    EventType = table.Column<int>(type: "int", nullable: false),
                    ActorUserId = table.Column<int>(type: "int", nullable: true),
                    ActorRole = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceTimelineEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvoiceTimelineEvents_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceTimelineEvents_CreatedAt",
                table: "InvoiceTimelineEvents",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceTimelineEvents_EventType",
                table: "InvoiceTimelineEvents",
                column: "EventType");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceTimelineEvents_InvoiceId",
                table: "InvoiceTimelineEvents",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceTimelineEvents_InvoiceId_CreatedAt",
                table: "InvoiceTimelineEvents",
                columns: new[] { "InvoiceId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InvoiceTimelineEvents");
        }
    }
}
