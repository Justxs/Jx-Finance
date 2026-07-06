using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHouseholdSharing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "HouseholdId",
                table: "Categories",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "Categories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "HouseholdId",
                table: "Accounts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "Accounts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Households",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Households", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HouseholdMemberships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HouseholdMemberships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HouseholdMemberships_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HouseholdMemberships_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_HouseholdId",
                table: "Categories",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_HouseholdId",
                table: "Accounts",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_HouseholdMemberships_HouseholdId_UserId",
                table: "HouseholdMemberships",
                columns: new[] { "HouseholdId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HouseholdMemberships_UserId",
                table: "HouseholdMemberships",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Accounts_Households_HouseholdId",
                table: "Accounts",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Households_HouseholdId",
                table: "Categories",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Accounts_Households_HouseholdId",
                table: "Accounts");

            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Households_HouseholdId",
                table: "Categories");

            migrationBuilder.DropTable(
                name: "HouseholdMemberships");

            migrationBuilder.DropTable(
                name: "Households");

            migrationBuilder.DropIndex(
                name: "IX_Categories_HouseholdId",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Accounts_HouseholdId",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "Accounts");
        }
    }
}
