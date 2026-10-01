using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddManualExchangeRates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ManualExchangeRates",
                columns: table => new
                {
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Rate = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManualExchangeRates", x => new { x.Date, x.Currency });
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ManualExchangeRates");
        }
    }
}
