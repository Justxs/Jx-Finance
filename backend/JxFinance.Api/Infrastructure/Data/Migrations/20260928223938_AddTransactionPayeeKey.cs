using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionPayeeKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PayeeKey",
                table: "Transactions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_PayeeKeyPending",
                table: "Transactions",
                column: "Id",
                filter: "\"PayeeKey\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_PayeeKeyPending",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "PayeeKey",
                table: "Transactions");
        }
    }
}
