using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBrokerConnectionFundingAccountForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_BrokerConnections_FundingAccountId",
                table: "BrokerConnections",
                column: "FundingAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_BrokerConnections_Accounts_FundingAccountId",
                table: "BrokerConnections",
                column: "FundingAccountId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BrokerConnections_Accounts_FundingAccountId",
                table: "BrokerConnections");

            migrationBuilder.DropIndex(
                name: "IX_BrokerConnections_FundingAccountId",
                table: "BrokerConnections");
        }
    }
}
