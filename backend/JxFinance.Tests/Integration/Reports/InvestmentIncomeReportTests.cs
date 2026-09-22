using System.Net.Http.Json;
using System.Text.Json.Nodes;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Reports;

[Collection<IntegrationCollection>]
public sealed class InvestmentIncomeReportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Range = "dateFrom=2026-03-01&dateTo=2026-03-31";

    [Fact]
    public async Task Dividends_and_interest_raise_income_under_a_synthetic_group()
    {
        using var member = await CreateUserClientAsync();
        var bank = await CreateAccountAsync("1000.00", client: member);
        var broker = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        var salary = await CreateCategoryAsync("income", member);
        await RecordTransactionAsync(member, new { accountId = bank, categoryId = salary, type = "income", amount = "500.00", date = "2026-03-02" });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "dividend", date = "2026-03-02", amount = "40.00" });
        await RecordInvestmentAsync(member, new { accountId = broker, type = "interest", date = "2026-03-05", amount = "2.50" });

        var report = await ReportAsync(member, Range);

        Assert.Equal("542.50", report.TotalIncome);
        Assert.Equal("0.00", report.TotalExpense);
        Assert.Equal("542.50", report.Net);
        Assert.Equal(
            [Row(salary, "500.00"), Row(null, "42.50", "investmentIncome")],
            report.IncomeByCategory.Select(c => (c.CategoryId, c.Amount, c.SyntheticGroup)));
        Assert.Empty(report.ExpenseByCategory);
        Assert.Equal(("540.00", "0.00"), TrendOn(report, 2));
        Assert.Equal(("2.50", "0.00"), TrendOn(report, 5));
    }

    [Fact]
    public async Task Withholding_tax_and_standalone_fees_raise_expense_under_a_synthetic_group()
    {
        using var member = await CreateUserClientAsync();
        var bank = await CreateAccountAsync("1000.00", client: member);
        var broker = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        var food = await CreateCategoryAsync(client: member);
        await RecordTransactionAsync(member, new { accountId = bank, categoryId = food, type = "expense", amount = "5.00", date = "2026-03-03" });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "withholdingTax", date = "2026-03-03", amount = "6.00" });
        await RecordInvestmentAsync(member, new { accountId = broker, type = "fee", date = "2026-03-04", amount = "1.25" });

        var report = await ReportAsync(member, Range);

        Assert.Equal("0.00", report.TotalIncome);
        Assert.Equal("12.25", report.TotalExpense);
        Assert.Equal("-12.25", report.Net);
        Assert.Equal(
            [Row(null, "7.25", "investmentTaxesAndFees"), Row(food, "5.00")],
            report.ExpenseByCategory.Select(c => (c.CategoryId, c.Amount, c.SyntheticGroup)));
        Assert.Empty(report.IncomeByCategory);
        Assert.Equal(("0.00", "11.00"), TrendOn(report, 3));
        Assert.Equal(("0.00", "1.25"), TrendOn(report, 4));
    }

    [Fact]
    public async Task Buys_sells_and_their_commissions_change_nothing()
    {
        using var member = await CreateUserClientAsync();
        var broker = await CreateAccountAsync("5000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "buy", date = "2026-03-02", quantity = "10", price = "100", fee = "2.00" });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "sell", date = "2026-03-10", quantity = "5", price = "150", fee = "2.00" });

        var report = await ReportAsync(member, Range);

        Assert.Equal(("0.00", "0.00", "0.00"), (report.TotalIncome, report.TotalExpense, report.Net));
        Assert.Empty(report.IncomeByCategory);
        Assert.Empty(report.ExpenseByCategory);
        Assert.All(report.Trend, point => Assert.Equal(("0.00", "0.00"), (point.Income, point.Expense)));
    }

    [Fact]
    public async Task With_the_investments_feature_off_the_figures_equal_the_transactions_alone()
    {
        using var member = await CreateUserClientAsync();
        var broker = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        var month = $"{Today:yyyy-MM}";
        var today = $"{Today:yyyy-MM-dd}";
        await RecordTransactionAsync(member, new { accountId = broker, type = "income", amount = "100.00", date = today });
        await RecordTransactionAsync(member, new { accountId = broker, type = "expense", amount = "30.00", date = today });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "dividend", date = today, amount = "40.00" });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "withholdingTax", date = today, amount = "6.00" });
        var original = (await Client.GetFromJsonAsync<JsonObject>("/api/settings", TestContext.Current.CancellationToken))!;
        var switchedOff = original.DeepClone().AsObject();
        switchedOff["features"]!["investments"] = false;

        var on = await ReportAsync(member, $"dateFrom={today}&dateTo={today}");
        var dashboardOn = await member.GetFromJsonAsync<DashboardDto>("/api/dashboard/summary", TestContext.Current.CancellationToken);
        try
        {
            (await Client.PutAsJsonAsync("/api/settings", switchedOff, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

            var off = await ReportAsync(member, $"dateFrom={today}&dateTo={today}");
            var dashboardOff = await member.GetFromJsonAsync<DashboardDto>("/api/dashboard/summary", TestContext.Current.CancellationToken);
            var breakdownOff = await member.GetFromJsonAsync<BreakdownDto>($"/api/dashboard/category-breakdown?month={month}", TestContext.Current.CancellationToken);
            var trendOff = await member.GetFromJsonAsync<MonthlyTrendDto>("/api/dashboard/monthly-trend?months=1", TestContext.Current.CancellationToken);

            Assert.Equal(("100.00", "30.00", "70.00"), (off.TotalIncome, off.TotalExpense, off.Net));
            Assert.Equal([Row(null, "100.00")], off.IncomeByCategory.Select(c => (c.CategoryId, c.Amount, c.SyntheticGroup)));
            Assert.Equal([Row(null, "30.00")], off.ExpenseByCategory.Select(c => (c.CategoryId, c.Amount, c.SyntheticGroup)));
            Assert.Equal(("100.00", "30.00"), (Assert.Single(off.Trend).Income, Assert.Single(off.Trend).Expense));
            Assert.Equal(("100.00", "30.00"), (dashboardOff!.MonthIncome, dashboardOff.MonthExpense));
            Assert.Equal([Row(null, "30.00")], breakdownOff!.Items.Select(c => (c.CategoryId, c.Amount, c.SyntheticGroup)));
            Assert.Equal(("100.00", "30.00"), (Assert.Single(trendOff!.Items).Income, Assert.Single(trendOff.Items).Expense));
        }
        finally
        {
            (await Client.PutAsJsonAsync("/api/settings", original, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        }

        Assert.Equal(("140.00", "36.00", "104.00"), (on.TotalIncome, on.TotalExpense, on.Net));
        Assert.Equal(("140.00", "36.00"), (dashboardOn!.MonthIncome, dashboardOn.MonthExpense));
    }

    [Fact]
    public async Task The_dashboard_counts_the_same_investment_flows_as_the_report()
    {
        using var member = await CreateUserClientAsync();
        var broker = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        var month = $"{Today:yyyy-MM}";
        var today = $"{Today:yyyy-MM-dd}";
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "dividend", date = today, amount = "40.00" });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "withholdingTax", date = today, amount = "6.00" });

        var summary = await member.GetFromJsonAsync<DashboardDto>("/api/dashboard/summary", TestContext.Current.CancellationToken);
        var breakdown = await member.GetFromJsonAsync<BreakdownDto>($"/api/dashboard/category-breakdown?month={month}", TestContext.Current.CancellationToken);
        var trend = await member.GetFromJsonAsync<MonthlyTrendDto>("/api/dashboard/monthly-trend?months=2", TestContext.Current.CancellationToken);

        Assert.Equal(("40.00", "6.00"), (summary!.MonthIncome, summary.MonthExpense));
        Assert.Equal(
            [Row(null, "6.00", "investmentTaxesAndFees")],
            breakdown!.Items.Select(c => (c.CategoryId, c.Amount, c.SyntheticGroup)));
        Assert.Equal([("0.00", "0.00"), ("40.00", "6.00")], trend!.Items.Select(i => (i.Income, i.Expense)));
    }

    [Fact]
    public async Task Another_users_hidden_account_contributes_nothing()
    {
        using var member = await CreateUserClientAsync();
        var hidden = await CreateAccountAsync("1000.00", "investment");
        var fund = await CreateSecurityAsync(Client);
        await RecordInvestmentAsync(Client, new { accountId = hidden, securityId = fund, type = "dividend", date = "2026-03-02", amount = "40.00" });
        await RecordInvestmentAsync(Client, new { accountId = hidden, type = "fee", date = "2026-03-02", amount = "3.00" });

        var report = await ReportAsync(member, Range);

        Assert.Equal(("0.00", "0.00", "0.00"), (report.TotalIncome, report.TotalExpense, report.Net));
        Assert.Empty(report.IncomeByCategory);
        Assert.Empty(report.ExpenseByCategory);
    }

    [Fact]
    public async Task A_shared_account_contributes_to_every_member_of_the_household()
    {
        var owner = await CreateUserAsync();
        var partner = await CreateUserAsync();
        var household = await CreateHouseholdAsync(owner, partner);
        using var ownerClient = await LoginAsync(owner);
        using var partnerClient = await LoginAsync(partner);
        var shared = await CreateAccountAsync("1000.00", "investment", householdId: household, client: ownerClient);
        var fund = await CreateSecurityAsync(ownerClient);
        await RecordInvestmentAsync(ownerClient, new { accountId = shared, securityId = fund, type = "dividend", date = "2026-03-02", amount = "40.00" });

        var report = await ReportAsync(partnerClient, Range);

        Assert.Equal("40.00", report.TotalIncome);
    }

    [Fact]
    public async Task Only_entries_inside_the_date_range_count()
    {
        using var member = await CreateUserClientAsync();
        var broker = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "dividend", date = "2026-02-28", amount = "1.00" });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "dividend", date = "2026-03-01", amount = "10.00" });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "dividend", date = "2026-03-31", amount = "20.00" });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "dividend", date = "2026-04-01", amount = "100.00" });

        var report = await ReportAsync(member, Range);
        var monthly = await ReportAsync(member, "dateFrom=2026-01-01&dateTo=2026-04-30");

        Assert.Equal("30.00", report.TotalIncome);
        Assert.Equal("month", monthly.TrendBucket);
        Assert.Equal(["0.00", "1.00", "30.00", "100.00"], monthly.Trend.Select(p => p.Income));
    }

    [Fact]
    public async Task A_foreign_currency_dividend_counts_at_its_frozen_reporting_amount()
    {
        using var member = await CreateUserClientAsync();
        var broker = await CreateAccountAsync("1000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "dividend", date = "2026-03-02", amount = "110.00", currency = "usd" });
        await RecordInvestmentAsync(member, new { accountId = broker, securityId = fund, type = "withholdingTax", date = "2026-03-02", amount = "16.50", currency = "usd" });

        var report = await ReportAsync(member, Range);

        Assert.Equal(("100.00", "15.00", "85.00"), (report.TotalIncome, report.TotalExpense, report.Net));
        Assert.Equal("100.00", Assert.Single(report.IncomeByCategory).Amount);
        Assert.Equal("15.00", Assert.Single(report.ExpenseByCategory).Amount);
    }

    private static async Task<ReportDto> ReportAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<ReportDto>($"/api/reports/summary?{query}"))!;

    private static (Guid? CategoryId, string Amount, string? SyntheticGroup) Row(
        Guid? categoryId,
        string amount,
        string? syntheticGroup = null) =>
        (categoryId, amount, syntheticGroup);

    private static (string Income, string Expense) TrendOn(ReportDto report, int day)
    {
        var point = report.Trend.Single(p => p.BucketStart == new DateOnly(2026, 3, day));
        return (point.Income, point.Expense);
    }

    private sealed record CategoryDto(Guid? CategoryId, string Amount, string? SyntheticGroup);

    private sealed record TrendDto(DateOnly BucketStart, string Income, string Expense);

    private sealed record ReportDto(
        string TotalIncome,
        string TotalExpense,
        string Net,
        List<CategoryDto> ExpenseByCategory,
        List<CategoryDto> IncomeByCategory,
        List<TrendDto> Trend,
        string TrendBucket);

    private sealed record DashboardDto(string MonthIncome, string MonthExpense);

    private sealed record BreakdownDto(List<CategoryDto> Items);

    private sealed record MonthlyItemDto(string Income, string Expense);

    private sealed record MonthlyTrendDto(List<MonthlyItemDto> Items);
}
