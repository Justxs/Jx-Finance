using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringBillShape : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Shape",
                table: "RecurringBills",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ToAccountId",
                table: "RecurringBills",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecurringBills_ToAccountId",
                table: "RecurringBills",
                column: "ToAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_RecurringBills_Accounts_ToAccountId",
                table: "RecurringBills",
                column: "ToAccountId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RecurringBills_Accounts_ToAccountId",
                table: "RecurringBills");

            migrationBuilder.DropIndex(
                name: "IX_RecurringBills_ToAccountId",
                table: "RecurringBills");

            migrationBuilder.DropColumn(
                name: "Shape",
                table: "RecurringBills");

            migrationBuilder.DropColumn(
                name: "ToAccountId",
                table: "RecurringBills");
        }
    }
}
