using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<LedgerCollection>]
public sealed class TransactionPayeeFilterTests(LedgerFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Range = "dateFrom=2026-04-01&dateTo=2026-04-30&type=expense";

    [Fact]
    public async Task The_payee_filter_returns_the_rows_behind_a_report_entry_and_its_totals_match()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "12.40", "2026-04-02", "MAXIMA LT, UAB 20260402");
        await CreateTransactionAsync(member, account, null, "expense", "7.60", "2026-04-18", "Maxima LT UAB 20260418");
        await CreateTransactionAsync(member, account, null, "expense", "3.00", "2026-04-18", "Maxima Kaunas");
        await CreateTransactionAsync(member, account, null, "income", "50.00", "2026-04-19", "Maxima LT UAB");
        var report = (await member.GetFromJsonAsync<ReportDto>("/api/reports/summary?dateFrom=2026-04-01&dateTo=2026-04-30", TestContext.Current.CancellationToken))!;
        var maxima = report.ExpenseByPayee.Single(p => p.PayeeKey == "maxima lt uab");

        var list = await ListAsync(member, $"{Range}&payee={Uri.EscapeDataString(maxima.PayeeKey!)}");
        var summary = await SummaryAsync(member, $"{Range}&payee={Uri.EscapeDataString(maxima.PayeeKey!)}");

        Assert.Equal(["Maxima LT UAB 20260418", "MAXIMA LT, UAB 20260402"], list.Items.Select(t => t.Description));
        Assert.Equal((2, maxima.Amount), (summary.Count, summary.TotalExpense));
        Assert.Equal("20.00", maxima.Amount);
    }

    [Fact]
    public async Task A_raw_description_as_payee_matches_its_normalized_key_and_the_export_follows()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "9.99", "2026-04-03", "NETFLIX.COM 4412");
        await CreateTransactionAsync(member, account, null, "expense", "4.00", "2026-04-04", "Spotify");
        var payee = Uri.EscapeDataString("Netflix com");

        var list = await ListAsync(member, $"{Range}&payee={payee}");
        var csv = await member.GetStringAsync($"/api/transactions/export?{Range}&payee={payee}", TestContext.Current.CancellationToken);

        Assert.Equal(["NETFLIX.COM 4412"], list.Items.Select(t => t.Description));
        var row = Assert.Single(csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Skip(1));
        Assert.StartsWith("2026-04-03,NETFLIX.COM 4412,", row);
    }

    [Fact]
    public async Task A_payee_with_nothing_left_after_normalizing_does_not_filter()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "1.00", "2026-04-03", "Bolt");
        await CreateTransactionAsync(member, account, null, "expense", "2.00", "2026-04-04", null);

        var list = await ListAsync(member, $"{Range}&payee=%2C%2C");

        Assert.Equal(2, list.Total);
    }

    [Fact]
    public async Task A_payee_longer_than_a_description_is_rejected()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.GetAsync($"/api/transactions?payee={new string('a', 501)}", TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "payee");
    }

    private static async Task<PageDto<TransactionDto>> ListAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?pageSize=50&{query}", TestContext.Current.CancellationToken))!;

    private static async Task<SummaryDto> SummaryAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<SummaryDto>($"/api/transactions/summary?{query}", TestContext.Current.CancellationToken))!;

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);

    private sealed record PayeeDto(string? PayeeKey, string Amount);

    private sealed record ReportDto(List<PayeeDto> ExpenseByPayee);
}
