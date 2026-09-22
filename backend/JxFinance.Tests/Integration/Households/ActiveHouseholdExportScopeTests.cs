using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Households;

[Collection<IntegrationCollection>]
public sealed class ActiveHouseholdExportScopeTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string ScopeHeader = "X-Active-Household";
    private const string ScopeQuery = "activeHousehold";

    [Fact]
    public async Task The_transaction_csv_narrows_exactly_as_the_screen_does()
    {
        var world = await LedgerAsync();

        var csv = await DescriptionsAsync(world.Client, $"?{ScopeQuery}={world.First}");
        var screen = await ScreenAsync(world.Client, world.First);
        var everything = await DescriptionsAsync(world.Client, string.Empty);

        Assert.Equal(screen, csv);
        Assert.Equal(["First one", "First two", "Personal one"], csv);
        Assert.Equal(["First one", "First two", "Personal one", "Second one"], everything);
    }

    [Fact]
    public async Task The_transaction_pdf_narrows_through_the_query_as_it_does_through_the_header()
    {
        var world = await LedgerAsync();
        for (var day = 1; day <= ApiFixture.PdfExportMaxRows; day++)
        {
            await CreateTransactionAsync(world.Client, world.SecondAccount, null, "expense", "1.00", $"2026-07-{day:00}", $"Bulk {day}");
        }

        var everything = await world.Client.GetAsync("/api/transactions/export/pdf", TestContext.Current.CancellationToken);
        var scoped = await world.Client.GetAsync($"/api/transactions/export/pdf?{ScopeQuery}={world.First}", TestContext.Current.CancellationToken);
        var headed = await SendAsync(world.Client, "/api/transactions/export/pdf", world.First);

        await AssertProblemAsync(everything, HttpStatusCode.BadRequest, "export.tooManyRows");
        Assert.Equal(HttpStatusCode.OK, scoped.StatusCode);
        Assert.Equal("application/pdf", scoped.Content.Headers.ContentType?.MediaType);
        Assert.Equal(HttpStatusCode.OK, headed.StatusCode);
    }

    [Fact]
    public async Task The_tax_summary_csv_narrows_exactly_as_the_screen_does()
    {
        var world = await HoldingsAsync();

        var scoped = await SectionsAsync(world.Client, $"&{ScopeQuery}={world.First}");
        var everything = await SectionsAsync(world.Client, string.Empty);
        var screen = await TaxAccountsAsync(world.Client, world.First);

        Assert.Equal(1, scoped.Count(line => line.StartsWith("Disposal,", StringComparison.Ordinal)));
        Assert.Equal(2, everything.Count(line => line.StartsWith("Disposal,", StringComparison.Ordinal)));
        Assert.Contains(scoped, line => line.Contains(world.FirstName, StringComparison.Ordinal));
        Assert.DoesNotContain(scoped, line => line.Contains(world.SecondName, StringComparison.Ordinal));
        Assert.Equal([world.FirstName], screen);
    }

    [Fact]
    public async Task A_household_the_caller_does_not_belong_to_is_ignored_in_the_query()
    {
        var world = await LedgerAsync();
        using var outsider = await CreateUserClientAsync();
        var theirs = (await PostAsync<IdDto>(outsider, "/api/households", new { name = $"Outsiders {Guid.NewGuid():N}" })).Id;

        var csv = await DescriptionsAsync(world.Client, $"?{ScopeQuery}={theirs}");

        Assert.Equal(["First one", "First two", "Personal one", "Second one"], csv);
    }

    [Fact]
    public async Task A_malformed_value_in_the_query_is_ignored()
    {
        var world = await LedgerAsync();

        var csv = await DescriptionsAsync(world.Client, $"?{ScopeQuery}=not-a-guid");
        var empty = await DescriptionsAsync(world.Client, $"?{ScopeQuery}=");
        var zero = await DescriptionsAsync(world.Client, $"?{ScopeQuery}={Guid.Empty}");

        Assert.Equal(["First one", "First two", "Personal one", "Second one"], csv);
        Assert.Equal(csv, empty);
        Assert.Equal(csv, zero);
    }

    [Fact]
    public async Task The_header_and_the_query_together_must_agree()
    {
        var world = await LedgerAsync();

        var agreeing = await SendAsync(world.Client, $"/api/transactions/export?{ScopeQuery}={world.First}", world.First);
        var differing = await SendAsync(world.Client, $"/api/transactions/export?{ScopeQuery}={world.Second}", world.First);
        var bothUnknown = await SendAsync(world.Client, $"/api/transactions/export?{ScopeQuery}=not-a-guid", world.First);

        Assert.Equal(HttpStatusCode.OK, agreeing.StatusCode);
        Assert.Equal(
            ["First one", "First two", "Personal one"],
            Descriptions(await agreeing.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)));
        await AssertProblemAsync(differing, HttpStatusCode.BadRequest, "household.scopeMismatch");
        await AssertProblemAsync(bothUnknown, HttpStatusCode.BadRequest, "household.scopeMismatch");
    }

    [Fact]
    public async Task A_scope_in_the_query_is_read_on_a_download_route_only()
    {
        var world = await LedgerAsync();

        var accounts = await world.Client.GetFromJsonAsync<List<AccountDto>>($"/api/accounts?{ScopeQuery}={world.First}", TestContext.Current.CancellationToken);
        var page = await world.Client.GetFromJsonAsync<PageDto<TransactionDto>>(
            $"/api/transactions?pageSize=200&{ScopeQuery}={world.First}", TestContext.Current.CancellationToken);

        Assert.Contains(accounts!, a => a.Id == world.SecondAccount);
        Assert.Contains(page!.Items, t => t.Description == "Second one");
    }

    private sealed record Ledger(HttpClient Client, Guid First, Guid Second, Guid SecondAccount);

    private sealed record Holdings(HttpClient Client, Guid First, string FirstName, string SecondName);

    private async Task<Ledger> LedgerAsync()
    {
        var client = await CreateUserClientAsync();
        var first = await NewHouseholdAsync(client);
        var second = await NewHouseholdAsync(client);
        var firstAccount = await CreateAccountAsync("100.00", householdId: first, client: client);
        var secondAccount = await CreateAccountAsync("100.00", householdId: second, client: client);
        var personal = await CreateAccountAsync("100.00", client: client);

        await CreateTransactionAsync(client, firstAccount, null, "expense", "5.00", "2026-06-01", "First one");
        await CreateTransactionAsync(client, firstAccount, null, "expense", "6.00", "2026-06-02", "First two");
        await CreateTransactionAsync(client, secondAccount, null, "expense", "7.00", "2026-06-03", "Second one");
        await CreateTransactionAsync(client, personal, null, "expense", "8.00", "2026-06-04", "Personal one");

        return new Ledger(client, first, second, secondAccount);
    }

    private async Task<Holdings> HoldingsAsync()
    {
        var client = await CreateUserClientAsync();
        var first = await NewHouseholdAsync(client);
        var second = await NewHouseholdAsync(client);
        var firstAccount = await CreateAccountAsync("10000.00", "investment", householdId: first, client: client);
        var secondAccount = await CreateAccountAsync("10000.00", "investment", householdId: second, client: client);
        var fund = await CreateSecurityAsync(client);

        foreach (var account in new[] { firstAccount, secondAccount })
        {
            await RecordInvestmentAsync(client, new { accountId = account, securityId = fund, type = "buy", date = "2026-02-10", quantity = "10", price = "100" });
            await RecordInvestmentAsync(client, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-15", quantity = "10", price = "120" });
        }

        return new Holdings(client, first, await AccountNameAsync(client, firstAccount), await AccountNameAsync(client, secondAccount));
    }

    private static async Task<string> AccountNameAsync(HttpClient client, Guid accountId) =>
        (await client.GetFromJsonAsync<AccountDto>($"/api/accounts/{accountId}"))!.Name;

    private static async Task<Guid> NewHouseholdAsync(HttpClient client) =>
        (await PostAsync<IdDto>(client, "/api/households", new { name = $"House {Guid.NewGuid():N}" })).Id;

    private static Task<HttpResponseMessage> SendAsync(HttpClient client, string url, Guid? household)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (household is not null)
        {
            request.Headers.Add(ScopeHeader, household.Value.ToString());
        }

        return client.SendAsync(request);
    }

    private static async Task<List<string>> DescriptionsAsync(HttpClient client, string query) =>
        Descriptions(await client.GetStringAsync($"/api/transactions/export{query}"));

    private static List<string> Descriptions(string csv) =>
        [.. Lines(csv).Skip(1).Select(line => line.Split(',')[1]).Order(StringComparer.Ordinal)];

    private static async Task<List<string>> SectionsAsync(HttpClient client, string query) =>
        Lines(await client.GetStringAsync($"/api/investments/tax-summary/export?year=2026{query}")).Skip(1).ToList();

    private static string[] Lines(string csv) =>
        csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static async Task<List<string>> ScreenAsync(HttpClient client, Guid household)
    {
        using var response = await SendAsync(client, "/api/transactions?pageSize=200", household);
        response.EnsureSuccessStatusCode();
        var page = (await response.Content.ReadFromJsonAsync<PageDto<TransactionDto>>())!;
        return [.. page.Items.Select(t => t.Description ?? string.Empty).Order(StringComparer.Ordinal)];
    }

    private static async Task<List<string>> TaxAccountsAsync(HttpClient client, Guid household)
    {
        using var response = await SendAsync(client, "/api/investments/tax-summary?year=2026", household);
        response.EnsureSuccessStatusCode();
        var summary = (await response.Content.ReadFromJsonAsync<TaxSummaryAccountsDto>())!;
        return [.. summary.Accounts.Select(a => a.Name).Order(StringComparer.Ordinal)];
    }

    private sealed record TaxSummaryAccountsDto(List<TaxAccountDto> Accounts);

    private sealed record TaxAccountDto(Guid Id, string Name);
}
