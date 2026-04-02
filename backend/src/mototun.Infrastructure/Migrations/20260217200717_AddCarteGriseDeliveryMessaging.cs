using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mototun.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCarteGriseDeliveryMessaging : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientUpdateMessage",
                table: "Invoices",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ClientUpdateUpdatedAt",
                table: "Invoices",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClientUpdateUpdatedByUserId",
                table: "Invoices",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DocumentIssueMessage",
                table: "Invoices",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DocumentIssueUpdatedAt",
                table: "Invoices",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DocumentIssueUpdatedByUserId",
                table: "Invoices",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClientUpdateMessage",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ClientUpdateUpdatedAt",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ClientUpdateUpdatedByUserId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "DocumentIssueMessage",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "DocumentIssueUpdatedAt",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "DocumentIssueUpdatedByUserId",
                table: "Invoices");
        }
    }
}
