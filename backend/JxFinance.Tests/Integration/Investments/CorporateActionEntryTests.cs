using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class CorporateActionEntryTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string EntriesUrl = "/api/investments/transactions";

    [Fact]
    public async Task Corporate_actions_name_both_securities_in_one_currency_and_need_their_amounts()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        var other = await CreateSecurityAsync(member);
        var dollars = (await PostAsync<IdDto>(member, "/api/investments/securities", new { symbol = NewSymbol(), name = "Dollar fund", type = "etf", currency = "usd" })).Id;
        await BuyAsync(member, account, fund, "2026-03-02", "10", "100");

        await AssertValidationErrorAsync(await TryAsync(member, new { accountId = account, type = "symbolChange", date = "2026-04-01", securityId = fund, quantity = "10" }), "relatedSecurityId");
        await AssertValidationErrorAsync(await TryAsync(member, new { accountId = account, type = "symbolChange", date = "2026-04-01", securityId = fund, relatedSecurityId = other, quantity = "0" }), "quantity");
        await AssertProblemAsync(
            await TryAsync(member, new { accountId = account, type = "symbolChange", date = "2026-04-01", securityId = fund, relatedSecurityId = fund, quantity = "10" }),
            HttpStatusCode.BadRequest,
            "value.mustDiffer");
        await AssertProblemAsync(
            await TryAsync(member, new { accountId = account, type = "symbolChange", date = "2026-04-01", securityId = fund, relatedSecurityId = dollars, quantity = "10" }),
            HttpStatusCode.BadRequest,
            "holding.currencyDiffers");
        await AssertValidationErrorAsync(await TryAsync(member, new { accountId = account, type = "merger", date = "2026-04-01", securityId = fund, quantity = "10" }), "amount");
        await AssertValidationErrorAsync(
            await TryAsync(member, new { accountId = account, type = "merger", date = "2026-04-01", securityId = fund, quantity = "10", relatedSecurityId = other, relatedQuantity = "4", amount = "100" }),
            "costShare");
        await AssertProblemAsync(
            await TryAsync(member, new { accountId = account, type = "spinOff", date = "2026-04-01", securityId = fund, relatedSecurityId = other, relatedQuantity = "2", costShare = "100.5" }),
            HttpStatusCode.BadRequest,
            "range.invalid");
        await AssertValidationErrorAsync(await TryAsync(member, new { accountId = account, type = "spinOff", date = "2026-04-01", securityId = fund, relatedSecurityId = other }), "relatedQuantity");
    }

    [Fact]
    public async Task A_symbol_change_carries_the_holding_and_its_purchase_dates_to_the_new_security()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var old = await CreateSecurityAsync(member);
        var renamed = await CreateSecurityAsync(member);
        await BuyAsync(member, account, old, "2025-03-02", "10", "100");
        await BuyAsync(member, account, old, "2025-05-02", "10", "120");

        var change = await PostAsync<EntryDto>(member, EntriesUrl, new { accountId = account, type = "symbolChange", date = "2026-02-01", securityId = old, relatedSecurityId = renamed, quantity = "15" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = renamed, type = "sell", date = "2026-03-10", quantity = "10", price = "150" });
        var holdings = await HoldingsAsync(member, account);
        var disposal = Assert.Single((await TaxSummaryAsync(member)).Disposals);

        Assert.Equal(("symbolChange", renamed, "15", "0.00"), (change.Type, change.RelatedSecurityId, change.Quantity, change.CashAmount));
        Assert.Equal(("5", "600.00"), holdings[old]);
        Assert.Equal(("5", "600.00"), holdings[renamed]);
        Assert.Equal((new DateOnly(2025, 3, 2), "1000.00"), (Assert.Single(disposal.Lots).AcquiredOn, disposal.CostBasis));
    }

    [Fact]
    public async Task Moving_more_shares_than_are_held_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var old = await CreateSecurityAsync(member);
        var renamed = await CreateSecurityAsync(member);
        await BuyAsync(member, account, old, "2026-03-02", "10", "100");

        await AssertProblemAsync(
            await TryAsync(member, new { accountId = account, type = "symbolChange", date = "2026-04-01", securityId = old, relatedSecurityId = renamed, quantity = "11" }),
            HttpStatusCode.BadRequest,
            "holding.oversold");
    }

    [Fact]
    public async Task A_symbol_change_a_later_sale_depends_on_cannot_be_deleted_and_comes_back_from_the_trash()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var old = await CreateSecurityAsync(member);
        var renamed = await CreateSecurityAsync(member);
        await BuyAsync(member, account, old, "2026-03-02", "10", "100");
        var change = await PostAsync<EntryDto>(member, EntriesUrl, new { accountId = account, type = "symbolChange", date = "2026-04-01", securityId = old, relatedSecurityId = renamed, quantity = "10" });
        var sale = await RecordInvestmentAsync(member, new { accountId = account, securityId = renamed, type = "sell", date = "2026-05-01", quantity = "4", price = "150" });

        await AssertProblemAsync(await member.DeleteAsync($"{EntriesUrl}/{change.Id}", TestContext.Current.CancellationToken), HttpStatusCode.BadRequest, "holding.dependentSales");
        (await member.DeleteAsync($"{EntriesUrl}/{sale}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync($"{EntriesUrl}/{change.Id}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(("10", "1000.00"), (await HoldingsAsync(member, account))[old]);

        Assert.Equal(HttpStatusCode.NoContent, (await RestoreAsync(member, change.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await RestoreAsync(member, sale)).StatusCode);
        Assert.Equal(("6", "600.00"), (await HoldingsAsync(member, account))[renamed]);
    }

    [Fact]
    public async Task A_cash_merger_is_a_disposal_in_the_tax_summary_and_its_csv()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var target = await CreateSecurityAsync(member);
        await BuyAsync(member, account, target, "2025-03-02", "10", "100");

        var merger = await PostAsync<EntryDto>(member, EntriesUrl, new { accountId = account, type = "merger", date = "2026-02-01", securityId = target, quantity = "10", amount = "1500" });
        var summary = await TaxSummaryAsync(member);
        var csv = await member.GetStringAsync($"/api/investments/tax-summary/export?year=2026&accountIds={account}", TestContext.Current.CancellationToken);

        Assert.Equal(("merger", "1500.00"), (merger.Type, merger.CashAmount));
        var disposal = Assert.Single(summary.Disposals);
        Assert.Equal(("merger", "10", "1500.00", "1000.00", "500.00"), (disposal.Type, disposal.Quantity, disposal.Proceeds, disposal.CostBasis, disposal.Gain));
        Assert.Equal(new DateOnly(2025, 3, 2), Assert.Single(disposal.Lots).AcquiredOn);
        Assert.Contains(csv.Split('\n'), line => line.StartsWith("Merger,2026-02-01,", StringComparison.Ordinal) && line.Contains(",1500.00,1000.00,500.00,", StringComparison.Ordinal));
        Assert.Equal(("0", "0.00"), (await HoldingsAsync(member, account))[target]);
        Assert.Equal("10500.00", await CurrentBalanceAsync(account, member));
    }

    [Fact]
    public async Task A_mixed_merger_carries_its_cost_share_and_a_spin_off_carves_one_out_and_can_be_corrected()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var target = await CreateSecurityAsync(member);
        var acquirer = await CreateSecurityAsync(member);
        var parent = await CreateSecurityAsync(member);
        var child = await CreateSecurityAsync(member);
        await BuyAsync(member, account, target, "2026-01-05", "10", "100");
        await BuyAsync(member, account, parent, "2026-01-06", "10", "50");

        await PostAsync<EntryDto>(member, EntriesUrl, new { accountId = account, type = "merger", date = "2026-02-01", securityId = target, quantity = "10", relatedSecurityId = acquirer, relatedQuantity = "4", amount = "300", costShare = "80" });
        var spinOff = await PostAsync<EntryDto>(member, EntriesUrl, new { accountId = account, type = "spinOff", date = "2026-02-02", securityId = parent, relatedSecurityId = child, relatedQuantity = "5" });
        var unset = await HoldingsAsync(member, account);
        var corrected = await ReadOkAsync<EntryDto>(await member.PutAsJsonAsync(
            $"{EntriesUrl}/{spinOff.Id}",
            new { accountId = account, type = "spinOff", date = "2026-02-02", securityId = parent, relatedSecurityId = child, relatedQuantity = "5", costShare = "20" },
            TestContext.Current.CancellationToken));
        var set = await HoldingsAsync(member, account);
        var disposal = Assert.Single((await TaxSummaryAsync(member)).Disposals);

        Assert.Equal(("4", "800.00"), unset[acquirer]);
        Assert.Equal(("2", "300.00", "200.00", "100.00"), (disposal.Quantity, disposal.Proceeds, disposal.CostBasis, disposal.Gain));
        Assert.Equal((("10", "500.00"), ("5", "0.00")), (unset[parent], unset[child]));
        Assert.Equal("20", corrected.CostShare);
        Assert.Equal((("10", "400.00"), ("5", "100.00")), (set[parent], set[child]));
    }

    private static Task<HttpResponseMessage> TryAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync(EntriesUrl, body, TestContext.Current.CancellationToken);

    private static Task<Guid> BuyAsync(HttpClient client, Guid account, Guid security, string date, string quantity, string price) =>
        RecordInvestmentAsync(client, new { accountId = account, securityId = security, type = "buy", date, quantity, price });

    private static Task<HttpResponseMessage> RestoreAsync(HttpClient client, Guid entityId) =>
        client.PostAsJsonAsync("/api/trash/restore", new { kind = "investmentTransaction", entityId }, TestContext.Current.CancellationToken);

    private static async Task<Dictionary<Guid, (string Quantity, string CostBasis)>> HoldingsAsync(HttpClient client, Guid account) =>
        (await client.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={account}", TestContext.Current.CancellationToken))!.Holdings
            .ToDictionary(h => h.Security.Id, h => (h.Quantity, h.CostBasis));

    private static async Task<SummaryDto> TaxSummaryAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<SummaryDto>("/api/investments/tax-summary?year=2026", TestContext.Current.CancellationToken))!;

    private sealed record EntryDto(Guid Id, string Type, Guid? RelatedSecurityId, string Quantity, string? CostShare, string CashAmount);

    private sealed record SecurityDto(Guid Id, string Symbol);

    private sealed record HoldingDto(SecurityDto Security, string Quantity, string CostBasis);

    private sealed record PortfolioDto(List<HoldingDto> Holdings);

    private sealed record LotDto(DateOnly AcquiredOn, string Quantity, string Cost);

    private sealed record DisposalDto(string Type, string Quantity, string Proceeds, string CostBasis, string Gain, List<LotDto> Lots);

    private sealed record SummaryDto(List<DisposalDto> Disposals);
}
