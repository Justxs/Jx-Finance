using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ShareTransactionGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "HouseholdId",
                table: "TransactionGroups",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "TransactionGroups",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_TransactionGroups_HouseholdId",
                table: "TransactionGroups",
                column: "HouseholdId");

            migrationBuilder.AddForeignKey(
                name: "FK_TransactionGroups_Households_HouseholdId",
                table: "TransactionGroups",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TransactionGroups_Households_HouseholdId",
                table: "TransactionGroups");

            migrationBuilder.DropIndex(
                name: "IX_TransactionGroups_HouseholdId",
                table: "TransactionGroups");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "TransactionGroups");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "TransactionGroups");
        }
    }
}
