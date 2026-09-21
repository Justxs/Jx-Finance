using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class InvestmentTaxSummaryTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_buy_and_a_later_sell_report_the_gain_and_the_lot_it_consumed()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-02-10", quantity = "10", price = "100", fee = "5" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-06-15", quantity = "10", price = "120", fee = "5" });

        var summary = await SummaryAsync(member, "year=2026");

        Assert.Equal(2026, summary.Year);
        Assert.Equal("eur", summary.ReportingCurrency);
        Assert.True(summary.IsComplete);
        Assert.Equal([2026], summary.AvailableYears);
        var disposal = Assert.Single(summary.Disposals);
        Assert.Equal(new DateOnly(2026, 6, 15), disposal.Date);
        Assert.Equal(account, disposal.AccountId);
        Assert.Equal("10", disposal.Quantity);
        Assert.Equal("eur", disposal.Currency);
        Assert.Equal(("1195.00", "1005.00", "190.00"), (disposal.Proceeds, disposal.CostBasis, disposal.Gain));
        Assert.Equal(
            ("1195.00", "1005.00", "190.00"),
            (disposal.ReportingProceeds, disposal.ReportingCostBasis, disposal.ReportingGain));
        var lot = Assert.Single(disposal.Lots);
        Assert.Equal(new LotDto(new DateOnly(2026, 2, 10), "10", "1005.00", "1005.00"), lot);
        Assert.Equal("190.00", summary.Totals.RealizedGain);
        Assert.Equal(("190.00", "0.00"), (summary.Totals.Gains, summary.Totals.Losses));
        Assert.Equal(("1195.00", "1005.00"), (summary.Totals.Proceeds, summary.Totals.CostBasis));
    }

    [Fact]
    public async Task A_sale_that_consumes_several_lots_lists_each_lot_with_its_acquisition_date()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2025-01-10", quantity = "4", price = "100" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2025-02-10", quantity = "6", price = "150" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-03-10", quantity = "8", price = "200" });

        var summary = await SummaryAsync(member, "year=2026");

        var disposal = Assert.Single(summary.Disposals);
        Assert.Equal(("1600.00", "1000.00", "600.00"), (disposal.Proceeds, disposal.CostBasis, disposal.Gain));
        Assert.Equal(
            [
                new LotDto(new DateOnly(2025, 1, 10), "4", "400.00", "400.00"),
                new LotDto(new DateOnly(2025, 2, 10), "4", "600.00", "600.00"),
            ],
            disposal.Lots);
        Assert.Empty((await SummaryAsync(member, "year=2025")).Disposals);
    }

    [Fact]
    public async Task A_split_before_a_sale_keeps_the_acquisition_date_and_spreads_the_cost()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-01-10", quantity = "10", price = "100" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "split", date = "2026-02-01", quantity = "2" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-03-10", quantity = "10", price = "70" });

        var summary = await SummaryAsync(member, "year=2026");

        var disposal = Assert.Single(summary.Disposals);
        Assert.Equal(("700.00", "500.00", "200.00"), (disposal.Proceeds, disposal.CostBasis, disposal.Gain));
        Assert.Equal(new LotDto(new DateOnly(2026, 1, 10), "10", "500.00", "500.00"), Assert.Single(disposal.Lots));
    }

    [Fact]
    public async Task A_cross_currency_dividend_withholding_tax_interest_and_fee_are_shown_in_both_currencies()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var stock = (await PostAsync<IdDto>(
            member,
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "Dollar stock", type = "stock", currency = "usd" })).Id;
        await RecordInvestmentAsync(member, new { accountId = account, securityId = stock, type = "dividend", date = "2026-04-02", amount = "110", description = "Quarterly dividend" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = stock, type = "withholdingTax", date = "2026-04-02", amount = "16.50" });
        await RecordInvestmentAsync(member, new { accountId = account, type = "interest", date = "2026-05-02", amount = "22", currency = "eur" });
        await RecordInvestmentAsync(member, new { accountId = account, type = "fee", date = "2026-06-02", amount = "11", currency = "usd", description = "Market data" });

        var summary = await SummaryAsync(member, "year=2026");

        Assert.Empty(summary.Disposals);
        Assert.Equal(
            [
                new CashDto(new DateOnly(2026, 4, 2), "dividend", "usd", "110.00", "100.00", "Quarterly dividend"),
                new CashDto(new DateOnly(2026, 4, 2), "withholdingTax", "usd", "16.50", "15.00", null),
                new CashDto(new DateOnly(2026, 5, 2), "interest", "eur", "22.00", "22.00", null),
                new CashDto(new DateOnly(2026, 6, 2), "fee", "usd", "11.00", "10.00", "Market data"),
            ],
            summary.CashEntries.Select(e => new CashDto(e.Date, e.Type, e.Currency, e.Amount, e.ReportingAmount, e.Description)));
        Assert.Equal(("100.00", "22.00", "15.00", "10.00"),
            (summary.Totals.Dividends, summary.Totals.Interest, summary.Totals.WithholdingTax, summary.Totals.Fees));
    }

    [Fact]
    public async Task A_year_with_nothing_recorded_answers_an_empty_summary()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-02-10", quantity = "1", price = "100" });

        using var newcomer = await CreateUserClientAsync();
        var quiet = await SummaryAsync(member, "year=2019");
        var nothingAtAll = await SummaryAsync(newcomer, string.Empty);

        Assert.Equal(2019, quiet.Year);
        Assert.Empty(quiet.Disposals);
        Assert.Empty(quiet.CashEntries);
        Assert.Empty(quiet.AvailableYears);
        Assert.Equal("0.00", quiet.Totals.RealizedGain);
        Assert.True(quiet.IsComplete);
        Assert.Equal(Today.Year, nothingAtAll.Year);
        Assert.Empty(nothingAtAll.Disposals);
    }

    [Fact]
    public async Task Accounts_can_be_chosen_and_default_to_every_visible_one()
    {
        using var member = await CreateUserClientAsync();
        var kept = await CreateAccountAsync("10000.00", "investment", client: member);
        var other = await CreateAccountAsync("10000.00", "investment", client: member);
        await RecordInvestmentAsync(member, new { accountId = kept, type = "interest", date = "2026-05-02", amount = "10" });
        await RecordInvestmentAsync(member, new { accountId = other, type = "interest", date = "2026-05-02", amount = "25" });

        var everything = await SummaryAsync(member, "year=2026");
        var oneAccount = await SummaryAsync(member, $"year=2026&accountIds={kept}");
        var both = await SummaryAsync(member, $"year=2026&accountIds={kept},{other}");
        var malformed = await member.GetAsync("/api/investments/tax-summary?accountIds=not-an-id");

        Assert.Equal("35.00", everything.Totals.Interest);
        Assert.Equal("10.00", oneAccount.Totals.Interest);
        Assert.Equal(kept, Assert.Single(oneAccount.Accounts).Id);
        Assert.Equal("35.00", both.Totals.Interest);
        Assert.Equal(2, both.Accounts.Count);
        await AssertValidationErrorAsync(malformed, "accountIds");
    }

    [Fact]
    public async Task Entries_on_accounts_the_caller_cannot_see_are_left_out()
    {
        using var owner = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: owner);
        await RecordInvestmentAsync(owner, new { accountId = account, type = "interest", date = "2026-05-02", amount = "40" });

        var mine = await SummaryAsync(owner, "year=2026");
        var theirs = await SummaryAsync(stranger, "year=2026");
        var byId = await SummaryAsync(stranger, $"year=2026&accountIds={account}");

        Assert.Equal("40.00", mine.Totals.Interest);
        Assert.Empty(theirs.CashEntries);
        Assert.Empty(byId.CashEntries);
        Assert.Empty(byId.Accounts);
    }

    [Fact]
    public async Task The_csv_carries_the_disposal_its_lots_and_the_cash_entries()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member, symbol: "TAXCSV", name: "Tax, CSV fund");
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-01-10", quantity = "4", price = "100" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-02-10", quantity = "6", price = "150" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-03-10", quantity = "8", price = "200" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "dividend", date = "2026-04-02", amount = "30", description = "=cmd" });

        using var response = await member.GetAsync(
            $"/api/investments/tax-summary/export?year=2026&accountIds={account}",
            HttpCompletionOption.ResponseHeadersRead);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("investment-tax-summary-2026.csv", response.Content.Headers.ContentDisposition?.FileName);
        Assert.Null(response.Content.Headers.ContentLength);
        var lines = (await response.Content.ReadAsStringAsync())
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        Assert.Equal(
            "Section,Date,Account,Security,Currency,Quantity,Amount,CostBasis,Gain,"
            + "ReportingCurrency,ReportingAmount,ReportingCostBasis,ReportingGain,AcquiredOn,Description",
            lines[0]);
        Assert.Equal(5, lines.Length);
        Assert.EndsWith(
            ",TAXCSV,EUR,8,1600.00,1000.00,600.00,EUR,1600.00,1000.00,600.00,,\"Tax, CSV fund\"",
            lines[1]);
        Assert.StartsWith("Disposal,2026-03-10,", lines[1]);
        Assert.EndsWith(",TAXCSV,EUR,4,,400.00,,EUR,,400.00,,2026-01-10,", lines[2]);
        Assert.StartsWith("Lot,2026-03-10,", lines[2]);
        Assert.EndsWith(",TAXCSV,EUR,4,,600.00,,EUR,,600.00,,2026-02-10,", lines[3]);
        Assert.EndsWith(",TAXCSV,EUR,,30.00,,,EUR,30.00,,,,'=cmd", lines[4]);
        Assert.StartsWith("Dividend,2026-04-02,", lines[4]);
    }

    private static async Task<SummaryDto> SummaryAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<SummaryDto>($"/api/investments/tax-summary?{query}"))!;

    private sealed record LotDto(DateOnly AcquiredOn, string Quantity, string Cost, string ReportingCost);

    private sealed record CashDto(
        DateOnly Date,
        string Type,
        string Currency,
        string Amount,
        string ReportingAmount,
        string? Description);

    private sealed record DisposalDto(
        DateOnly Date,
        Guid AccountId,
        string Symbol,
        string Currency,
        string Quantity,
        string Proceeds,
        string CostBasis,
        string Gain,
        string ReportingProceeds,
        string ReportingCostBasis,
        string ReportingGain,
        List<LotDto> Lots);

    private sealed record CashEntryDto(
        DateOnly Date,
        Guid AccountId,
        string Type,
        string? Symbol,
        string? Description,
        string Currency,
        string Amount,
        string ReportingAmount);

    private sealed record TotalsDto(
        string Proceeds,
        string CostBasis,
        string Gains,
        string Losses,
        string RealizedGain,
        string Dividends,
        string Interest,
        string WithholdingTax,
        string Fees);

    private sealed record AccountDto(Guid Id, string Name);

    private sealed record SummaryDto(
        int Year,
        string ReportingCurrency,
        List<int> AvailableYears,
        List<AccountDto> Accounts,
        TotalsDto Totals,
        List<DisposalDto> Disposals,
        List<CashEntryDto> CashEntries,
        bool IsComplete);
}
