using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailDelivery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "SmtpEnabled",
                table: "InstanceSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SmtpEncryption",
                table: "InstanceSettings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "StartTls");

            migrationBuilder.AddColumn<string>(
                name: "SmtpFromAddress",
                table: "InstanceSettings",
                type: "character varying(320)",
                maxLength: 320,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpFromName",
                table: "InstanceSettings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpHost",
                table: "InstanceSettings",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SmtpPort",
                table: "InstanceSettings",
                type: "integer",
                nullable: false,
                defaultValue: 587);

            migrationBuilder.AddColumn<string>(
                name: "SmtpProtectedPassword",
                table: "InstanceSettings",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SmtpUserName",
                table: "InstanceSettings",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "BillReminderEmails",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "EmailMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ToAddress = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    ToName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    DedupeKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NextAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    LastError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailMessages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmailMessages_DedupeKey",
                table: "EmailMessages",
                column: "DedupeKey",
                unique: true,
                filter: "\"DedupeKey\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_EmailMessages_SentAt_NextAttemptAt",
                table: "EmailMessages",
                columns: new[] { "SentAt", "NextAttemptAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmailMessages");

            migrationBuilder.DropColumn(
                name: "SmtpEnabled",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "SmtpEncryption",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "SmtpFromAddress",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "SmtpFromName",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "SmtpHost",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "SmtpPort",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "SmtpProtectedPassword",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "SmtpUserName",
                table: "InstanceSettings");

            migrationBuilder.DropColumn(
                name: "BillReminderEmails",
                table: "AspNetUsers");
        }
    }
}
