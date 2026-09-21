using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SecurityPrices",
                columns: table => new
                {
                    SecurityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecurityPrices", x => new { x.SecurityId, x.Date });
                    table.ForeignKey(
                        name: "FK_SecurityPrices_Securities_SecurityId",
                        column: x => x.SecurityId,
                        principalTable: "Securities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(
                """
                UPDATE "Securities"
                SET "LastPriceDate" = ("UpdatedAt" AT TIME ZONE 'UTC')::date
                WHERE "LastPrice" IS NOT NULL AND "LastPriceDate" IS NULL;

                INSERT INTO "SecurityPrices" ("SecurityId", "Date", "Price")
                SELECT "Id", "LastPriceDate", "LastPrice"
                FROM "Securities"
                WHERE "LastPrice" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SecurityPrices");
        }
    }
}
