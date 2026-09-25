using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace JxFinance.Tests.Integration.Data;

[Collection<IntegrationCollection>]
public sealed class SecurityPriceBackfillTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string MigrationBefore = "AddUserSessionActivity";

    [Fact]
    public async Task The_migration_backfills_one_history_point_per_priced_security()
    {
        var database = $"jx_test_backfill_{Guid.NewGuid():N}";
        var connectionString = new NpgsqlConnectionStringBuilder(ConnectionString) { Database = database, Pooling = false }.ConnectionString;
        await ExecuteAsync(ConnectionString, $"CREATE DATABASE \"{database}\"");
        try
        {
            var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connectionString).Options;
            await using var db = new AppDbContext(options, new FixedUser(Guid.NewGuid()), new TestClock());
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync(MigrationBefore, TestContext.Current.CancellationToken);
            var (priced, undated, unpriced) = (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
            await ExecuteAsync(
                connectionString,
                $"""
                INSERT INTO "Securities" ("Id", "Symbol", "Name", "Type", "Currency", "LastPrice", "LastPriceDate", "CreatedAt", "UpdatedAt", "IsDeleted")
                VALUES
                    ('{priced}', 'PRICED', 'Priced', 0, 'EUR', 12.5, '2026-06-05', now(), now(), false),
                    ('{undated}', 'UNDATED', 'Undated', 0, 'EUR', 7, NULL, now(), '2026-07-01T10:00:00Z', false),
                    ('{unpriced}', 'UNPRICED', 'Unpriced', 0, 'EUR', NULL, NULL, now(), now(), false)
                """);

            await migrator.MigrateAsync(cancellationToken: TestContext.Current.CancellationToken);

            var points = await db.SecurityPrices.AsNoTracking().OrderBy(p => p.Price).ToListAsync(TestContext.Current.CancellationToken);
            Assert.Equal(
                [(undated, new DateOnly(2026, 7, 1), 7m), (priced, new DateOnly(2026, 6, 5), 12.5m)],
                points.Select(p => (p.SecurityId.Value, p.Date, p.Price)));
            Assert.Equal(new DateOnly(2026, 7, 1), (await db.Securities.SingleAsync(s => s.Symbol == "UNDATED", TestContext.Current.CancellationToken)).LastPriceDate);
        }
        finally
        {
            await ExecuteAsync(ConnectionString, $"DROP DATABASE IF EXISTS \"{database}\" WITH (FORCE)");
        }
    }

    private static async Task ExecuteAsync(string connectionString, string sql)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }
}
