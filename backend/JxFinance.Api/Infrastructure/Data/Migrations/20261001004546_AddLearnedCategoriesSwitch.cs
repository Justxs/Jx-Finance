using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLearnedCategoriesSwitch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Features_LearnedCategories",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Features_LearnedCategories",
                table: "InstanceSettings");
        }
    }
}
