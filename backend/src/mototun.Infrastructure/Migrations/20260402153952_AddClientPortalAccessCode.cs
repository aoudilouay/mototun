using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mototun.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClientPortalAccessCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientPortalAccessCode",
                table: "Invoices",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE [Invoices]
                SET [ClientPortalAccessCode] = UPPER(REPLACE(CONVERT(varchar(36), NEWID()), '-', ''))
                WHERE [ClientPortalAccessCode] IS NULL OR [ClientPortalAccessCode] = ''
                """);

            migrationBuilder.AlterColumn<string>(
                name: "ClientPortalAccessCode",
                table: "Invoices",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_ClientPortalAccessCode",
                table: "Invoices",
                column: "ClientPortalAccessCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Invoices_ClientPortalAccessCode",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ClientPortalAccessCode",
                table: "Invoices");
        }
    }
}
