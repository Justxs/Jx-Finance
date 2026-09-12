using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReleaseReliability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Keep the latest historical value if older concurrent reads created duplicate daily snapshots.
            migrationBuilder.Sql("""
                DELETE FROM "NetWorthSnapshots" WHERE "Id" IN (
                    SELECT "Id" FROM (SELECT "Id", row_number() OVER
                        (PARTITION BY "UserId", "Date" ORDER BY "UpdatedAt" DESC NULLS LAST, "CreatedAt" DESC, "Id" DESC) AS rn
                        FROM "NetWorthSnapshots") duplicates WHERE rn > 1);
                """);
            migrationBuilder.DropIndex(
                name: "IX_NetWorthSnapshots_UserId_Date",
                table: "NetWorthSnapshots");

            migrationBuilder.CreateTable(
                name: "TransferImports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImportRef = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    TransferId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransferImports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransferImports_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TransferImports_Transfers_TransferId",
                        column: x => x.TransferId,
                        principalTable: "Transfers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NetWorthSnapshots_UserId_Date",
                table: "NetWorthSnapshots",
                columns: new[] { "UserId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransferImports_AccountId_ImportRef",
                table: "TransferImports",
                columns: new[] { "AccountId", "ImportRef" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransferImports_TransferId",
                table: "TransferImports",
                column: "TransferId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TransferImports");

            migrationBuilder.DropIndex(
                name: "IX_NetWorthSnapshots_UserId_Date",
                table: "NetWorthSnapshots");

            migrationBuilder.CreateIndex(
                name: "IX_NetWorthSnapshots_UserId_Date",
                table: "NetWorthSnapshots",
                columns: new[] { "UserId", "Date" });
        }
    }
}
