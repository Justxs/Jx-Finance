using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using FastEndpoints.Testing;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Support;

public abstract class IntegrationTestBase(ApiFixture fixture)
{
    private const string UserPassword = "Test-User-Password-123!";

    protected HttpClient Client => fixture.Api;

    protected IServiceProvider Services => fixture.Services;

    protected string ConnectionString => fixture.ConnectionString;

    protected DateOnly Today => Services.GetRequiredService<IClock>().Today;

    protected HttpClient CreateClient(bool handleCookies = true)
    {
        var client = fixture.CreateClient(new ClientOptions { HandleCookies = handleCookies, AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Add("X-Forwarded-For", Guid.NewGuid().ToString());
        return client;
    }

    protected async Task<TestUser> CreateUserAsync(string role = "Member")
    {
        var email = $"user-{Guid.NewGuid():N}@localhost";
        var created = await PostAsync<IdDto>(
            Client,
            "/api/users",
            new { email, displayName = "Test User", role, password = UserPassword });
        return new TestUser(created.Id, email, UserPassword);
    }

    protected async Task<HttpClient> LoginAsync(TestUser user)
    {
        var client = CreateClient();
        var response = await TryLoginAsync(client, user.Email, user.Password);
        response.EnsureSuccessStatusCode();
        return client;
    }

    protected static Task<HttpResponseMessage> TryLoginAsync(
        HttpClient client,
        string email,
        string password,
        string? twoFactorCode = null) =>
        client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false, twoFactorCode },
            TestContext.Current.CancellationToken);

    protected async Task<HttpClient> CreateUserClientAsync(string role = "Member") =>
        await LoginAsync(await CreateUserAsync(role));

    protected async Task<Guid> CreateAccountAsync(
        string startingBalance = "0.00",
        string type = "checking",
        string? currency = null,
        Guid? householdId = null,
        HttpClient? client = null)
    {
        var created = await PostAsync<IdDto>(
            client ?? Client,
            "/api/accounts",
            new
            {
                name = $"Account {Guid.NewGuid():N}",
                type,
                startingBalance,
                currency,
                scope = householdId is null ? "personal" : "shared",
                householdId,
            });
        return created.Id;
    }

    protected async Task<Guid> CreateCategoryAsync(string type = "expense", HttpClient? client = null) =>
        await Seed.CategoryAsync(client ?? Client, $"Category {Guid.NewGuid():N}", type);

    protected async Task<Guid> CreateTagAsync(string? name = null, Guid? householdId = null, HttpClient? client = null)
    {
        var created = await PostAsync<IdDto>(
            client ?? Client,
            "/api/tags",
            new
            {
                name = name ?? $"Tag {Guid.NewGuid():N}",
                scope = householdId is null ? "personal" : "shared",
                householdId,
            });
        return created.Id;
    }

    protected Task<Guid> CreateHouseholdAsync(params TestUser[] members) =>
        Seed.HouseholdAsync(Client, null, members);

    protected async Task<HouseholdPair> CreateHouseholdPairAsync()
    {
        var owner = await CreateUserAsync();
        var partner = await CreateUserAsync();
        var household = await CreateHouseholdAsync(owner, partner);
        return new HouseholdPair(owner, partner, await LoginAsync(owner), await LoginAsync(partner), household);
    }

    protected async Task<string> CurrentBalanceAsync(Guid accountId, HttpClient? client = null) =>
        (await (client ?? Client).GetFromJsonAsync<AccountDto>(
            $"/api/accounts/{accountId}",
            TestContext.Current.CancellationToken))!.CurrentBalance;

    protected static Task<TransactionDto> RecordTransactionAsync(HttpClient client, object transaction) =>
        PostAsync<TransactionDto>(client, "/api/transactions", transaction);

    protected static Task<TransactionDto> CreateTransactionAsync(
        HttpClient client,
        Guid accountId,
        Guid? categoryId,
        string type,
        string amount,
        string date,
        string? description = null) =>
        RecordTransactionAsync(client, new { accountId, categoryId, type, amount, date, description });

