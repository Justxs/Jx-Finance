using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMergers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CostShare",
                table: "InvestmentTransactions",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RelatedQuantity",
                table: "InvestmentTransactions",
                type: "numeric(20,8)",
                precision: 20,
                scale: 8,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CostShare",
                table: "InvestmentTransactions");

            migrationBuilder.DropColumn(
                name: "RelatedQuantity",
                table: "InvestmentTransactions");
        }
    }
}
