using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MoveDiscordWebhookToInstallation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiscordWebhooks");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DiscordDisabledByDiscordAt",
                table: "InstanceSettings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DiscordLastDeliveredAt",
                table: "InstanceSettings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscordLastError",
                table: "InstanceSettings",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscordProtectedUrl",
                table: "InstanceSettings",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "Features_Attachments",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "Features_CashFlowForecast",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "Features_PayeeNames",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "Features_People",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscordNotificationTypes",
                table: "AspNetUsers",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiscordDisabledByDiscordAt",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "DiscordLastDeliveredAt",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "DiscordLastError",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "DiscordProtectedUrl",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "Features_Attachments",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "Features_CashFlowForecast",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "Features_PayeeNames",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "Features_People",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "DiscordNotificationTypes",
                table: "AspNetUsers");

            migrationBuilder.CreateTable(
                name: "DiscordWebhooks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DisabledByDiscordAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LastDeliveredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ProtectedUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Types = table.Column<string>(type: "jsonb", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiscordWebhooks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DiscordWebhooks_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DiscordWebhooks_UserId",
                table: "DiscordWebhooks",
                column: "UserId",
                unique: true,
                filter: "\"IsDeleted\" = false");
        }
    }
}
