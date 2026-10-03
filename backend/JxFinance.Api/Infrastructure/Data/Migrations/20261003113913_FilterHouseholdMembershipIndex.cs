using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class FilterHouseholdMembershipIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_HouseholdMemberships_HouseholdId_UserId",
                table: "HouseholdMemberships");

            migrationBuilder.CreateIndex(
                name: "IX_HouseholdMemberships_HouseholdId_UserId",
                table: "HouseholdMemberships",
                columns: new[] { "HouseholdId", "UserId" },
                unique: true,
                filter: "\"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_HouseholdMemberships_HouseholdId_UserId",
                table: "HouseholdMemberships");

            migrationBuilder.CreateIndex(
                name: "IX_HouseholdMemberships_HouseholdId_UserId",
                table: "HouseholdMemberships",
                columns: new[] { "HouseholdId", "UserId" },
                unique: true);
        }
    }
}
