using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace JxFinance.Tests;

// Round-trip integration test: a real PostgreSQL container, the API booted via
// WebApplicationFactory (migrations apply on startup), exercised over HTTP.
public sealed class PingEndpointTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .Build();

    public async Task InitializeAsync()
    {
        await _db.StartAsync();

        // WebApplication.CreateBuilder reads env vars before Build(), and env vars
        // override appsettings — so this points the API at the test container.
        // (The factory's ConfigureAppConfiguration runs too late: after Program.cs
        // has already read the connection string.)
        Environment.SetEnvironmentVariable("ConnectionStrings__Default", _db.GetConnectionString());
    }

    public async Task DisposeAsync()
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__Default", null);
        await _db.DisposeAsync();
    }

    [Fact]
    public async Task Ping_round_trips_and_database_is_healthy()
    {
        await using var factory = new WebApplicationFactory<Program>();
        var client = factory.CreateClient();

        var ping = await client.GetFromJsonAsync<PingResponse>("/api/ping");
        Assert.NotNull(ping);
        Assert.Equal("pong", ping!.Message);

        // /health pings the database, so a healthy response proves the API reached Postgres.
        var health = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, health.StatusCode);
    }

    private sealed record PingResponse(string Message, DateTimeOffset UtcNow);
}
