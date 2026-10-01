using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReconciliationCurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AccountReconciliations_AccountId_Date",
                table: "AccountReconciliations");

            migrationBuilder.CreateIndex(
                name: "IX_AccountReconciliations_AccountId_Currency_Date",
                table: "AccountReconciliations",
                columns: new[] { "AccountId", "Currency", "Date" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AccountReconciliations_AccountId_Currency_Date",
                table: "AccountReconciliations");

            migrationBuilder.CreateIndex(
                name: "IX_AccountReconciliations_AccountId_Date",
                table: "AccountReconciliations",
                columns: new[] { "AccountId", "Date" },
                unique: true);
        }
    }
}
