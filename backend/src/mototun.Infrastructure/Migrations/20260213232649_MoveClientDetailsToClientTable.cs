using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mototun.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MoveClientDetailsToClientTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Clients",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FullName",
                table: "Clients",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Clients",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.Sql(
                @"UPDATE c
SET
    c.FullName = COALESCE(NULLIF(LTRIM(RTRIM(u.FullName)), ''), CONCAT('Client ', c.Id)),
    c.Email = NULLIF(LTRIM(RTRIM(u.Email)), ''),
    c.Phone = NULLIF(LTRIM(RTRIM(u.Phone)), '')
FROM Clients c
LEFT JOIN Users u ON u.Id = c.UserId;");

            migrationBuilder.AlterColumn<string>(
                name: "FullName",
                table: "Clients",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.DropForeignKey(
                name: "FK_Clients_Users_UserId",
                table: "Clients");

            migrationBuilder.Sql(
                @"DELETE u
FROM Users u
INNER JOIN Clients c ON c.UserId = u.Id
LEFT JOIN Revendeurs r ON r.UserId = u.Id
LEFT JOIN Fournisseurs f ON f.UserId = u.Id
WHERE u.Role = 1
  AND r.Id IS NULL
  AND f.Id IS NULL;");

            migrationBuilder.DropIndex(
                name: "IX_Clients_UserId",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Clients");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_Email",
                table: "Clients",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_FullName",
                table: "Clients",
                column: "FullName");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Clients_Email",
                table: "Clients");

            migrationBuilder.DropIndex(
                name: "IX_Clients_FullName",
                table: "Clients");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Clients",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(
                @"DECLARE @ClientUserMap TABLE (ClientId INT NOT NULL, UserId INT NOT NULL);

MERGE Users AS target
USING (
    SELECT
        c.Id AS ClientId,
        CASE
            WHEN c.Email IS NULL
                OR LTRIM(RTRIM(c.Email)) = ''
                OR EXISTS (SELECT 1 FROM Users u WHERE u.Email = LTRIM(RTRIM(c.Email)))
                THEN CONCAT('client-', c.Id, '-', REPLACE(CONVERT(varchar(36), NEWID()), '-', ''), '@migrated.local')
            ELSE LTRIM(RTRIM(c.Email))
        END AS Email,
        COALESCE(NULLIF(LTRIM(RTRIM(c.FullName)), ''), CONCAT('Client ', c.Id)) AS FullName,
        NULLIF(LTRIM(RTRIM(c.Phone)), '') AS Phone
    FROM Clients c
) AS source
ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT (Email, PasswordHash, FullName, Phone, Role, Status, CanLogin, Avatar, LastLoginAt, CreatedAt, UpdatedAt)
    VALUES (
        source.Email,
        'MIGRATED_CLIENT_PROFILE',
        source.FullName,
        source.Phone,
        1,
        1,
        0,
        NULL,
        NULL,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    )
OUTPUT source.ClientId, inserted.Id INTO @ClientUserMap (ClientId, UserId);

UPDATE c
SET c.UserId = m.UserId
FROM Clients c
INNER JOIN @ClientUserMap m ON m.ClientId = c.Id;");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "Clients",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clients_UserId",
                table: "Clients",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Clients_Users_UserId",
                table: "Clients",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "FullName",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Clients");
        }
    }
}
