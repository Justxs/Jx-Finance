using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCsvImportMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CsvImportMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Encoding = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Delimiter = table.Column<string>(type: "character varying(1)", maxLength: 1, nullable: false),
                    SkipLines = table.Column<int>(type: "integer", nullable: false),
                    AmountStyle = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    DateFormat = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    DecimalSeparator = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                    Columns = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CsvImportMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CsvImportMappings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CsvImportMappings_UserId_Name",
                table: "CsvImportMappings",
                columns: new[] { "UserId", "Name" },
                filter: "\"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CsvImportMappings");
        }
    }
}
