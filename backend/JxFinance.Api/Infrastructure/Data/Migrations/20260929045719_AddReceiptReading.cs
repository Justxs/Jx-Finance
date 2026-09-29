using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReceiptReading : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Features_ReceiptReading",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptApiKeyProtected",
                table: "InstanceSettings",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ReceiptModel",
                table: "InstanceSettings",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "claude-sonnet-5");

            migrationBuilder.AddColumn<int>(
                name: "ReceiptMonthlyLimit",
                table: "InstanceSettings",
                type: "integer",
                nullable: false,
                defaultValue: 100);

            migrationBuilder.AddColumn<bool>(
                name: "ReceiptReadingEnabled",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ReceiptItemCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReceiptItemCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReceiptItemCategories_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReceiptItemCategories_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReceiptReadings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Sha256 = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Model = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    InputTokens = table.Column<int>(type: "integer", nullable: false),
                    OutputTokens = table.Column<int>(type: "integer", nullable: false),
                    Result = table.Column<string>(type: "jsonb", nullable: true),
                    ErrorCode = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReceiptReadings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReceiptReadings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReceiptReadingUsages",
                columns: table => new
                {
                    Month = table.Column<DateOnly>(type: "date", nullable: false),
                    Readings = table.Column<int>(type: "integer", nullable: false),
                    InputTokens = table.Column<long>(type: "bigint", nullable: false),
                    OutputTokens = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReceiptReadingUsages", x => x.Month);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptItemCategories_CategoryId",
                table: "ReceiptItemCategories",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptItemCategories_UserId_Key",
                table: "ReceiptItemCategories",
                columns: new[] { "UserId", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptReadings_UserId_Sha256",
                table: "ReceiptReadings",
                columns: new[] { "UserId", "Sha256" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReceiptItemCategories");

            migrationBuilder.DropTable(
                name: "ReceiptReadings");

            migrationBuilder.DropTable(
                name: "ReceiptReadingUsages");

            migrationBuilder.DropColumn(
                name: "Features_ReceiptReading",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptApiKeyProtected",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptModel",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptMonthlyLimit",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptReadingEnabled",
                table: "InstanceSettings");
        }
    }
}
