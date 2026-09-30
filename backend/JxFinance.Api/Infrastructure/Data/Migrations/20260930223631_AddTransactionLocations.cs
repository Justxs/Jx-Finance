using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "Transactions",
                type: "numeric(7,5)",
                precision: 7,
                scale: 5,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "Transactions",
                type: "numeric(8,5)",
                precision: 8,
                scale: 5,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Place",
                table: "Transactions",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Features_Locations",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Place",
                table: "Transactions",
                columns: new[] { "AccountId", "Place" },
                filter: "\"Place\" IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Transactions_Coordinates",
                table: "Transactions",
                sql: "(\"Latitude\" IS NULL) = (\"Longitude\" IS NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_Place",
                table: "Transactions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Transactions_Coordinates",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Place",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Features_Locations",
                table: "InstanceSettings");
        }
    }
}
