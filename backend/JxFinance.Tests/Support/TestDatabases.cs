using JxFinance.Infrastructure;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using JxFinance.Infrastructure.Pdf;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Testcontainers.PostgreSql;

namespace JxFinance.Tests.Support;

public static class TestDatabases
{
    private const string DisposablePrefix = "jx_test_";

    private static readonly SemaphoreSlim Gate = new(1, 1);

    private static PostgreSqlContainer? container;
    private static string server = string.Empty;
    private static string prefix = string.Empty;
    private static int users;

    private static string Template => $"{prefix}_template";

    public static async Task<string> CreateAsync(string name)
    {
        await Gate.WaitAsync();
        try
        {
            if (users == 0)
            {
                await StartAsync();
            }

            users++;
            var database = $"{prefix}_{name.ToLowerInvariant()}";
            await ExecuteAsync(server, $"DROP DATABASE IF EXISTS \"{database}\" WITH (FORCE)");
            await ExecuteAsync(server, $"CREATE DATABASE \"{database}\" TEMPLATE \"{Template}\"");
            return new NpgsqlConnectionStringBuilder(server) { Database = database }.ConnectionString;
        }
        finally
        {
            Gate.Release();
        }
    }

    public static async Task DropAsync(string connectionString)
    {
        await Gate.WaitAsync();
        try
        {
            await ExecuteAsync(server, $"DROP DATABASE IF EXISTS \"{new NpgsqlConnectionStringBuilder(connectionString).Database}\" WITH (FORCE)");
            if (--users == 0)
            {
                await StopAsync();
            }
        }
        finally
        {
            Gate.Release();
        }
    }

    private static async Task StartAsync()
    {
        PdfFontResolver.Register();
        var external = Environment.GetEnvironmentVariable("JX_TEST_POSTGRES");
        if (string.IsNullOrWhiteSpace(external))
        {
            container = new PostgreSqlBuilder("postgres:16").Build();
            await container.StartAsync();
            server = container.GetConnectionString();
            prefix = "jx_test";
        }
        else
        {
            var database = new NpgsqlConnectionStringBuilder(external).Database;
            if (database is null || !database.StartsWith(DisposablePrefix, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("External integration databases must use the disposable jx_test_ prefix.");
            }

            server = external;
            prefix = database;
        }

        await ExecuteAsync(server, $"DROP DATABASE IF EXISTS \"{Template}\" WITH (FORCE)");
        await ExecuteAsync(server, $"CREATE DATABASE \"{Template}\"");
        await using var identity = new ServiceCollection()
            .Configure<IdentityOptions>(DependencyInjection.ConfigureIdentity)
            .BuildServiceProvider();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(new NpgsqlConnectionStringBuilder(server) { Database = Template, Pooling = false }.ConnectionString)
            .UseApplicationServiceProvider(identity)
            .EnableServiceProviderCaching(false)
            .Options;
        await using var db = new AppDbContext(options, new FixedUser(Guid.Empty), new TestClock());
        await db.Database.MigrateAsync();
    }

    private static async Task StopAsync()
    {
        if (container is null)
        {
            await ExecuteAsync(server, $"DROP DATABASE IF EXISTS \"{Template}\" WITH (FORCE)");
            return;
        }

        await container.DisposeAsync();
        container = null;
    }

    private static async Task ExecuteAsync(string connectionString, string sql)
    {
        await using var connection = new NpgsqlConnection(new NpgsqlConnectionStringBuilder(connectionString) { Pooling = false }.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }
}
