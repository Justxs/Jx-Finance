using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.MonthCloses;

[Collection<ReportsCollection>]
public sealed class SpreadMonthCloseTests(ReportsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string March = "2025-03";

    [Fact]
    public async Task A_spread_row_alone_does_not_make_the_month_drift()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await SpreadAsync(member, account, "360.00", "2025-01-15", 12);
        await CreateTransactionAsync(member, account, null, "expense", "9.00", "2025-03-05");

        var closed = await CloseAsync(member, March);
        var year = (await member.GetFromJsonAsync<YearDto>("/api/month-close?year=2025", TestContext.Current.CancellationToken))!;

        Assert.Equal("closed", closed.Status);
        Assert.Equal("39.00", closed.Figures.TotalExpense);
        Assert.Equal((1, 1), (closed.Drift!.Totals!.ClosedCount, closed.Drift.Totals.CurrentCount));
        Assert.Equal(0, closed.Drift.RowCount);
        Assert.Equal("closed", year.Months[2].Status);
    }

    [Fact]
    public async Task Editing_the_january_row_after_closing_march_marks_march_changed()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var row = await SpreadAsync(member, account, "360.00", "2025-01-15", 12);
        await CloseAsync(member, March);

        (await PutVersionedAsync(member,
            $"/api/transactions/{row.Id}",
            new { id = row.Id, accountId = account, type = "expense", amount = "480.00", date = "2025-01-15", description = "Insurance", spreadMonths = 12 })).EnsureSuccessStatusCode();
        var review = await ReviewAsync(member, March);
        var year = (await member.GetFromJsonAsync<YearDto>("/api/month-close?year=2025", TestContext.Current.CancellationToken))!;

        Assert.Equal("closedChanged", review.Status);
        Assert.Equal(("30.00", "40.00"), (review.Drift!.Totals!.ClosedExpense, review.Figures.TotalExpense));
        Assert.Equal("edited", Assert.Single(review.Drift.Rows).Change);
        Assert.Equal("closedChanged", year.Months[2].Status);
    }

    [Fact]
    public async Task A_spread_row_created_after_the_close_is_listed_as_created()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "9.00", "2025-03-05");
        await CloseAsync(member, March);

        var row = await SpreadAsync(member, account, "120.00", "2025-02-01", 6);
        var review = await ReviewAsync(member, March);
        var year = (await member.GetFromJsonAsync<YearDto>("/api/month-close?year=2025", TestContext.Current.CancellationToken))!;

        Assert.Equal("closedChanged", review.Status);
        var drift = Assert.Single(review.Drift!.Rows);
        Assert.Equal((row.Id, "created"), (drift.Id, drift.Change));
        Assert.Equal((1, 1), (review.Drift.Totals!.ClosedCount, review.Drift.Totals.CurrentCount));
        Assert.Equal("closedChanged", year.Months[2].Status);
    }

    [Fact]
    public async Task A_backward_row_paid_after_the_close_changes_the_closed_month_it_reaches()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "9.00", "2025-03-05");
        var closed = await CloseAsync(member, March);

        var water = await RecordTransactionAsync(member, new
        {
            accountId = account,
            type = "expense",
            amount = "90.00",
            date = "2025-04-10",
            description = "Water",
            spreadMonths = 3,
            spreadDirection = "backward",
        });
        var review = await ReviewAsync(member, March);

        Assert.Equal("9.00", closed.Figures.TotalExpense);
        Assert.Equal("closedChanged", review.Status);
        Assert.Equal(("9.00", "39.00"), (review.Drift!.Totals!.ClosedExpense, review.Figures.TotalExpense));
        Assert.Equal((water.Id, "created"), (Assert.Single(review.Drift.Rows).Id, review.Drift.Rows[0].Change));
    }

    private static Task<IdDto> SpreadAsync(HttpClient client, Guid accountId, string amount, string date, int spreadMonths) =>
        PostAsync<IdDto>(
            client,
            "/api/transactions",
            new { accountId, type = "expense", amount, date, description = "Insurance", spreadMonths });

    private static async Task<ReviewDto> CloseAsync(HttpClient client, string month) =>
        await ReadOkAsync<ReviewDto>(
            await client.PostAsJsonAsync($"/api/month-close/{month}", new { note = (string?)null }, TestContext.Current.CancellationToken));

    private static async Task<ReviewDto> ReviewAsync(HttpClient client, string month) =>
        (await client.GetFromJsonAsync<ReviewDto>($"/api/month-close/{month}", TestContext.Current.CancellationToken))!;

    private sealed record YearDto(int Year, List<MonthStatusDto> Months);

    private sealed record MonthStatusDto(DateOnly Month, string Status);

    private sealed record FiguresDto(string TotalExpense);

    private sealed record TotalsDto(string ClosedExpense, int ClosedCount, int CurrentCount);

    private sealed record DriftRowDto(Guid Id, string Change);

    private sealed record DriftDto(TotalsDto? Totals, List<DriftRowDto> Rows, int RowCount);

    private sealed record ReviewDto(string Status, FiguresDto Figures, DriftDto? Drift);
}
