using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SharePlansWithHousehold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "HouseholdId",
                table: "RecurringBills",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "RecurringBills",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "HouseholdId",
                table: "Goals",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "Goals",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "HouseholdId",
                table: "Budgets",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "Budgets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_RecurringBills_HouseholdId",
                table: "RecurringBills",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_Goals_HouseholdId",
                table: "Goals",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_HouseholdId",
                table: "Budgets",
                column: "HouseholdId");

            migrationBuilder.AddForeignKey(
                name: "FK_Budgets_Households_HouseholdId",
                table: "Budgets",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Goals_Households_HouseholdId",
                table: "Goals",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RecurringBills_Households_HouseholdId",
                table: "RecurringBills",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Budgets_Households_HouseholdId",
                table: "Budgets");

            migrationBuilder.DropForeignKey(
                name: "FK_Goals_Households_HouseholdId",
                table: "Goals");

            migrationBuilder.DropForeignKey(
                name: "FK_RecurringBills_Households_HouseholdId",
                table: "RecurringBills");

            migrationBuilder.DropIndex(
                name: "IX_RecurringBills_HouseholdId",
                table: "RecurringBills");

            migrationBuilder.DropIndex(
                name: "IX_Goals_HouseholdId",
                table: "Goals");

            migrationBuilder.DropIndex(
                name: "IX_Budgets_HouseholdId",
                table: "Budgets");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "RecurringBills");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "RecurringBills");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Budgets");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "Budgets");
        }
    }
}
