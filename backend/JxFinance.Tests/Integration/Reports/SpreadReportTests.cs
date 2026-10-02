using System.Globalization;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Reports;

[Collection<IntegrationCollection>]
public sealed class SpreadReportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string February = "dateFrom=2026-02-01&dateTo=2026-02-28";
    private const string Year = "dateFrom=2026-01-01&dateTo=2026-12-31";

    [Fact]
    public async Task A_month_counts_one_slice_and_the_year_counts_the_whole_amount_once()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var insurance = await CreateCategoryAsync(client: member);
        var food = await CreateCategoryAsync(client: member);
        await SpreadAsync(member, account, insurance, "expense", "360.00", "2026-01-15", 12, "Car insurance");
        await CreateTransactionAsync(member, account, food, "expense", "20.00", "2026-02-03");

        var february = await ReportAsync(member, February);
        var year = await ReportAsync(member, Year);

        Assert.Equal("50.00", february.TotalExpense);
        Assert.Equal("30.00", Amount(february.ExpenseByCategory, insurance));
        Assert.Equal("380.00", year.TotalExpense);
        Assert.Equal("360.00", Amount(year.ExpenseByCategory, insurance));
        Assert.All(year.Trend, point => Assert.True(Parse(point.Expense) >= 30m));
    }

    [Fact]
    public async Task Report_totals_equal_the_sum_of_their_categories()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var insurance = await CreateCategoryAsync(client: member);
        var food = await CreateCategoryAsync(client: member);
        var salary = await CreateCategoryAsync("income", member);
        await SpreadAsync(member, account, insurance, "expense", "100.00", "2026-01-31", 3, "Insurance");
        await SpreadAsync(member, account, salary, "income", "1000.00", "2026-01-10", 12, "Bonus");
        await CreateTransactionAsync(member, account, food, "expense", "12.34", "2026-02-28");
        await CreateTransactionAsync(member, account, salary, "income", "900.00", "2026-02-10");

        var february = await ReportAsync(member, February);
        var year = await ReportAsync(member, Year);

        Assert.Equal("33.33", Amount(february.ExpenseByCategory, insurance));
        Assert.Equal("983.34", february.TotalIncome);
        foreach (var report in new[] { february, year })
        {
            Assert.Equal(Parse(report.TotalExpense), report.ExpenseByCategory.Sum(item => Parse(item.Amount)));
            Assert.Equal(Parse(report.TotalIncome), report.IncomeByCategory.Sum(item => Parse(item.Amount)));
            Assert.Equal(Parse(report.TotalExpense), report.Trend.Sum(point => Parse(point.Expense)));
        }
    }

    [Fact]
    public async Task The_dashboard_trend_and_the_report_trend_agree()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await SpreadAsync(member, account, null, "expense", "300.00", "2026-01-20", 3, "Gym membership");
        await CreateTransactionAsync(member, account, null, "expense", "15.00", "2026-02-05");

        var dashboard = (await member.GetFromJsonAsync<TrendDto>("/api/dashboard/monthly-trend?months=3&month=2026-03", TestContext.Current.CancellationToken))!;
        var report = await ReportAsync(member, "dateFrom=2026-01-01&dateTo=2026-03-31");
        var summary = (await member.GetFromJsonAsync<DashboardSummaryDto>("/api/dashboard/summary?month=2026-02", TestContext.Current.CancellationToken))!;

        Assert.Equal(["100.00", "115.00", "100.00"], dashboard.Items.Select(item => item.Expense));
        Assert.Equal(dashboard.Items.Select(item => item.Expense), report.Trend.Select(point => point.Expense));
        Assert.Equal("115.00", summary.MonthExpense);
    }

    [Fact]
    public async Task Tag_and_payee_breakdowns_slice_and_the_payee_count_counts_the_row()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var car = await CreateTagAsync(client: member);
        await RecordTransactionAsync(member, new
        {
            accountId = account,
            type = "expense",
            amount = "120.00",
            date = "2026-01-05",
            description = "Gjensidige 20260105",
            tagIds = new[] { car },
            spreadMonths = 12,
        });
        await CreateTransactionAsync(member, account, null, "expense", "5.00", "2026-03-09", "GJENSIDIGE 20260309");

        var march = await ReportAsync(member, "dateFrom=2026-03-01&dateTo=2026-03-31&comparison=previousMonth");
        var april = await ReportAsync(member, "dateFrom=2026-04-01&dateTo=2026-04-30");
        var year = await ReportAsync(member, Year);

        var tag = Assert.Single(march.ExpenseByTag, item => item.TagId == car);
        Assert.Equal(("10.00", "10.00"), (tag.Amount, tag.ComparisonAmount));
        Assert.Equal("5.00", Assert.Single(march.ExpenseByTag, item => item.TagId is null).Amount);
        var payee = Assert.Single(march.ExpenseByPayee);
        Assert.Equal(("gjensidige", "15.00", "10.00", 2), (payee.PayeeKey, payee.Amount, payee.ComparisonAmount, payee.Count));
        var aprilPayee = Assert.Single(april.ExpenseByPayee);
        Assert.Equal(("gjensidige", "Gjensidige 20260105", "10.00", 1), (aprilPayee.PayeeKey, aprilPayee.Label, aprilPayee.Amount, aprilPayee.Count));
        var yearPayee = Assert.Single(year.ExpenseByPayee);
        Assert.Equal(("125.00", 2), (yearPayee.Amount, yearPayee.Count));
        Assert.Equal("120.00", Assert.Single(year.ExpenseByTag, item => item.TagId == car).Amount);
    }

    [Fact]
    public async Task A_backward_spread_counts_in_the_months_up_to_the_payment()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var water = await CreateCategoryAsync(client: member);
        await RecordTransactionAsync(member, new
        {
            accountId = account,
            categoryId = water,
            type = "expense",
            amount = "90.00",
            date = "2026-03-31",
            description = "Water",
            spreadMonths = 3,
            spreadDirection = "backward",
        });

        var january = await ReportAsync(member, "dateFrom=2026-01-01&dateTo=2026-01-31");
        var february = await ReportAsync(member, February);
        var april = await ReportAsync(member, "dateFrom=2026-04-01&dateTo=2026-04-30");

        Assert.Equal(("30.00", "30.00", "0.00"), (january.TotalExpense, february.TotalExpense, april.TotalExpense));
        Assert.Equal("30.00", Amount(january.ExpenseByCategory, water));
    }

    [Fact]
    public async Task A_spread_split_divides_each_months_slice_among_its_lines()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var home = await CreateCategoryAsync(client: member);
        await RecordTransactionAsync(member, new
        {
            accountId = account,
            type = "expense",
            amount = "50.00",
            date = "2026-01-03",
            spreadMonths = 3,
            lines = new object[] { new { categoryId = food, amount = "30.00" }, new { categoryId = home, amount = "20.00" } },
        });

        var months = new List<ReportDto>();
        foreach (var month in new[] { "01", "02", "03" })
        {
            months.Add(await ReportAsync(member, $"dateFrom=2026-{month}-01&dateTo=2026-{month}-28"));
        }

        var year = await ReportAsync(member, Year);

        Assert.Equal(["16.67", "16.67", "16.66"], months.Select(m => m.TotalExpense));
        Assert.All(months, month => Assert.Equal(Parse(month.TotalExpense), month.ExpenseByCategory.Sum(item => Parse(item.Amount))));
        Assert.Equal(("30.00", "20.00"), (Amount(year.ExpenseByCategory, food), Amount(year.ExpenseByCategory, home)));
    }

    [Fact]
    public async Task A_spread_refund_takes_its_slices_off_each_month()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var gym = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, gym, "expense", "50.00", "2026-02-05", "Gym");
        await SpreadAsync(member, account, gym, "expense", "-60.00", "2026-01-20", 3, "Gym refund");

        var february = await ReportAsync(member, February);
        var year = await ReportAsync(member, Year);

        Assert.Equal(("30.00", "30.00"), (Amount(february.ExpenseByCategory, gym), february.TotalExpense));
        Assert.Equal("-10.00", Amount(year.ExpenseByCategory, gym));
    }

    private static Task<TransactionDto> SpreadAsync(
        HttpClient client,
        Guid accountId,
        Guid? categoryId,
        string type,
        string amount,
        string date,
        int spreadMonths,
        string description) =>
        RecordTransactionAsync(client, new { accountId, categoryId, type, amount, date, description, spreadMonths });

    private static async Task<ReportDto> ReportAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<ReportDto>($"/api/reports/summary?{query}", TestContext.Current.CancellationToken))!;

    private static string Amount(List<CategoryDto> items, Guid categoryId) =>
        Assert.Single(items, item => item.CategoryId == categoryId).Amount;

    private static decimal Parse(string value) => decimal.Parse(value, CultureInfo.InvariantCulture);

    private sealed record CategoryDto(Guid? CategoryId, string Amount);

    private sealed record TagDto(Guid? TagId, string Amount, string? ComparisonAmount);

    private sealed record PayeeDto(string? PayeeKey, string? Label, string Amount, string? ComparisonAmount, int Count);

    private sealed record TrendPointDto(DateOnly BucketStart, string Income, string Expense);

    private sealed record ReportDto(
        string TotalIncome,
        string TotalExpense,
        List<CategoryDto> ExpenseByCategory,
        List<CategoryDto> IncomeByCategory,
        List<TrendPointDto> Trend,
        List<TagDto> ExpenseByTag,
        List<PayeeDto> ExpenseByPayee);

    private sealed record TrendItemDto(int Year, int Month, string Income, string Expense);

    private sealed record TrendDto(List<TrendItemDto> Items);

    private sealed record DashboardSummaryDto(string MonthIncome, string MonthExpense);
}
