using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTagBudgets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "CategoryId",
                table: "Budgets",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "TagId",
                table: "Budgets",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_TagId",
                table: "Budgets",
                column: "TagId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Budgets_CategoryOrTag",
                table: "Budgets",
                sql: "(\"CategoryId\" IS NULL) <> (\"TagId\" IS NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_Budgets_Tags_TagId",
                table: "Budgets",
                column: "TagId",
                principalTable: "Tags",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Budgets_Tags_TagId",
                table: "Budgets");

            migrationBuilder.DropIndex(
                name: "IX_Budgets_TagId",
                table: "Budgets");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Budgets_CategoryOrTag",
                table: "Budgets");

            migrationBuilder.DropColumn(
                name: "TagId",
                table: "Budgets");

            migrationBuilder.AlterColumn<Guid>(
                name: "CategoryId",
                table: "Budgets",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
