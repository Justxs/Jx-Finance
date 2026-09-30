using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTokenWriteAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Access",
                table: "PersonalApiTokens",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Read");

            migrationBuilder.AddColumn<string>(
                name: "ViaToken",
                table: "AuditEvents",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ApiIdempotencyKeys",
                columns: table => new
                {
                    TokenId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    RequestHash = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    StatusCode = table.Column<int>(type: "integer", nullable: true),
                    Body = table.Column<string>(type: "jsonb", nullable: true),
                    Location = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiIdempotencyKeys", x => new { x.TokenId, x.Key });
                    table.ForeignKey(
                        name: "FK_ApiIdempotencyKeys_PersonalApiTokens_TokenId",
                        column: x => x.TokenId,
                        principalTable: "PersonalApiTokens",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApiIdempotencyKeys");

            migrationBuilder.DropColumn(
                name: "Access",
                table: "PersonalApiTokens");

            migrationBuilder.DropColumn(
                name: "ViaToken",
                table: "AuditEvents");
        }
    }
}
