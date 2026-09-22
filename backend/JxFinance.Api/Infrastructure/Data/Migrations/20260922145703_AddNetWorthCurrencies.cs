using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNetWorthCurrencies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "NetWorthSnapshots",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "EUR");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Debts",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "EUR");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Assets",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "EUR");

            foreach (var table in new[] { "Assets", "Debts", "NetWorthSnapshots" })
            {
                migrationBuilder.Sql(
                    $"""UPDATE "{table}" SET "Currency" = COALESCE((SELECT "ReportingCurrency" FROM "InstanceSettings" LIMIT 1), 'EUR')""");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Currency",
                table: "NetWorthSnapshots");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Debts");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Assets");
        }
    }
}
