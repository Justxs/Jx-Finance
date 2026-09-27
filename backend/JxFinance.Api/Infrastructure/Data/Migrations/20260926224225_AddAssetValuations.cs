using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetValuations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Depreciation_LifeMonths",
                table: "Assets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Depreciation_ResidualValue",
                table: "Assets",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "Depreciation_StartDate",
                table: "Assets",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Depreciation_StartValue",
                table: "Assets",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AssetValuations",
                columns: table => new
                {
                    AssetId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Note = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetValuations", x => new { x.AssetId, x.Date });
                    table.ForeignKey(
                        name: "FK_AssetValuations_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(
                """
                INSERT INTO "AssetValuations" ("AssetId", "Date", "Value")
                SELECT "Id", "AsOf", "CurrentValue"
                FROM "Assets";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssetValuations");

            migrationBuilder.DropColumn(
                name: "Depreciation_LifeMonths",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Depreciation_ResidualValue",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Depreciation_StartDate",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Depreciation_StartValue",
                table: "Assets");
        }
    }
}
