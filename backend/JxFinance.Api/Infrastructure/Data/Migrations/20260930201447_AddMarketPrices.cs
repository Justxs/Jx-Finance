using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMarketPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "SecurityPrices",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "Manual");

            migrationBuilder.AddColumn<string>(
                name: "PriceSource",
                table: "Securities",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "None");

            migrationBuilder.AddColumn<string>(
                name: "PriceSymbol",
                table: "Securities",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PriceSyncError",
                table: "Securities",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PriceSyncedAt",
                table: "Securities",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EodhdProtectedKey",
                table: "InstanceSettings",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateOnly>(
                name: "PriceCallsDate",
                table: "InstanceSettings",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PriceCallsUsed",
                table: "InstanceSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "PriceSyncEnabled",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PriceSyncRunAt",
                table: "InstanceSettings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Securities_PriceSymbol",
                table: "Securities",
                sql: "\"PriceSource\" = 'None' OR \"PriceSymbol\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Securities_PriceSymbol",
                table: "Securities");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "SecurityPrices");

            migrationBuilder.DropColumn(
                name: "PriceSource",
                table: "Securities");

            migrationBuilder.DropColumn(
                name: "PriceSymbol",
                table: "Securities");

            migrationBuilder.DropColumn(
                name: "PriceSyncError",
                table: "Securities");

            migrationBuilder.DropColumn(
                name: "PriceSyncedAt",
                table: "Securities");

            migrationBuilder.DropColumn(
                name: "EodhdProtectedKey",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "PriceCallsDate",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "PriceCallsUsed",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "PriceSyncEnabled",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "PriceSyncRunAt",
                table: "InstanceSettings");
        }
    }
}
