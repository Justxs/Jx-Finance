using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JxFinance.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddInstanceSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InstanceSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    InstanceName = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    ReportingCurrency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    EnabledCurrencyCodes = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ExchangeRateSyncEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultLanguage = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    TimeZone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    FirstDayOfWeek = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    DefaultAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    DefaultPageSize = table.Column<int>(type: "integer", nullable: false),
                    Features_Budgets = table.Column<bool>(type: "boolean", nullable: false),
                    Features_Goals = table.Column<bool>(type: "boolean", nullable: false),
                    Features_Households = table.Column<bool>(type: "boolean", nullable: false),
                    Features_Import = table.Column<bool>(type: "boolean", nullable: false),
                    Features_MultiCurrency = table.Column<bool>(type: "boolean", nullable: false),
                    Features_NetWorth = table.Column<bool>(type: "boolean", nullable: false),
                    Features_RecurringBills = table.Column<bool>(type: "boolean", nullable: false),
                    Features_Reports = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstanceSettings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InstanceSettings");
        }
    }
}
