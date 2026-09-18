using System.Net.Http.Json;
using FastEndpoints.Testing;
using JxFinance.Common.ExchangeRates;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;

namespace JxFinance.Tests.Support;

public sealed class ApiFixture : AppFixture<Program>
{
    public const string TestAdminEmail = "test-admin@localhost";
    public const string TestAdminPassword = "Test-Password-123!";

    private PostgreSqlContainer? _db;
    private string _connectionString = default!;
    private readonly string _keyDirectory = Path.Combine(Path.GetTempPath(), "jx-test-keys", Guid.NewGuid().ToString("N"));

    public HttpClient Api { get; private set; } = default!;

    protected override async ValueTask PreSetupAsync()
    {
        var externalConnection = Environment.GetEnvironmentVariable("JX_TEST_POSTGRES");
        if (string.IsNullOrWhiteSpace(externalConnection))
        {
            _db = new PostgreSqlBuilder("postgres:16").Build();
            await _db.StartAsync();
        }
        else if (!new Npgsql.NpgsqlConnectionStringBuilder(externalConnection).Database!.StartsWith("jx_test_", StringComparison.Ordinal))
            throw new InvalidOperationException("External integration databases must use the disposable jx_test_ prefix.");

        _connectionString = _db?.GetConnectionString() ?? externalConnection!;
    }

    protected override void ConfigureApp(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", _connectionString);
        builder.UseSetting("App:BackgroundJobs", "false");
        builder.UseSetting("App:DataProtectionDirectory", _keyDirectory);
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<IExchangeRateProvider>();
        services.AddSingleton<IExchangeRateProvider, FixedRateProvider>();
    }

    protected override async ValueTask SetupAsync()
    {
        Api = CreateSessionClient();

        await Api.PostAsJsonAsync(
            "/api/setup",
            new { email = TestAdminEmail, password = TestAdminPassword, displayName = "Test Admin" });

        var loginResponse = await Api.PostAsJsonAsync(
            "/api/auth/login",
            new { email = TestAdminEmail, password = TestAdminPassword, rememberMe = false });
        loginResponse.EnsureSuccessStatusCode();
    }

    public HttpClient CreateSessionClient() =>
        CreateClient(
            client => client.DefaultRequestHeaders.Add("X-Forwarded-For", "127.0.0.1"),
            new ClientOptions { AllowAutoRedirect = false, HandleCookies = true });

    protected override async ValueTask TearDownAsync()
    {
        Api?.Dispose();
        if (_db is not null)
            await _db.DisposeAsync();
    }
}

public sealed class IntegrationCollection : TestCollection<ApiFixture>;
