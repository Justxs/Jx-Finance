using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FastEndpoints.Testing;
using JxFinance.Domain.Common;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Support;

public abstract class IntegrationTestBase(ApiFixture fixture)
{
    private const string UserPassword = "Test-User-Password-123!";

    protected HttpClient Client => fixture.Api;

    protected IServiceProvider Services => fixture.Services;

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
        var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = user.Email, password = user.Password, rememberMe = false });
        response.EnsureSuccessStatusCode();
        return client;
    }

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

    protected async Task<Guid> CreateCategoryAsync(string type = "expense", HttpClient? client = null)
    {
        var created = await PostAsync<IdDto>(
            client ?? Client,
            "/api/categories",
            new { name = $"Category {Guid.NewGuid():N}", type });
        return created.Id;
    }

    protected async Task<Guid> CreateHouseholdAsync(params TestUser[] members)
    {
        var household = await PostAsync<IdDto>(Client, "/api/households", new { name = $"Household {Guid.NewGuid():N}" });
        foreach (var member in members)
            await PostAsync<IdDto>(Client, $"/api/households/{household.Id}/members", new { email = member.Email, role = "member" });
        return household.Id;
    }

    protected async Task<string> CurrentBalanceAsync(Guid accountId, HttpClient? client = null) =>
        (await (client ?? Client).GetFromJsonAsync<BalanceDto>($"/api/accounts/{accountId}"))!.CurrentBalance;

    protected static async Task<T> PostAsync<T>(HttpClient client, string url, object body)
    {
        var response = await client.PostAsJsonAsync(url, body);
        Assert.True(
            response.IsSuccessStatusCode,
            $"POST {url}: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    protected static async Task AssertValidationErrorAsync(HttpResponseMessage response, string field)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        var fields = problem.GetProperty("errors").EnumerateArray().Select(e => e.GetProperty("name").GetString()).ToList();
        Assert.Contains(field, fields);
    }

    protected static async Task AssertRejectedAsync(HttpResponseMessage response, string reason)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(reason, await response.Content.ReadAsStringAsync());
    }

    protected sealed record IdDto(Guid Id);

    private sealed record BalanceDto(string CurrentBalance);
}

public sealed record TestUser(Guid Id, string Email, string Password);
