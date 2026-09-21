using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionDismissals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SubscriptionDismissals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionDismissals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubscriptionDismissals_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SubscriptionDismissals_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionDismissals_AccountId",
                table: "SubscriptionDismissals",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionDismissals_UserId_AccountId_Description",
                table: "SubscriptionDismissals",
                columns: new[] { "UserId", "AccountId", "Description" },
                unique: true,
                filter: "\"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SubscriptionDismissals");
        }
    }
}
