using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionSpread : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<short>(
                name: "SpreadMonths",
                table: "Transactions",
                type: "smallint",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "SpreadUntil",
                table: "Transactions",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<short>(
                name: "SpreadMonths",
                table: "RecurringBills",
                type: "smallint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Spread",
                table: "Transactions",
                columns: new[] { "AccountId", "SpreadUntil" },
                filter: "\"SpreadMonths\" IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Transactions_SpreadMonths",
                table: "Transactions",
                sql: "\"SpreadMonths\" IS NULL OR \"SpreadMonths\" BETWEEN 2 AND 36");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Transactions_SpreadUntil",
                table: "Transactions",
                sql: "(\"SpreadMonths\" IS NULL) = (\"SpreadUntil\" IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RecurringBills_SpreadMonths",
                table: "RecurringBills",
                sql: "\"SpreadMonths\" IS NULL OR \"SpreadMonths\" BETWEEN 2 AND 36");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_Spread",
                table: "Transactions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Transactions_SpreadMonths",
                table: "Transactions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Transactions_SpreadUntil",
                table: "Transactions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RecurringBills_SpreadMonths",
                table: "RecurringBills");

            migrationBuilder.DropColumn(
                name: "SpreadMonths",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "SpreadUntil",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "SpreadMonths",
                table: "RecurringBills");
        }
    }
}
