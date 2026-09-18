using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using JxFinance.Tests.Support;
using FastEndpoints.Testing;

namespace JxFinance.Tests.Integration;

[Collection<IntegrationCollection>]
public sealed class ReleaseRegressionTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private static async Task<JsonObject> Post(HttpClient client, string url, object data)
    {
        var response = await client.PostAsJsonAsync(url, data);
        Assert.True(response.IsSuccessStatusCode, $"{url}: {response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<JsonObject>())!;
    }

    private Task<JsonObject> Account(HttpClient? client = null) => Post(client ?? Client, "/api/accounts",
        new { name = $"Regression {Guid.NewGuid():N}", type = "checking", startingBalance = "100.00" });

    private static string Id(JsonObject value) => value["id"]!.GetValue<string>();
    private static object Row(string reference, string amount = "10.00") => new
    { importRef = reference, amount, date = "2026-09-01", type = "expense" };

    [Fact]
    public async Task Duplicate_rows_and_concurrent_retries_import_once()
    {
        var account = await Account();
        var payload = new { accountId = Id(account), rows = new[] { Row("duplicate"), Row("duplicate") } };
        var results = await Task.WhenAll(Post(Client, "/api/import/swedbank/confirm", payload), Post(Client, "/api/import/swedbank/confirm", payload));
        Assert.Equal(1, results.Sum(r => r["imported"]!.GetValue<int>()));
        var balance = await Client.GetFromJsonAsync<JsonObject>($"/api/accounts/{Id(account)}");
        Assert.Equal("90.00", balance!["currentBalance"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("-5.00")]
    [InlineData("0.00")]
    [InlineData("abc")]
    [InlineData("1,20")]
    [InlineData("10000000000000000.00")]
    public async Task Import_rejects_invalid_money_without_writing(string amount)
    {
        var account = await Account();
        var response = await Client.PostAsJsonAsync("/api/import/swedbank/confirm", new { accountId = Id(account), rows = new[] { Row("invalid", amount) } });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var balance = await Client.GetFromJsonAsync<JsonObject>($"/api/accounts/{Id(account)}");
        Assert.Equal("100.00", balance!["currentBalance"]!.GetValue<string>());
    }

    [Fact]
    public async Task Deleted_import_stays_deduplicated()
    {
        var account = await Account();
        var payload = new { accountId = Id(account), rows = new[] { Row("deleted") } };
        await Post(Client, "/api/import/swedbank/confirm", payload);
        var list = await Client.GetFromJsonAsync<JsonObject>($"/api/transactions?accountId={Id(account)}");
        var id = list!["items"]![0]!["id"]!.GetValue<string>();
        (await Client.DeleteAsync($"/api/transactions/{id}")).EnsureSuccessStatusCode();
        var retry = await Post(Client, "/api/import/swedbank/confirm", payload);
        Assert.Equal(0, retry["imported"]!.GetValue<int>());
        Assert.Equal(1, retry["skippedDuplicates"]!.GetValue<int>());
    }

    [Fact]
    public async Task Two_bank_entries_can_match_one_transfer_without_changing_total_balance()
    {
        var source = await Account();
        var destination = await Account();
        await Post(Client, "/api/import/swedbank/confirm", new { accountId = Id(source), rows = new[] {
            new { importRef = "outgoing", amount = "10.00", date = "2026-09-01", type = "expense", transferAccountId = Id(destination) } } });
        var transfers = await Client.GetFromJsonAsync<JsonObject>("/api/transfers?pageSize=200");
        var transfer = transfers!["items"]!.AsArray().Single(t => t!["fromAccountId"]!.GetValue<string>() == Id(source));
        await Post(Client, "/api/import/swedbank/confirm", new { accountId = Id(destination), rows = new[] {
            new { importRef = "incoming", amount = "10.00", date = "2026-09-01", type = "income", transferAccountId = Id(source), existingTransferId = transfer!["id"]!.GetValue<string>() } } });
        var a = await Client.GetFromJsonAsync<JsonObject>($"/api/accounts/{Id(source)}");
        var b = await Client.GetFromJsonAsync<JsonObject>($"/api/accounts/{Id(destination)}");
        Assert.Equal("90.00", a!["currentBalance"]!.GetValue<string>());
        Assert.Equal("110.00", b!["currentBalance"]!.GetValue<string>());
        var transactions = await Client.GetFromJsonAsync<JsonObject>($"/api/transactions?accountId={Id(source)}");
        Assert.Equal(0, transactions!["total"]!.GetValue<int>());
    }

    [Fact]
    public async Task Concurrent_bill_confirmation_posts_one_occurrence()
    {
        var account = await Account();
        var bill = await Post(Client, "/api/recurring-bills", new { name = "Once", kind = "fixed", amount = "10.00", cadence = "monthly", nextDueDate = "2026-09-01", accountId = Id(account) });
        var path = $"/api/recurring-bills/{Id(bill)}/confirm";
        var responses = await Task.WhenAll(Client.PostAsJsonAsync(path, new { expectedDueDate = "2026-09-01" }), Client.PostAsJsonAsync(path, new { expectedDueDate = "2026-09-01" }));
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Conflict);
        var balance = await Client.GetFromJsonAsync<JsonObject>($"/api/accounts/{Id(account)}");
        Assert.Equal("90.00", balance!["currentBalance"]!.GetValue<string>());
    }

    [Fact]
    public async Task Deactivation_revokes_existing_session_and_new_users_have_categories()
    {
        var email = $"revoke-{Guid.NewGuid():N}@localhost";
        const string password = "Regression-Password-123!";
        var user = await Post(Client, "/api/users", new { email, password, displayName = "Revoke", role = "Member" });
        using var other = CreateClient(new ClientOptions { HandleCookies = true, AllowAutoRedirect = false });
        other.DefaultRequestHeaders.Add("X-Forwarded-For", Guid.NewGuid().ToString());
        await Post(other, "/api/auth/login", new { email, password });
        var categories = await other.GetFromJsonAsync<JsonArray>("/api/categories");
        Assert.Equal(10, categories!.Count);
        (await Client.PostAsync($"/api/users/{Id(user)}/deactivate", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await other.GetAsync("/api/accounts")).StatusCode);
    }

    [Fact]
    public async Task Two_factor_setup_requires_current_password()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/2fa/setup", new { password = "incorrect" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
