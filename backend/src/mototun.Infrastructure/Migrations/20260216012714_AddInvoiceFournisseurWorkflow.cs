using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mototun.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceFournisseurWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AssignedFournisseurId",
                table: "Invoices",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CarteGriseStatusUpdatedAt",
                table: "Invoices",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CarteGriseStatusUpdatedByUserId",
                table: "Invoices",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SentToFournisseurAt",
                table: "Invoices",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_AssignedFournisseurId",
                table: "Invoices",
                column: "AssignedFournisseurId");

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Fournisseurs_AssignedFournisseurId",
                table: "Invoices",
                column: "AssignedFournisseurId",
                principalTable: "Fournisseurs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_Fournisseurs_AssignedFournisseurId",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_AssignedFournisseurId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "AssignedFournisseurId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "CarteGriseStatusUpdatedAt",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "CarteGriseStatusUpdatedByUserId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "SentToFournisseurAt",
                table: "Invoices");
        }
    }
}
