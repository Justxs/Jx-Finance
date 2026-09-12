using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace JxFinance.Tests.Support;

public sealed class ApiFixture : IAsyncLifetime
{
    public const string TestAdminEmail = "test-admin@localhost";
    public const string TestAdminPassword = "Test-Password-123!";

    private PostgreSqlContainer? _db;

    private WebApplicationFactory<Program> _factory = default!;

    public WebApplicationFactory<Program> Factory => _factory;

    public HttpClient Client { get; private set; } = default!;

    public async Task InitializeAsync()
    {
        var externalConnection = Environment.GetEnvironmentVariable("JX_TEST_POSTGRES");
        if (string.IsNullOrWhiteSpace(externalConnection))
        {
            _db = new PostgreSqlBuilder("postgres:16").Build();
            await _db.StartAsync();
        }
        else if (!new Npgsql.NpgsqlConnectionStringBuilder(externalConnection).Database!.StartsWith("jx_test_", StringComparison.Ordinal))
            throw new InvalidOperationException("External integration databases must use the disposable jx_test_ prefix.");

        Environment.SetEnvironmentVariable("ConnectionStrings__Default", _db?.GetConnectionString() ?? externalConnection!);
        Environment.SetEnvironmentVariable("App__BackgroundJobs", "false");
        Environment.SetEnvironmentVariable("App__DataProtectionDirectory", Path.Combine(Path.GetTempPath(), "jx-test-keys", Guid.NewGuid().ToString("N")));

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
        Environment.SetEnvironmentVariable("App__BackgroundJobs", null);
        Environment.SetEnvironmentVariable("App__DataProtectionDirectory", null);
        if (_db is not null)
            await _db.DisposeAsync();
    }
}

[CollectionDefinition(Name)]
public sealed class IntegrationCollection : ICollectionFixture<ApiFixture>
{
    public const string Name = "Integration";
}
