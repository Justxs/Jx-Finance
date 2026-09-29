using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReadReceiptsWithTesseract : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReceiptReadingUsages");

            migrationBuilder.DropColumn(
                name: "InputTokens",
                table: "ReceiptReadings");

            migrationBuilder.DropColumn(
                name: "Model",
                table: "ReceiptReadings");

            migrationBuilder.DropColumn(
                name: "OutputTokens",
                table: "ReceiptReadings");

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

            migrationBuilder.AlterColumn<bool>(
                name: "Features_ReceiptReading",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "InputTokens",
                table: "ReceiptReadings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Model",
                table: "ReceiptReadings",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "OutputTokens",
                table: "ReceiptReadings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<bool>(
                name: "Features_ReceiptReading",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

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
                name: "ReceiptReadingUsages",
                columns: table => new
                {
                    Month = table.Column<DateOnly>(type: "date", nullable: false),
                    InputTokens = table.Column<long>(type: "bigint", nullable: false),
                    OutputTokens = table.Column<long>(type: "bigint", nullable: false),
                    Readings = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReceiptReadingUsages", x => x.Month);
                });
        }
    }
}
