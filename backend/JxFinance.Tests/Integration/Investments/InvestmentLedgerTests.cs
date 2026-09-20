using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class InvestmentLedgerTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Ledger_is_newest_first_and_filters_by_account_security_and_type()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", client: member);
        var other = await CreateAccountAsync("5000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        var buy = await RecordAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-01", quantity = "10", price = "100" });
        var sell = await RecordAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-03", quantity = "4", price = "110" });
        var interest = await RecordAsync(member, new { accountId = account, type = "interest", date = "2026-06-02", amount = "1.50" });
        await RecordAsync(member, new { accountId = other, type = "interest", date = "2026-06-02", amount = "9.99" });

        var all = await ListAsync(member, $"accountId={account}");
        var bySecurity = await ListAsync(member, $"accountId={account}&securityId={fund}");
        var byType = await ListAsync(member, $"accountId={account}&type=interest");
        var firstPage = await ListAsync(member, $"accountId={account}&pageSize=1");

        Assert.Equal([sell, interest, buy], all.Items.Select(t => t.Id));
        Assert.Equal([sell, buy], bySecurity.Items.Select(t => t.Id));
        Assert.Equal([interest], byType.Items.Select(t => t.Id));
        Assert.Equal((3, sell), (firstPage.Total, Assert.Single(firstPage.Items).Id));
    }

    [Fact]
    public async Task Deleting_an_entry_returns_its_cash()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: member);
        var buy = await RecordAsync(member, new { accountId = account, securityId = await CreateSecurityAsync(member), type = "buy", date = "2026-06-01", quantity = "2", price = "100" });
        Assert.Equal("800.00", await CurrentBalanceAsync(account, member));

        var delete = await member.DeleteAsync($"/api/investments/transactions/{buy}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal("1000.00", await CurrentBalanceAsync(account, member));
    }

    [Fact]
    public async Task A_buy_that_later_sales_depend_on_cannot_be_deleted()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        var buy = await RecordAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-01", quantity = "2", price = "100" });
        await RecordAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-02", quantity = "2", price = "100" });

        var delete = await member.DeleteAsync($"/api/investments/transactions/{buy}");

        Assert.Equal(HttpStatusCode.BadRequest, delete.StatusCode);
        Assert.Equal(2, (await ListAsync(member, $"accountId={account}")).Total);
    }

    [Fact]
    public async Task Securities_are_searchable_and_unique_per_symbol_and_currency()
    {
        using var member = await CreateUserClientAsync();
        var symbol = NewSymbol();
        var security = new { symbol, name = "Searchable fund", type = "etf", currency = "eur" };
        var created = await PostAsync<IdDto>(member, "/api/investments/securities", security);

        var found = await member.GetFromJsonAsync<List<IdDto>>($"/api/investments/securities?search={symbol.ToLowerInvariant()}");
        var duplicate = await member.PostAsJsonAsync("/api/investments/securities", security);

        Assert.Equal(created.Id, Assert.Single(found!).Id);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
    }

    [Fact]
    public async Task A_security_with_transactions_keeps_its_currency()
    {
        using var member = await CreateUserClientAsync();
        var symbol = NewSymbol();
        var fund = (await PostAsync<IdDto>(member, "/api/investments/securities", new { symbol, name = "Fund", type = "etf", currency = "eur" })).Id;
        await RecordAsync(member, new { accountId = await CreateAccountAsync("1000.00", "investment", client: member), securityId = fund, type = "buy", date = "2026-06-01", quantity = "1", price = "100" });

        var response = await Client.PutAsJsonAsync($"/api/investments/securities/{fund}", new { symbol, name = "Fund", type = "etf", currency = "usd" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task A_removed_connection_is_no_longer_listed()
    {
        using var member = await CreateUserClientAsync();
        var broker = await CreateAccountAsync(type: "investment", client: member);
        (await member.PutAsJsonAsync(
            $"/api/investments/connections/{broker}",
            new { queryId = SampleFlexReport.QueryId, token = SampleFlexReport.Token })).EnsureSuccessStatusCode();

        var delete = await member.DeleteAsync($"/api/investments/connections/{broker}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        var connections = await member.GetFromJsonAsync<List<ConnectionDto>>("/api/investments/connections");
        Assert.DoesNotContain(connections!, c => c.AccountId == broker);
    }

    private static string NewSymbol() => $"T{Guid.NewGuid():N}"[..10].ToUpperInvariant();

    private static async Task<Guid> CreateSecurityAsync(HttpClient member) =>
        (await PostAsync<IdDto>(
            member,
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "Test fund", type = "etf", currency = "eur" })).Id;

    private static async Task<Guid> RecordAsync(HttpClient member, object entry) =>
        (await PostAsync<IdDto>(member, "/api/investments/transactions", entry)).Id;

    private static async Task<PageDto> ListAsync(HttpClient member, string query) =>
        (await member.GetFromJsonAsync<PageDto>($"/api/investments/transactions?{query}"))!;

    private sealed record PageDto(List<IdDto> Items, int Total);

    private sealed record ConnectionDto(Guid AccountId);
}
