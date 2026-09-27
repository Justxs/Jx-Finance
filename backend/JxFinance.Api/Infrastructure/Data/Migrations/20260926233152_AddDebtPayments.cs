using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDebtPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DebtId",
                table: "RecurringBills",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TracksPayments",
                table: "Debts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "DebtPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DebtId = table.Column<Guid>(type: "uuid", nullable: false),
                    TransactionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Principal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DebtPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DebtPayments_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DebtPayments_Debts_DebtId",
                        column: x => x.DebtId,
                        principalTable: "Debts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DebtPayments_Transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecurringBills_DebtId",
                table: "RecurringBills",
                column: "DebtId");

            migrationBuilder.CreateIndex(
                name: "IX_DebtPayments_DebtId",
                table: "DebtPayments",
                column: "DebtId");

            migrationBuilder.CreateIndex(
                name: "IX_DebtPayments_TransactionId",
                table: "DebtPayments",
                column: "TransactionId",
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_DebtPayments_UserId",
                table: "DebtPayments",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_RecurringBills_Debts_DebtId",
                table: "RecurringBills",
                column: "DebtId",
                principalTable: "Debts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RecurringBills_Debts_DebtId",
                table: "RecurringBills");

            migrationBuilder.DropTable(
                name: "DebtPayments");

            migrationBuilder.DropIndex(
                name: "IX_RecurringBills_DebtId",
                table: "RecurringBills");

            migrationBuilder.DropColumn(
                name: "DebtId",
                table: "RecurringBills");

            migrationBuilder.DropColumn(
                name: "TracksPayments",
                table: "Debts");
        }
    }
}