    protected static string NewSymbol() => $"T{Guid.NewGuid():N}"[..10].ToUpperInvariant();

    protected static async Task<Guid> CreateSecurityAsync(HttpClient client, string? symbol = null, string name = "Test fund") =>
        (await PostAsync<IdDto>(
            client,
            "/api/investments/securities",
            new { symbol = symbol ?? NewSymbol(), name, type = "etf", currency = "eur" })).Id;

    protected static async Task<Guid> RecordInvestmentAsync(HttpClient client, object entry) =>
        (await PostAsync<IdDto>(client, "/api/investments/transactions", entry)).Id;

    protected static Task<T> PostAsync<T>(HttpClient client, string url, object body) =>
        Seed.PostAsync<T>(client, url, body);

    protected async Task<IAsyncDisposable> OverrideSettingsAsync(Action<JsonObject> change)
    {
        var original = (await Client.GetFromJsonAsync<JsonObject>("/api/settings", TestContext.Current.CancellationToken))!;
        var changed = original.DeepClone().AsObject();
        change(changed);
        await SaveSettingsAsync(changed);
        return new SettingsOverride(() => SaveSettingsAsync(original));
    }

    protected Task<IAsyncDisposable> FeatureOffAsync(string feature) =>
        OverrideSettingsAsync(settings => settings["features"]![feature] = false);

    protected Task<IAsyncDisposable> OnlyCurrenciesAsync(params string[] codes) =>
        OverrideSettingsAsync(settings => settings["enabledCurrencies"] = JsonSerializer.SerializeToNode(codes));

    protected async Task WithDbAsync(Func<AppDbContext, Task> work)
    {
        await using var scope = Services.CreateAsyncScope();
        await work(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    protected async Task<T> WithDbAsync<T>(Func<AppDbContext, Task<T>> work)
    {
        await using var scope = Services.CreateAsyncScope();
        return await work(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    protected async Task WithDbAsync(Guid userId, Func<AppDbContext, Task> work)
    {
        await using var scope = Services.CreateAsyncScope();
        await using var db = OpenAs(scope, userId);
        await work(db);
    }

    protected async Task<T> WithDbAsync<T>(Guid userId, Func<AppDbContext, Task<T>> work)
    {
        await using var scope = Services.CreateAsyncScope();
        await using var db = OpenAs(scope, userId);
        return await work(db);
    }

    protected static async Task AssertValidationErrorAsync(HttpResponseMessage response, string field)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var fields = problem.GetProperty("errors").EnumerateArray().Select(e => e.GetProperty("name").GetString()).ToList();
        Assert.Contains(field, fields);
    }

    protected static async Task AssertRejectedAsync(HttpResponseMessage response, string reason)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(reason, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    protected static async Task AssertProblemAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.True(response.StatusCode == status, $"Expected {(int)status}, got {(int)response.StatusCode}: {body}");
        Assert.Contains($"\"{code}\"", body);
    }

    private async Task SaveSettingsAsync(JsonObject settings)
    {
        var response = await Client.PutAsJsonAsync("/api/settings", settings, TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    private static AppDbContext OpenAs(AsyncServiceScope scope, Guid userId) => new(
        scope.ServiceProvider.GetRequiredService<DbContextOptions<AppDbContext>>(),
        new TestCurrentUser(userId),
        scope.ServiceProvider.GetRequiredService<IClock>());

    private sealed class SettingsOverride(Func<Task> restore) : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => new(restore());
    }
}

public sealed record TestUser(Guid Id, string Email, string Password);

public sealed record TestCurrentUser(Guid Id) : ICurrentUser;

public sealed record HouseholdPair(
    TestUser Owner,
    TestUser Partner,
    HttpClient OwnerClient,
    HttpClient PartnerClient,
    Guid HouseholdId) : IDisposable
{
    public void Dispose()
    {
        OwnerClient.Dispose();
        PartnerClient.Dispose();
    }
}
