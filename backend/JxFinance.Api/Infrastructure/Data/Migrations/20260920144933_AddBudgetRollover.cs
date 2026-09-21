using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBudgetRollover : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RolloverEnabled",
                table: "Budgets",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RolloverEnabled",
                table: "Budgets");
        }
    }
}
