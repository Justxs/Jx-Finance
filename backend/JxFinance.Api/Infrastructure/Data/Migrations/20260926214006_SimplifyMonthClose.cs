using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyMonthClose : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MonthCloses_UserId_Month_HouseholdId",
                table: "MonthCloses");

            migrationBuilder.Sql("""DELETE FROM "MonthCloses" WHERE "IsDeleted";""");

            migrationBuilder.CreateIndex(
                name: "IX_MonthCloses_UserId_Month_HouseholdId",
                table: "MonthCloses",
                columns: new[] { "UserId", "Month", "HouseholdId" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);

            migrationBuilder.Sql("""
                UPDATE "MonthCloses"
                SET "Snapshot" = ("Snapshot" - 'rows' - 'netWorth') || jsonb_build_object(
                    'rowIds',
                    COALESCE((SELECT jsonb_agg(r -> 'id') FROM jsonb_array_elements("Snapshot" -> 'rows') AS r), '[]'::jsonb))
                WHERE "Snapshot" ? 'rows';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MonthCloses_UserId_Month_HouseholdId",
                table: "MonthCloses");

            migrationBuilder.CreateIndex(
                name: "IX_MonthCloses_UserId_Month_HouseholdId",
                table: "MonthCloses",
                columns: new[] { "UserId", "Month", "HouseholdId" },
                unique: true,
                filter: "\"IsDeleted\" = false")
                .Annotation("Npgsql:NullsDistinct", false);
        }
    }
}
