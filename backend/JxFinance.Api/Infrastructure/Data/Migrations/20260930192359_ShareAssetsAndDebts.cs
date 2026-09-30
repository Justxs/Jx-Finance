using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ShareAssetsAndDebts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "HouseholdId",
                table: "Debts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "Debts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "HouseholdId",
                table: "Assets",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "Assets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Debts_HouseholdId",
                table: "Debts",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_HouseholdId",
                table: "Assets",
                column: "HouseholdId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Households_HouseholdId",
                table: "Assets",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Debts_Households_HouseholdId",
                table: "Debts",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Households_HouseholdId",
                table: "Assets");

            migrationBuilder.DropForeignKey(
                name: "FK_Debts_Households_HouseholdId",
                table: "Debts");

            migrationBuilder.DropIndex(
                name: "IX_Debts_HouseholdId",
                table: "Debts");

            migrationBuilder.DropIndex(
                name: "IX_Assets_HouseholdId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Debts");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "Debts");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "Assets");
        }
    }
}
