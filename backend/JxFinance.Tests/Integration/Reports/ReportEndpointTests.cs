using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Reports;

[Collection<IntegrationCollection>]
public sealed class ReportEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Summary_totals_the_range_and_attributes_split_lines_to_their_categories()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var clothes = await CreateCategoryAsync(client: member);
        await RecordTransactionAsync(member, new { accountId = account, type = "income", amount = "1000.00", date = "2026-03-02" });
        await RecordTransactionAsync(member, new { accountId = account, categoryId = food, type = "expense", amount = "10.00", date = "2026-03-02" });
        await RecordTransactionAsync(member, new { accountId = account, type = "expense", amount = "5.00", date = "2026-03-03" });
        await RecordTransactionAsync(
            member,
            new
            {
                accountId = account,
                type = "expense",
                amount = "50.00",
                date = "2026-03-03",
                lines = new object[] { new { categoryId = food, amount = "30.00" }, new { categoryId = clothes, amount = "20.00" } },
            });
        await RecordTransactionAsync(member, new { accountId = account, type = "expense", amount = "999.00", date = "2026-04-01" });
        await RecordTransactionAsync(Client, new { accountId = await CreateAccountAsync(), type = "expense", amount = "777.00", date = "2026-03-02" });

        var report = await member.GetFromJsonAsync<ReportDto>("/api/reports/summary?dateFrom=2026-03-01&dateTo=2026-03-03");

        Assert.Equal("1000.00", report!.TotalIncome);
        Assert.Equal("65.00", report.TotalExpense);
        Assert.Equal("935.00", report.Net);
        Assert.Equal(
            [(food, "40.00"), (clothes, "20.00"), (null, "5.00")],
            report.ExpenseByCategory.Select(c => (c.CategoryId, c.Amount)));
        Assert.Equal("day", report.TrendBucket);
        Assert.Equal(
            [new TrendDto(new DateOnly(2026, 3, 1), "0.00", "0.00"), new TrendDto(new DateOnly(2026, 3, 2), "1000.00", "10.00"), new TrendDto(new DateOnly(2026, 3, 3), "0.00", "55.00")],
            report.Trend);
    }

    [Fact]
    public async Task Ranges_longer_than_two_months_are_bucketed_by_month()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await RecordTransactionAsync(member, new { accountId = account, type = "expense", amount = "10.00", date = "2026-01-15" });
        await RecordTransactionAsync(member, new { accountId = account, type = "expense", amount = "20.00", date = "2026-03-20" });

        var report = await member.GetFromJsonAsync<ReportDto>("/api/reports/summary?dateFrom=2026-01-10&dateTo=2026-03-31");

        Assert.Equal("month", report!.TrendBucket);
        Assert.Equal(
            [new TrendDto(new DateOnly(2026, 1, 1), "0.00", "10.00"), new TrendDto(new DateOnly(2026, 2, 1), "0.00", "0.00"), new TrendDto(new DateOnly(2026, 3, 1), "0.00", "20.00")],
            report.Trend);
    }

    [Fact]
    public async Task Without_a_range_the_report_covers_the_current_month_to_date()
    {
        using var member = await CreateUserClientAsync();

        var report = await member.GetFromJsonAsync<ReportDto>("/api/reports/summary");

        Assert.Equal(new DateOnly(Today.Year, Today.Month, 1), report!.PeriodStart);
        Assert.Equal(Today, report.PeriodEnd);
    }

    private sealed record CategoryDto(Guid? CategoryId, string Amount);

    private sealed record TrendDto(DateOnly BucketStart, string Income, string Expense);

    private sealed record ReportDto(
        DateOnly PeriodStart,
        DateOnly PeriodEnd,
        string TotalIncome,
        string TotalExpense,
        string Net,
        List<CategoryDto> ExpenseByCategory,
        List<TrendDto> Trend,
        string TrendBucket);
}
