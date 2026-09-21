using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalAccountFunding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Funding",
                table: "Goals",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "FundingAccountId",
                table: "Goals",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FundingSharePercent",
                table: "Goals",
                type: "integer",
                nullable: false,
                defaultValue: 100);

            migrationBuilder.CreateIndex(
                name: "IX_Goals_FundingAccountId",
                table: "Goals",
                column: "FundingAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_Goals_Accounts_FundingAccountId",
                table: "Goals",
                column: "FundingAccountId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Goals_Accounts_FundingAccountId",
                table: "Goals");

            migrationBuilder.DropIndex(
                name: "IX_Goals_FundingAccountId",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "Funding",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "FundingAccountId",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "FundingSharePercent",
                table: "Goals");
        }
    }
}
