using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class CorporateActionImportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Splits_are_booked_once_other_actions_are_reported_and_holdings_reconcile()
    {
        var report = NewReport();
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");

        var first = await UploadAsync(broker, report.Xml);

        Assert.Equal((6, 3, 0, 3, 4), (first.Trades, first.Splits, first.Duplicates, first.Skipped, first.SecuritiesCreated));
        Assert.Equal([new SkippedDto("SD", 1), new SkippedDto("TC", 1)], first.SkippedCorporateActions);
        Assert.Equal([new MismatchDto(report.Merged, "0", "10")], first.PositionMismatches);

        var holdings = (await Client.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={broker}"))!.Holdings
            .ToDictionary(h => h.Security.Symbol, h => (h.Quantity, h.CostBasis));
        Assert.Equal(("25", "1250.00"), holdings[report.Forward]);
        Assert.Equal(("6", "60.00"), holdings[report.Reverse]);
        Assert.Equal(("15", "300.00"), holdings[report.Fractional]);
        Assert.Equal(("10", "200.00"), holdings[report.Merged]);

        var splits = (await Client.GetFromJsonAsync<PageDto<EntryDto>>($"/api/investments/transactions?accountId={broker}&type=split&pageSize=50"))!.Items;
        Assert.Equal(
            [(report.Forward, "2", new DateOnly(2026, 6, 10)), (report.Reverse, "0.1", new DateOnly(2026, 6, 15)), (report.Fractional, "1.5", new DateOnly(2026, 6, 16))],
            splits.OrderBy(s => s.Date).Select(s => (s.Symbol, s.Quantity, s.Date)));
        Assert.All(splits, s => Assert.Equal(("interactiveBrokers", "0.00"), (s.Source, s.CashAmount)));
        Assert.Equal("8198.00", await CurrentBalanceAsync(broker));

        var second = await UploadAsync(broker, report.Xml);

        Assert.Equal((0, 0, 9, 3), (second.Trades, second.Splits, second.Duplicates, second.Skipped));
        Assert.Equal([new MismatchDto(report.Merged, "0", "10")], second.PositionMismatches);
    }

    [Fact]
    public async Task A_deleted_split_stays_deleted_and_the_difference_is_reported()
    {
        var report = NewReport();
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");
        await UploadAsync(broker, report.Xml);
        var splits = (await Client.GetFromJsonAsync<PageDto<EntryDto>>($"/api/investments/transactions?accountId={broker}&type=split&pageSize=50"))!.Items;
        var fractional = splits.Single(s => s.Symbol == report.Fractional);

        Assert.Equal(HttpStatusCode.NoContent, (await Client.DeleteAsync($"/api/investments/transactions/{fractional.Id}")).StatusCode);
        var again = await UploadAsync(broker, report.Xml);

        Assert.Equal((0, 9), (again.Splits, again.Duplicates));
        Assert.Equal(
            [new MismatchDto(report.Fractional, "15", "10"), new MismatchDto(report.Merged, "0", "10")],
            again.PositionMismatches);
    }

    [Fact]
    public async Task An_imported_split_is_read_only()
    {
        var report = NewReport();
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");
        await UploadAsync(broker, report.Xml);
        var split = (await Client.GetFromJsonAsync<PageDto<EntryDto>>($"/api/investments/transactions?accountId={broker}&type=split&pageSize=50"))!.Items[0];

        var response = await Client.PutAsJsonAsync(
            $"/api/investments/transactions/{split.Id}",
            new { accountId = broker, securityId = split.SecurityId, type = "split", date = "2026-06-10", quantity = "3" });

        await AssertRejectedAsync(response, "resource.readOnly");
    }

    [Fact]
    public async Task A_report_without_open_positions_reports_no_comparison()
    {
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");
        var xml = NewReport().Xml;
        var start = xml.IndexOf("<OpenPositions>", StringComparison.Ordinal);
        var end = xml.IndexOf("</OpenPositions>", StringComparison.Ordinal) + "</OpenPositions>".Length;

        var result = await UploadAsync(broker, xml.Remove(start, end - start));

        Assert.Equal(3, result.Splits);
        Assert.Null(result.PositionMismatches);
    }

    [Fact]
    public async Task An_older_report_reuses_the_security_a_corporate_action_re_pointed()
    {
        var report = NewReport();
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");
        await UploadAsync(broker, report.Xml);

        var older = await UploadAsync(broker, report.BeforeReverseSplitXml);

        Assert.Equal((1, 0, 0), (older.Trades, older.Duplicates, older.SecuritiesCreated));
        var holdings = (await Client.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={broker}"))!.Holdings
            .ToDictionary(h => h.Security.Symbol, h => (h.Quantity, h.CostBasis));
        Assert.Equal(("11", "120.00"), holdings[report.Reverse]);

        var again = await UploadAsync(broker, report.Xml);

        Assert.Equal((0, 0, 9, 0), (again.Trades, again.Splits, again.Duplicates, again.SecuritiesCreated));
    }

    [Fact]
    public async Task The_sample_report_reconciles_without_corporate_actions()
    {
        var broker = await CreateAccountAsync("0.00", "investment", "eur");

        var result = await UploadAsync(broker, SampleFlexReport.Xml);

        Assert.Equal(0, result.Splits);
        Assert.Empty(result.SkippedCorporateActions);
        Assert.Empty(result.PositionMismatches!);
    }

    private static CorporateActionFlexReport NewReport() =>
        new(Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(), RandomNumberGenerator.GetInt32(1_000_000, 9_000_000) * 10);

    private async Task<ImportDto> UploadAsync(Guid accountId, string xml)
    {
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(xml));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/xml");
        using var form = new MultipartFormDataContent { { file, "file", "flex.xml" }, { new StringContent(accountId.ToString()), "accountId" } };
        var response = await Client.PostAsync("/api/investments/import/interactive-brokers", form);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<ImportDto>())!;
    }

    private sealed record SkippedDto(string Type, int Count);

    private sealed record MismatchDto(string Symbol, string BrokerQuantity, string ReplayedQuantity);

    private sealed record ImportDto(
        int Trades,
        int Splits,
        int Duplicates,
        int Skipped,
        int SecuritiesCreated,
        List<SkippedDto> SkippedCorporateActions,
        List<MismatchDto>? PositionMismatches);

    private sealed record SecurityDto(Guid Id, string Symbol);

    private sealed record HoldingDto(SecurityDto Security, string Quantity, string CostBasis);

    private sealed record PortfolioDto(List<HoldingDto> Holdings);

    private sealed record EntryDto(Guid Id, Guid? SecurityId, string? Symbol, string Type, DateOnly Date, string Quantity, string CashAmount, string Source);
}
