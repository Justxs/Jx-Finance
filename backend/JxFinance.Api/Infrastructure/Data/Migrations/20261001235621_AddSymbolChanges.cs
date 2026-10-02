using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSymbolChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RelatedSecurityId",
                table: "InvestmentTransactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_InvestmentTransactions_RelatedSecurityId",
                table: "InvestmentTransactions",
                column: "RelatedSecurityId");

            migrationBuilder.AddForeignKey(
                name: "FK_InvestmentTransactions_Securities_RelatedSecurityId",
                table: "InvestmentTransactions",
                column: "RelatedSecurityId",
                principalTable: "Securities",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InvestmentTransactions_Securities_RelatedSecurityId",
                table: "InvestmentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_InvestmentTransactions_RelatedSecurityId",
                table: "InvestmentTransactions");

            migrationBuilder.DropColumn(
                name: "RelatedSecurityId",
                table: "InvestmentTransactions");
        }
    }
}
