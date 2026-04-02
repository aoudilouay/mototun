using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mototun.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AlignInvoiceSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SoldMotorcycles_ChassisNumber",
                table: "SoldMotorcycles");

            migrationBuilder.DropIndex(
                name: "IX_SoldMotorcycles_InvoiceId",
                table: "SoldMotorcycles");

            migrationBuilder.AlterColumn<string>(
                name: "Model",
                table: "SoldMotorcycles",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Matricule",
                table: "SoldMotorcycles",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "EngineNumber",
                table: "SoldMotorcycles",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Company",
                table: "SoldMotorcycles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "ChassisNumber",
                table: "SoldMotorcycles",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Brand",
                table: "SoldMotorcycles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<decimal>(
                name: "PurchasePrice",
                table: "SoldMotorcycles",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "RevendeurId",
                table: "SoldMotorcycles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "SalePrice",
                table: "SoldMotorcycles",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.Sql(
                """
                UPDATE s
                SET s.RevendeurId = i.RevendeurId
                FROM SoldMotorcycles AS s
                INNER JOIN Invoices AS i ON s.InvoiceId = i.Id
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Notes",
                table: "Invoices",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "InvoiceNumber",
                table: "Invoices",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AddColumn<decimal>(
                name: "TotalAmount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Invoices",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_SoldMotorcycles_InvoiceId",
                table: "SoldMotorcycles",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_SoldMotorcycles_RevendeurId_ChassisNumber",
                table: "SoldMotorcycles",
                columns: new[] { "RevendeurId", "ChassisNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_CreatedAt",
                table: "Invoices",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_InvoiceDate",
                table: "Invoices",
                column: "InvoiceDate");

            migrationBuilder.AddForeignKey(
                name: "FK_SoldMotorcycles_Revendeurs_RevendeurId",
                table: "SoldMotorcycles",
                column: "RevendeurId",
                principalTable: "Revendeurs",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SoldMotorcycles_Revendeurs_RevendeurId",
                table: "SoldMotorcycles");

            migrationBuilder.DropIndex(
                name: "IX_SoldMotorcycles_InvoiceId",
                table: "SoldMotorcycles");

            migrationBuilder.DropIndex(
                name: "IX_SoldMotorcycles_RevendeurId_ChassisNumber",
                table: "SoldMotorcycles");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_CreatedAt",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_InvoiceDate",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "PurchasePrice",
                table: "SoldMotorcycles");

            migrationBuilder.DropColumn(
                name: "RevendeurId",
                table: "SoldMotorcycles");

            migrationBuilder.DropColumn(
                name: "SalePrice",
                table: "SoldMotorcycles");

            migrationBuilder.DropColumn(
                name: "TotalAmount",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Invoices");

            migrationBuilder.AlterColumn<string>(
                name: "Model",
                table: "SoldMotorcycles",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(150)",
                oldMaxLength: 150);

            migrationBuilder.AlterColumn<string>(
                name: "Matricule",
                table: "SoldMotorcycles",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(120)",
                oldMaxLength: 120,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "EngineNumber",
                table: "SoldMotorcycles",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(120)",
                oldMaxLength: 120,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Company",
                table: "SoldMotorcycles",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "ChassisNumber",
                table: "SoldMotorcycles",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Brand",
                table: "SoldMotorcycles",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Notes",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "InvoiceNumber",
                table: "Invoices",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.CreateIndex(
                name: "IX_SoldMotorcycles_ChassisNumber",
                table: "SoldMotorcycles",
                column: "ChassisNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SoldMotorcycles_InvoiceId",
                table: "SoldMotorcycles",
                column: "InvoiceId",
                unique: true);
        }
    }
}
