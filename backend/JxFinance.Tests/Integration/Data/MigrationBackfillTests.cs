using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace JxFinance.Tests.Integration.Data;

[Collection<IntegrationCollection>]
public sealed class MigrationBackfillTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task The_migration_backfills_one_history_point_per_priced_security()
    {
        var (priced, undated, unpriced) = (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await BackfillAsync(
            "AddUserSessionActivity",
            $"""
            INSERT INTO "Securities" ("Id", "Symbol", "Name", "Type", "Currency", "LastPrice", "LastPriceDate", "CreatedAt", "UpdatedAt", "IsDeleted")
            VALUES
                ('{priced}', 'PRICED', 'Priced', 0, 'EUR', 12.5, '2026-06-05', now(), now(), false),
                ('{undated}', 'UNDATED', 'Undated', 0, 'EUR', 7, NULL, now(), '2026-07-01T10:00:00Z', false),
                ('{unpriced}', 'UNPRICED', 'Unpriced', 0, 'EUR', NULL, NULL, now(), now(), false)
            """,
            async db =>
            {
                var points = await db.SecurityPrices.AsNoTracking().OrderBy(p => p.Price).ToListAsync(TestContext.Current.CancellationToken);
                Assert.Equal(
                    [(undated, new DateOnly(2026, 7, 1), 7m), (priced, new DateOnly(2026, 6, 5), 12.5m)],
                    points.Select(p => (p.SecurityId.Value, p.Date, p.Price)));
                Assert.Equal(new DateOnly(2026, 7, 1), (await db.Securities.SingleAsync(s => s.Symbol == "UNDATED", TestContext.Current.CancellationToken)).LastPriceDate);
            });
    }

    [Fact]
    public async Task The_migration_backfills_one_valuation_per_asset()
    {
        var (userId, flat, car) = (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        await BackfillAsync(
            "SimplifyMonthClose",
            $"""
            SET session_replication_role = replica;
            INSERT INTO "Assets" ("Id", "UserId", "Name", "Type", "CurrentValue", "Currency", "AsOf", "CreatedAt", "UpdatedAt", "IsDeleted")
            VALUES
                ('{flat}', '{userId}', 'Flat', 0, 150000, 'EUR', '2026-05-01', now(), now(), false),
                ('{car}', '{userId}', 'Car', 1, 9000, 'EUR', '2026-06-01', now(), now(), true)
            """,
            async db =>
            {
                var valuations = await db.AssetValuations.AsNoTracking().OrderBy(v => v.Value).ToListAsync(TestContext.Current.CancellationToken);
                Assert.Equal(
                    [(car, new DateOnly(2026, 6, 1), 9000m), (flat, new DateOnly(2026, 5, 1), 150000m)],
                    valuations.Select(v => (v.AssetId.Value, v.Date, v.Value)));
            });
    }

    private async Task BackfillAsync(string migrationBefore, string seedSql, Func<AppDbContext, Task> assert)
    {
        var database = $"jx_test_backfill_{Guid.NewGuid():N}";
        var connectionString = new NpgsqlConnectionStringBuilder(ConnectionString) { Database = database, Pooling = false }.ConnectionString;
        await ExecuteAsync(ConnectionString, $"CREATE DATABASE \"{database}\"");
        try
        {
            var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connectionString).Options;
            await using var db = new AppDbContext(options, new FixedUser(Guid.NewGuid()), new TestClock());
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync(migrationBefore, TestContext.Current.CancellationToken);
            await ExecuteAsync(connectionString, seedSql);

            await migrator.MigrateAsync(cancellationToken: TestContext.Current.CancellationToken);

            await assert(db);
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
