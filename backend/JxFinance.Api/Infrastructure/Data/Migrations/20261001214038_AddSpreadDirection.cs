using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSpreadDirection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SpreadDirection",
                table: "Transactions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateOnly>(
                name: "SpreadFrom",
                table: "Transactions",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SpreadDirection",
                table: "RecurringBills",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SpreadDirection",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "SpreadFrom",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "SpreadDirection",
                table: "RecurringBills");
        }
    }
}
