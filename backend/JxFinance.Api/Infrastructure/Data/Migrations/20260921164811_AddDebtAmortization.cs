using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDebtAmortization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AmortizationType",
                table: "Debts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateOnly>(
                name: "FirstPaymentDate",
                table: "Debts",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "LoanAmount",
                table: "Debts",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyPayment",
                table: "Debts",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TermMonths",
                table: "Debts",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AmortizationType",
                table: "Debts");

            migrationBuilder.DropColumn(
                name: "FirstPaymentDate",
                table: "Debts");

            migrationBuilder.DropColumn(
                name: "LoanAmount",
                table: "Debts");

            migrationBuilder.DropColumn(
                name: "MonthlyPayment",
                table: "Debts");

            migrationBuilder.DropColumn(
                name: "TermMonths",
                table: "Debts");
        }
    }
}
