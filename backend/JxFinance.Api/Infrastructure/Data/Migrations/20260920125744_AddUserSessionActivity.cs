using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSessionActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastSeenAt",
                table: "UserSessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "UserAgent",
                table: "UserSessions",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.Sql("""UPDATE "UserSessions" SET "LastSeenAt" = COALESCE("RotatedAt", "CreatedAt")""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastSeenAt",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                table: "UserSessions");
        }
    }
}
