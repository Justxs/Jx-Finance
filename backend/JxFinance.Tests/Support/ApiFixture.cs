using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace JxFinance.Tests.Support;

public sealed class ApiFixture : IAsyncLifetime
{
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
        });
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
