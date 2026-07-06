using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace JxFinance.Tests.Support;

public sealed class ApiFixture : IAsyncLifetime
{
    public const string TestAdminEmail = "test-admin@localhost";
    public const string TestAdminPassword = "Test-Password-123!";

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .Build();

    private WebApplicationFactory<Program> _factory = default!;

    public WebApplicationFactory<Program> Factory => _factory;

    public HttpClient Client { get; private set; } = default!;

    public async Task InitializeAsync()
    {
        await _db.StartAsync();

        Environment.SetEnvironmentVariable("ConnectionStrings__Default", _db.GetConnectionString());

        _factory = new WebApplicationFactory<Program>();

        Client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true,
        });
        Client.DefaultRequestHeaders.Add("X-Forwarded-For", "127.0.0.1");

        await AuthenticateAsync();
    }

    private async Task AuthenticateAsync()
    {
        await Client.PostAsJsonAsync(
            "/api/setup",
            new { email = TestAdminEmail, password = TestAdminPassword, displayName = "Test Admin" });

        var loginResponse = await Client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = TestAdminEmail, password = TestAdminPassword, rememberMe = false });
        loginResponse.EnsureSuccessStatusCode();
    }

    public async Task DisposeAsync()
    {
        Client?.Dispose();
        await _factory.DisposeAsync();
        Environment.SetEnvironmentVariable("ConnectionStrings__Default", null);
        await _db.DisposeAsync();
    }
}

[CollectionDefinition(Name)]
public sealed class IntegrationCollection : ICollectionFixture<ApiFixture>
{
    public const string Name = "Integration";
}
