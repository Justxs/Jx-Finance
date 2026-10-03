using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Reports;

[Collection<ReportsCollection>]
public sealed class PlaceBreakdownTests(ReportsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string March = "dateFrom=2026-03-01&dateTo=2026-03-31";

    [Fact]
    public async Task Expense_by_place_groups_spellings_under_the_newest_and_keeps_no_place_as_its_own_entry()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await ExpenseAsync(member, account, "2026-03-02", "12.00", "maxima ozas", 54.70000m, 25.30000m);
        await ExpenseAsync(member, account, "2026-03-20", "8.00", "Maxima Ozas", 54.70020m, 25.30020m);
        await ExpenseAsync(member, account, "2026-03-05", "5.00", "Lidl", null, null);
        await ExpenseAsync(member, account, "2026-03-06", "3.00", null, null, null);
        await RecordTransactionAsync(member, new { accountId = account, type = "income", amount = "900.00", date = "2026-03-04", place = "Maxima Ozas" });

        var report = await ReportAsync(member, March);

        Assert.Equal(
            [
                new PlaceDto("Maxima Ozas", "20.00", null, 2, 54.70010m, 25.30010m),
                new PlaceDto("Lidl", "5.00", null, 1, null, null),
                new PlaceDto(null, "3.00", null, 1, null, null),
            ],
            report.ExpenseByPlace);
    }

    [Fact]
    public async Task Expense_by_place_matches_the_ledger_summary_filtered_by_that_place()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await ExpenseAsync(member, account, "2026-03-02", "12.40", "Rimi Ozas", null, null);
        await ExpenseAsync(member, account, "2026-03-09", "7.35", "RIMI OZAS", null, null);
        await ExpenseAsync(member, account, "2026-02-28", "50.00", "Rimi Ozas", null, null);
        await ExpenseAsync(member, account, "2026-03-10", "4.00", "Iki", null, null);

        var report = await ReportAsync(member, March);
        var place = Assert.Single(report.ExpenseByPlace, p => p.Place == "RIMI OZAS");
        var summary = await member.GetFromJsonAsync<SummaryDto>(
            $"/api/transactions/summary?{March}&type=expense&place={Uri.EscapeDataString(place.Place!)}",
            TestContext.Current.CancellationToken);

        Assert.Equal(("19.75", 2), (place.Amount, place.Count));
        Assert.Equal((place.Amount, place.Count), (summary!.TotalExpense, summary.Count));
    }

    [Fact]
    public async Task A_comparison_gives_each_place_its_earlier_amount()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await ExpenseAsync(member, account, "2026-03-10", "40.00", "Bolt", null, null);
        await ExpenseAsync(member, account, "2026-02-10", "15.00", "Bolt", null, null);

        var report = await ReportAsync(member, $"{March}&comparison=previousPeriod");

        var bolt = Assert.Single(report.ExpenseByPlace);
        Assert.Equal(("Bolt", "40.00", "15.00", 1), (bolt.Place, bolt.Amount, bolt.ComparisonAmount, bolt.Count));
    }

    [Fact]
    public async Task Expense_by_place_is_empty_while_the_switch_is_off()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await using (await LocationsOnAsync())
        {
            await ExpenseAsync(member, account, "2026-03-02", "12.00", "Maxima", null, null);
        }

        var report = await ReportAsync(member, March);

        Assert.Empty(report.ExpenseByPlace);
        Assert.Equal("12.00", report.TotalExpense);
    }

    private static Task<TransactionDto> ExpenseAsync(
        HttpClient client,
        Guid accountId,
        string date,
        string amount,
        string? place,
        decimal? latitude,
        decimal? longitude) =>
        RecordTransactionAsync(client, new { accountId, type = "expense", amount, date, description = "Shopping", place, latitude, longitude });

    private static async Task<ReportDto> ReportAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<ReportDto>($"/api/reports/summary?{query}", TestContext.Current.CancellationToken))!;

    private sealed record PlaceDto(string? Place, string Amount, string? ComparisonAmount, int Count, decimal? Latitude, decimal? Longitude);

    private sealed record ReportDto(string TotalExpense, List<PlaceDto> ExpenseByPlace);

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);
}
