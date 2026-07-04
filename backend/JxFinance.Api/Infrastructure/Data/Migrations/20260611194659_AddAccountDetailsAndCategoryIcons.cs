using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountDetailsAndCategoryIcons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "Categories",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Accounts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Iban",
                table: "Accounts",
                type: "character varying(34)",
                maxLength: 34,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "Categories" SET "Icon" = icons.icon
                FROM (VALUES
                    ('Salary', 'banknote'),
                    ('Other income', 'coins'),
                    ('Food', 'utensils'),
                    ('Rent', 'home'),
                    ('Utilities', 'lightbulb'),
                    ('Transport', 'car'),
                    ('Entertainment', 'clapperboard'),
                    ('Health', 'heart-pulse'),
                    ('Shopping', 'shopping-bag'),
                    ('Other', 'shapes')
                ) AS icons(name, icon)
                WHERE "Categories"."Name" = icons.name
                  AND "Categories"."IsDefault" = TRUE
                  AND "Categories"."Icon" IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Icon",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "Iban",
                table: "Accounts");
        }
    }
}
