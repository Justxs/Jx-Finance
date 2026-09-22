using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Reports;

[Collection<IntegrationCollection>]
public sealed class ReportComparisonTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task The_previous_period_is_the_same_number_of_days_immediately_before_the_range()
    {
        using var member = await CreateUserClientAsync();

        var month = await ReportAsync(member, "2026-03-01", "2026-03-31", "previousPeriod");
        var week = await ReportAsync(member, "2026-03-09", "2026-03-15", "previousPeriod");
        var arbitrary = await ReportAsync(member, "2026-03-05", "2026-03-19", "previousPeriod");
        var year = await ReportAsync(member, "2026-01-01", "2026-12-31", "previousPeriod");

        Assert.Equal(Span("2026-01-29", "2026-02-28"), Span(month.Comparison));
        Assert.Equal(Span("2026-03-02", "2026-03-08"), Span(week.Comparison));
        Assert.Equal(Span("2026-02-18", "2026-03-04"), Span(arbitrary.Comparison));
        Assert.Equal(Span("2025-01-01", "2025-12-31"), Span(year.Comparison));
        Assert.Equal("previousPeriod", month.Comparison!.Mode);
    }

    [Fact]
    public async Task The_year_earlier_range_keeps_february_and_month_ends_whole()
    {
        using var member = await CreateUserClientAsync();

        var march = await ReportAsync(member, "2026-03-01", "2026-03-31", "previousYear");
        var shortFebruary = await ReportAsync(member, "2025-02-01", "2025-02-28", "previousYear");
        var leapFebruary = await ReportAsync(member, "2024-02-01", "2024-02-29", "previousYear");
        var leapDay = await ReportAsync(member, "2024-02-29", "2024-02-29", "previousYear");
        var midMonth = await ReportAsync(member, "2026-04-10", "2026-04-20", "previousYear");
        var wholeYear = await ReportAsync(member, "2026-01-01", "2026-12-31", "previousYear");

        Assert.Equal(Span("2025-03-01", "2025-03-31"), Span(march.Comparison));
        Assert.Equal(Span("2024-02-01", "2024-02-29"), Span(shortFebruary.Comparison));
        Assert.Equal(Span("2023-02-01", "2023-02-28"), Span(leapFebruary.Comparison));
        Assert.Equal(Span("2023-02-28", "2023-02-28"), Span(leapDay.Comparison));
        Assert.Equal(Span("2025-04-10", "2025-04-20"), Span(midMonth.Comparison));
        Assert.Equal(Span("2025-01-01", "2025-12-31"), Span(wholeYear.Comparison));
    }

    [Fact]
    public async Task A_category_a_tag_and_a_synthetic_group_present_on_one_side_only_answer_zero_on_the_other()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var broker = await CreateAccountAsync("5000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        var food = await CreateCategoryAsync(client: member);
        var clothes = await CreateCategoryAsync(client: member);
        var holiday = await CreateTagAsync($"Holiday {Guid.NewGuid():N}", client: member);
        var car = await CreateTagAsync($"Car {Guid.NewGuid():N}", client: member);
        await RecordTransactionAsync(member, new { accountId = account, categoryId = food, type = "expense", amount = "40.00", date = "2026-06-10", tagIds = new[] { holiday } });
        await RecordTransactionAsync(member, new { accountId = account, categoryId = clothes, type = "expense", amount = "25.00", date = "2026-05-12", tagIds = new[] { car } });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "withholdingTax", date = "2026-06-11", amount = "3.00" });

        var report = await ReportAsync(member, "2026-06-01", "2026-06-30", "previousPeriod");

        Assert.Equal(Span("2026-05-02", "2026-05-31"), Span(report.Comparison));
        Assert.Equal(("40.00", "0.00"), Category(report, food));
        Assert.Equal(("0.00", "25.00"), Category(report, clothes));
        Assert.Equal(("3.00", "0.00"), Group(report, "investmentTaxesAndFees"));
        Assert.Equal(("40.00", "0.00"), Tag(report, holiday));
        Assert.Equal(("0.00", "25.00"), Tag(report, car));
        Assert.Equal(("43.00", "25.00"), (report.TotalExpense, report.Comparison!.TotalExpense));
    }

    [Fact]
    public async Task A_change_from_nothing_answers_a_zero_base_rather_than_a_missing_side()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var salary = await CreateCategoryAsync("income", member);
        await RecordTransactionAsync(member, new { accountId = account, categoryId = salary, type = "income", amount = "900.00", date = "2026-07-04" });

        var report = await ReportAsync(member, "2026-07-01", "2026-07-31", "previousPeriod");

        Assert.Equal(("0.00", "0.00", "0.00"), (report.Comparison!.TotalIncome, report.Comparison.TotalExpense, report.Comparison.Net));
        Assert.Equal(("900.00", "0.00"), Category(report, salary, income: true));
        Assert.All(report.Trend, point => Assert.Equal(("0.00", "0.00"), (point.ComparisonIncome, point.ComparisonExpense)));
        Assert.Equal("2026-05-31", report.Trend[0].ComparisonBucketStart);
    }

    [Fact]
    public async Task Each_trend_bucket_meets_the_bucket_at_the_same_position_in_the_earlier_period()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        await RecordTransactionAsync(member, new { accountId = account, type = "expense", amount = "11.00", date = "2026-08-02" });
        await RecordTransactionAsync(member, new { accountId = account, type = "expense", amount = "22.00", date = "2026-07-27" });

        var report = await ReportAsync(member, "2026-08-01", "2026-08-05", "previousPeriod");

        Assert.Equal("day", report.TrendBucket);
        Assert.Equal(["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31"], report.Trend.Select(p => p.ComparisonBucketStart));
        Assert.Equal("22.00", report.Trend[0].ComparisonExpense);
        Assert.Equal("11.00", report.Trend[1].Expense);
        Assert.Equal("0.00", report.Trend[1].ComparisonExpense);
    }

    [Fact]
    public async Task Without_a_comparison_the_response_is_the_one_it_always_was()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var holiday = await CreateTagAsync($"Holiday {Guid.NewGuid():N}", client: member);
        await RecordTransactionAsync(member, new { accountId = account, categoryId = food, type = "expense", amount = "12.00", date = "2026-09-03", tagIds = new[] { holiday } });
        await RecordTransactionAsync(member, new { accountId = account, type = "expense", amount = "80.00", date = "2026-08-03" });

        var omitted = await ReportAsync(member, "2026-09-01", "2026-09-30", comparison: null);
        var raw = await member.GetStringAsync("/api/reports/summary?dateFrom=2026-09-01&dateTo=2026-09-30", TestContext.Current.CancellationToken);
        var asked = await member.GetStringAsync("/api/reports/summary?dateFrom=2026-09-01&dateTo=2026-09-30&comparison=none", TestContext.Current.CancellationToken);

        Assert.Null(omitted.Comparison);
        Assert.Equal("12.00", omitted.TotalExpense);
        Assert.All(omitted.ExpenseByCategory, item => Assert.Null(item.ComparisonAmount));
        Assert.All(omitted.ExpenseByTag, item => Assert.Null(item.ComparisonAmount));
        Assert.All(omitted.Trend, point => Assert.Null(point.ComparisonExpense));
        Assert.All(omitted.Trend, point => Assert.Null(point.ComparisonIncome));
        Assert.All(omitted.Trend, point => Assert.Null(point.ComparisonBucketStart));
        Assert.Equal(raw, asked);
    }

    [Fact]
    public async Task Another_users_hidden_account_contributes_to_neither_period()
    {
        using var member = await CreateUserClientAsync();
        var hidden = await CreateAccountAsync("5000.00");
        var hiddenBroker = await CreateAccountAsync("5000.00", "investment");
        var fund = await CreateSecurityAsync(Client);
        var theirTag = await CreateTagAsync($"Theirs {Guid.NewGuid():N}");
        await RecordTransactionAsync(Client, new { accountId = hidden, type = "expense", amount = "700.00", date = "2026-10-05", tagIds = new[] { theirTag } });
        await RecordTransactionAsync(Client, new { accountId = hidden, type = "expense", amount = "600.00", date = "2026-09-05" });
        await RecordInvestmentAsync(Client, new { accountId = hiddenBroker, securityId = fund, type = "dividend", date = "2026-09-06", amount = "50.00" });

        var report = await ReportAsync(member, "2026-10-01", "2026-10-31", "previousPeriod");

        Assert.Equal(("0.00", "0.00"), (report.TotalExpense, report.Comparison!.TotalExpense));
        Assert.Equal(("0.00", "0.00"), (report.TotalIncome, report.Comparison.TotalIncome));
        Assert.Empty(report.ExpenseByCategory);
        Assert.Empty(report.IncomeByCategory);
        Assert.Empty(report.ExpenseByTag);
    }

    private static async Task<ReportDto> ReportAsync(HttpClient client, string dateFrom, string dateTo, string? comparison)
    {
        var query = $"/api/reports/summary?dateFrom={dateFrom}&dateTo={dateTo}";
        if (comparison is not null)
        {
            query += $"&comparison={comparison}";
        }

        return (await client.GetFromJsonAsync<ReportDto>(query))!;
    }

    private static (string From, string To) Span(string from, string to) => (from, to);

    private static (string From, string To) Span(ComparisonDto? comparison) =>
        (comparison!.PeriodStart, comparison.PeriodEnd);

    private static (string Amount, string? Comparison) Category(ReportDto report, Guid categoryId, bool income = false)
    {
        var list = income ? report.IncomeByCategory : report.ExpenseByCategory;
        var item = list.Single(i => i.CategoryId == categoryId);
        return (item.Amount, item.ComparisonAmount);
    }

    private static (string Amount, string? Comparison) Group(ReportDto report, string syntheticGroup)
    {
        var item = report.ExpenseByCategory.Single(i => i.SyntheticGroup == syntheticGroup);
        return (item.Amount, item.ComparisonAmount);
    }

    private static (string Amount, string? Comparison) Tag(ReportDto report, Guid tagId)
    {
        var item = report.ExpenseByTag.Single(i => i.TagId == tagId);
        return (item.Amount, item.ComparisonAmount);
    }

    private sealed record CategoryDto(Guid? CategoryId, string Amount, string? SyntheticGroup, string? ComparisonAmount);

    private sealed record TagDto(Guid? TagId, string Amount, string? ComparisonAmount);

    private sealed record TrendDto(
        string BucketStart,
        string Income,
        string Expense,
        string? ComparisonBucketStart,
        string? ComparisonIncome,
        string? ComparisonExpense);

    private sealed record ComparisonDto(
        string Mode,
        string PeriodStart,
        string PeriodEnd,
        string TotalIncome,
        string TotalExpense,
        string Net);

    private sealed record ReportDto(
        string TotalIncome,
        string TotalExpense,
        string Net,
        List<CategoryDto> ExpenseByCategory,
        List<CategoryDto> IncomeByCategory,
        List<TrendDto> Trend,
        string TrendBucket,
        List<TagDto> ExpenseByTag,
        ComparisonDto? Comparison);
}
