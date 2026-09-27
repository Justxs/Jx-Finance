using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUnusualAmounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UnusualBasis",
                table: "Transactions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UnusualCheckedAt",
                table: "Transactions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UnusualDismissedAt",
                table: "Transactions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnusualFactor",
                table: "Transactions",
                type: "numeric(9,2)",
                precision: 9,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UnusualSampleSize",
                table: "Transactions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnusualTypicalAmount",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MatchKey",
                table: "RecurringBills",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Features_UnusualAmounts",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Unusual",
                table: "Transactions",
                columns: new[] { "AccountId", "Date" },
                filter: "\"UnusualBasis\" IS NOT NULL AND \"UnusualDismissedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_UnusualCheckedAt",
                table: "Transactions",
                column: "UnusualCheckedAt",
                filter: "\"UnusualCheckedAt\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_Unusual",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_UnusualCheckedAt",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UnusualBasis",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UnusualCheckedAt",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UnusualDismissedAt",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UnusualFactor",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UnusualSampleSize",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UnusualTypicalAmount",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "MatchKey",
                table: "RecurringBills");

            migrationBuilder.DropColumn(
                name: "Features_UnusualAmounts",
                table: "InstanceSettings");
        }
    }
}
