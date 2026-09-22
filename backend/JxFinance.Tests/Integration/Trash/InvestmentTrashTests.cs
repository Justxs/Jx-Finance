using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Trash;

[Collection<IntegrationCollection>]
public sealed class InvestmentTrashTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Kind = "investmentTransaction";

    [Fact]
    public async Task Every_entry_type_is_listed_with_a_description_and_comes_back()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", client: member);
        var symbol = NewSymbol();
        var fund = await CreateSecurityAsync(member, symbol);
        var buy = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-01", quantity = "10", price = "100", fee = "1.00" });
        var split = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "split", date = "2026-06-02", quantity = "2" });
        var sell = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-03", quantity = "4", price = "60" });
        var dividend = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "dividend", date = "2026-06-04", amount = "12.50" });
        var tax = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "withholdingTax", date = "2026-06-04", amount = "1.88" });
        var interest = await RecordInvestmentAsync(member, new { accountId = account, type = "interest", date = "2026-06-05", amount = "1.50" });
        var fee = await RecordInvestmentAsync(member, new { accountId = account, type = "fee", date = "2026-06-06", amount = "3.00" });
        var balance = await CurrentBalanceAsync(account, member);

        Guid[] deleteOrder = [sell, dividend, tax, interest, fee, split, buy];
        foreach (var id in deleteOrder)
        {
            var delete = await member.DeleteAsync($"/api/investments/transactions/{id}", TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        }

        var listed = await TrashAsync(member);
        var emptied = await LedgerAsync(member, account);
        var restores = new List<HttpStatusCode>();
        foreach (var id in deleteOrder.Reverse())
        {
            restores.Add((await RestoreAsync(member, id)).StatusCode);
        }

        Assert.Equal(0, emptied.Total);
        Assert.Equal(7, listed.Total);
        Assert.All(listed.Items, row => Assert.Equal(Kind, row.Kind));
        Assert.Equal(
            new Dictionary<Guid, string>
            {
                [buy] = $"Buy 10 {symbol}, 2026-06-01",
                [split] = $"Split {symbol}, ratio 2, 2026-06-02",
                [sell] = $"Sell 4 {symbol}, 2026-06-03",
                [dividend] = $"Dividend {symbol}, 12.50 EUR, 2026-06-04",
                [tax] = $"Withholding tax {symbol}, 1.88 EUR, 2026-06-04",
                [interest] = "Interest, 1.50 EUR, 2026-06-05",
                [fee] = "Fee, 3.00 EUR, 2026-06-06",
            },
            listed.Items.ToDictionary(row => row.EntityId, row => row.Description));
        Assert.All(restores, status => Assert.Equal(HttpStatusCode.NoContent, status));
        Assert.Equal(7, (await LedgerAsync(member, account)).Total);
        Assert.Equal(balance, await CurrentBalanceAsync(account, member));
        Assert.Empty((await TrashAsync(member)).Items);
    }

    [Fact]
    public async Task A_row_of_the_trash_list_restores_the_entry_it_names()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", "investment", client: member);
        var interest = await RecordInvestmentAsync(member, new { accountId = account, type = "interest", date = "2026-06-02", amount = "4.00" });

        await member.DeleteAsync($"/api/investments/transactions/{interest}", TestContext.Current.CancellationToken);
        var row = Assert.Single((await TrashAsync(member)).Items);
        var restore = await RestoreAsync(member, row.EntityId, row.Kind);

        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Equal([interest], (await LedgerAsync(member, account)).Items.Select(t => t.Id));
    }

    [Fact]
    public async Task Restoring_an_entry_twice_is_accepted_and_changes_nothing()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-01", quantity = "5", price = "10" });
        var sell = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-02", quantity = "5", price = "12" });

        await member.DeleteAsync($"/api/investments/transactions/{sell}", TestContext.Current.CancellationToken);
        var first = await RestoreAsync(member, sell);
        var second = await RestoreAsync(member, sell);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        Assert.Equal(2, (await LedgerAsync(member, account)).Total);
        Assert.Equal("1010.00", await CurrentBalanceAsync(account, member));
    }

    [Fact]
    public async Task A_sale_is_refused_when_a_later_sale_now_depends_on_its_shares()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-01", quantity = "10", price = "10" });
        var sell = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-03", quantity = "6", price = "10" });

        await member.DeleteAsync($"/api/investments/transactions/{sell}", TestContext.Current.CancellationToken);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-05", quantity = "6", price = "10" });
        var restore = await RestoreAsync(member, sell);

        await AssertProblemAsync(restore, HttpStatusCode.BadRequest, "holding.dependentSales");
        Assert.Equal(2, (await LedgerAsync(member, account)).Total);
        Assert.Single((await TrashAsync(member)).Items);
    }

    [Fact]
    public async Task A_sale_whose_purchase_went_is_refused_until_the_purchase_is_back()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-01", quantity = "5", price = "10" });
        var second = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-02", quantity = "5", price = "10" });
        var sell = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-04", quantity = "8", price = "11" });

        await member.DeleteAsync($"/api/investments/transactions/{sell}", TestContext.Current.CancellationToken);
        await member.DeleteAsync($"/api/investments/transactions/{second}", TestContext.Current.CancellationToken);
        var refused = await RestoreAsync(member, sell);
        var purchase = await RestoreAsync(member, second);
        var accepted = await RestoreAsync(member, sell);

        await AssertProblemAsync(refused, HttpStatusCode.BadRequest, "holding.oversold");
        Assert.Equal(HttpStatusCode.NoContent, purchase.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, accepted.StatusCode);
        Assert.Equal(3, (await LedgerAsync(member, account)).Total);
    }

    [Fact]
    public async Task A_sale_is_refused_when_the_shares_arrive_only_after_its_date()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        var buy = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-01", quantity = "5", price = "10" });
        var sell = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-03", quantity = "5", price = "10" });

        await member.DeleteAsync($"/api/investments/transactions/{sell}", TestContext.Current.CancellationToken);
        var moved = await member.PutAsJsonAsync(
            $"/api/investments/transactions/{buy}",
            new { accountId = account, securityId = fund, type = "buy", date = "2026-06-10", quantity = "5", price = "10" }, TestContext.Current.CancellationToken);
        var restore = await RestoreAsync(member, sell);

        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);
        await AssertProblemAsync(restore, HttpStatusCode.BadRequest, "holding.oversold");
    }

    [Fact]
    public async Task A_reverse_split_is_refused_when_later_sales_need_the_shares_it_would_remove()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-01", quantity = "10", price = "10" });
        var split = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "split", date = "2026-06-02", quantity = "0.5" });

        await member.DeleteAsync($"/api/investments/transactions/{split}", TestContext.Current.CancellationToken);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-04", quantity = "8", price = "10" });
        var restore = await RestoreAsync(member, split);

        await AssertProblemAsync(restore, HttpStatusCode.BadRequest, "holding.dependentSales");
    }

    [Fact]
    public async Task An_entry_whose_account_was_archived_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", "investment", client: member);
        var interest = await RecordInvestmentAsync(member, new { accountId = account, type = "interest", date = "2026-06-02", amount = "2.00" });

        await member.DeleteAsync($"/api/investments/transactions/{interest}", TestContext.Current.CancellationToken);
        await member.DeleteAsync($"/api/accounts/{account}", TestContext.Current.CancellationToken);
        var restore = await RestoreAsync(member, interest);

        await AssertProblemAsync(restore, HttpStatusCode.BadRequest, "restore.referenceMissing");
    }

    [Fact]
    public async Task A_trade_whose_security_changed_currency_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: member);
        var symbol = NewSymbol();
        var fund = await CreateSecurityAsync(member, symbol);
        var buy = await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-01", quantity = "1", price = "10" });

        await member.DeleteAsync($"/api/investments/transactions/{buy}", TestContext.Current.CancellationToken);
        var changed = await Client.PutAsJsonAsync(
            $"/api/investments/securities/{fund}",
            new { symbol, name = "Test fund", type = "etf", currency = "usd" }, TestContext.Current.CancellationToken);
        var restore = await RestoreAsync(member, buy);

        Assert.Equal(HttpStatusCode.OK, changed.StatusCode);
        await AssertProblemAsync(restore, HttpStatusCode.BadRequest, "restore.securityChanged");
    }

    [Fact]
    public async Task A_deleted_imported_entry_is_not_imported_again_and_comes_back_once()
    {
        var broker = await CreateAccountAsync("0.00", "investment", "eur");
        await UploadAsync(broker);
        var imported = await LedgerAsync(Client, broker);
        var dividend = imported.Items.First(t => t.Type == "dividend").Id;

        await Client.DeleteAsync($"/api/investments/transactions/{dividend}", TestContext.Current.CancellationToken);
        await UploadAsync(broker);
        var afterReimport = await LedgerAsync(Client, broker);
        var restore = await RestoreAsync(Client, dividend);
        var restored = await LedgerAsync(Client, broker);

        Assert.Equal(imported.Total - 1, afterReimport.Total);
        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Equal(imported.Total, restored.Total);
        Assert.Contains(restored.Items, t => t.Id == dividend);
    }

    [Fact]
    public async Task Investment_entries_leave_the_trash_while_investments_are_switched_off()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", "investment", client: member);
        var interest = await RecordInvestmentAsync(member, new { accountId = account, type = "interest", date = "2026-06-02", amount = "1.00" });
        await member.DeleteAsync($"/api/investments/transactions/{interest}", TestContext.Current.CancellationToken);

        var settings = (await Client.GetFromJsonAsync<JsonNode>("/api/settings", TestContext.Current.CancellationToken))!;
        try
        {
            await SwitchInvestmentsAsync(settings, false);

            var listed = await TrashAsync(member);
            var restore = await RestoreAsync(member, interest);

            Assert.DoesNotContain(listed.Items, row => row.EntityId == interest);
            await AssertProblemAsync(restore, HttpStatusCode.NotFound, "feature.disabled");
        }
        finally
        {
            await SwitchInvestmentsAsync(settings, true);
        }

        Assert.Contains((await TrashAsync(member)).Items, row => row.EntityId == interest);
    }

    private async Task SwitchInvestmentsAsync(JsonNode settings, bool enabled)
    {
        settings["features"]!["investments"] = enabled;
        var response = await Client.PutAsJsonAsync("/api/settings", settings);
        response.EnsureSuccessStatusCode();
    }

    private async Task UploadAsync(Guid accountId)
    {
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(SampleFlexReport.Xml));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/xml");
        var form = new MultipartFormDataContent
        {
            { file, "file", "flex.xml" },
            { new StringContent(accountId.ToString()), "accountId" },
        };

        var response = await Client.PostAsync("/api/investments/import/interactive-brokers", form);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static Task<HttpResponseMessage> RestoreAsync(HttpClient client, Guid entityId, string kind = Kind) =>
        client.PostAsJsonAsync("/api/trash/restore", new { kind, entityId });

    private static async Task<PageDto<TrashRow>> TrashAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<PageDto<TrashRow>>("/api/trash"))!;

    private static async Task<PageDto<EntryRow>> LedgerAsync(HttpClient client, Guid accountId) =>
        (await client.GetFromJsonAsync<PageDto<EntryRow>>($"/api/investments/transactions?accountId={accountId}&pageSize=100"))!;

    private sealed record TrashRow(Guid Id, string Kind, Guid EntityId, string Description, DateTimeOffset DeletedAt);

    private sealed record EntryRow(Guid Id, string Type);
}
