using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Budgets;

[Collection<IntegrationCollection>]
public sealed class BudgetPeriodTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Every_period_reports_the_window_that_holds_today()
    {
        var weekly = await CreateBudgetAsync("weekly", "50.00");
        var monthly = await CreateBudgetAsync("monthly", "200.00");
        var quarterly = await CreateBudgetAsync("quarterly", "600.00");
        var yearly = await CreateBudgetAsync("yearly", "2400.00");

        var today = Today;
        var quarterStart = new DateOnly(today.Year, (((today.Month - 1) / 3) * 3) + 1, 1);

        AssertWindow(weekly, StartOfWeek(today, DayOfWeek.Monday), 7);
        AssertWindow(monthly, new DateOnly(today.Year, today.Month, 1), DateTime.DaysInMonth(today.Year, today.Month));
        Assert.Equal((quarterStart, quarterStart.AddMonths(3).AddDays(-1)), (quarterly.WindowStart, quarterly.WindowEnd));
        Assert.Equal(
            (new DateOnly(today.Year, 1, 1), new DateOnly(today.Year, 12, 31)),
            (yearly.WindowStart, yearly.WindowEnd));

        foreach (var budget in new[] { weekly, monthly, quarterly, yearly })
        {
            Assert.InRange(today, budget.WindowStart, budget.WindowEnd);
        }
    }

    [Fact]
    public async Task The_weekly_window_starts_on_the_configured_first_day_of_week()
    {
        var original = await ReadSettingsAsync();
        try
        {
            await SaveSettingAsync("firstDayOfWeek", "monday");
            var fromMonday = await CreateBudgetAsync("weekly", "50.00");
            Assert.Equal(DayOfWeek.Monday, fromMonday.WindowStart.DayOfWeek);
            Assert.Equal(StartOfWeek(Today, DayOfWeek.Monday), fromMonday.WindowStart);

            await SaveSettingAsync("firstDayOfWeek", "sunday");
            var fromSunday = await ReadBudgetAsync(fromMonday.Id);
            Assert.Equal(DayOfWeek.Sunday, fromSunday.WindowStart.DayOfWeek);
            Assert.Equal(StartOfWeek(Today, DayOfWeek.Sunday), fromSunday.WindowStart);

            Assert.NotEqual(fromMonday.WindowStart, fromSunday.WindowStart);
        }
        finally
        {
            await ApplySettingsAsync(original);
        }
    }

    [Fact]
    public async Task The_window_moves_with_the_installation_time_zone()
    {
        var original = await ReadSettingsAsync();
        try
        {
            await SaveSettingAsync("timeZone", "Pacific/Kiritimati");
            var budget = await CreateBudgetAsync("weekly", "50.00");
            var farEast = TodayIn("Pacific/Kiritimati");
            Assert.InRange(farEast, budget.WindowStart, budget.WindowEnd);
            Assert.Equal(StartOfWeek(farEast, DayOfWeek.Monday), budget.WindowStart);

            await SaveSettingAsync("timeZone", "Etc/GMT+12");
            var farWest = TodayIn("Etc/GMT+12");
            var shifted = await ReadBudgetAsync(budget.Id);
            Assert.InRange(farWest, shifted.WindowStart, shifted.WindowEnd);
            Assert.Equal(StartOfWeek(farWest, DayOfWeek.Monday), shifted.WindowStart);

            Assert.NotEqual(farEast, farWest);
        }
        finally
        {
            await ApplySettingsAsync(original);
        }
    }

    [Fact]
    public async Task Spend_counts_only_what_falls_inside_the_window_split_lines_included()
    {
        var account = await CreateAccountAsync("5000.00");
        var category = await CreateCategoryAsync();

        var weekly = await PostAsync<BudgetDto>(
            Client,
            "/api/budgets",
            new { categoryId = category, limitAmount = "200.00", period = "weekly" });
        var monthly = await PostAsync<BudgetDto>(
            Client,
            "/api/budgets",
            new { categoryId = category, limitAmount = "900.00", period = "monthly" });

        var dayBefore = weekly.WindowStart.AddDays(-1);
        var dayAfter = weekly.WindowEnd.AddDays(1);
        await SpendAsync(account, category, "50.00", dayBefore);
        await SpendAsync(account, category, "30.00", weekly.WindowStart);
        await SplitSpendAsync(account, category, "20.00", "12.00", Today);
        await SpendAsync(account, category, "40.00", dayAfter);

        var budgets = await Client.GetFromJsonAsync<List<BudgetDto>>("/api/budgets");
        var inWeek = budgets!.Single(b => b.Id == weekly.Id);
        var inMonth = budgets!.Single(b => b.Id == monthly.Id);

        Assert.Equal(("42.00", "158.00"), (inWeek.Spent, inWeek.Remaining));

        var monthlySpend = 0m
            + (InMonth(dayBefore) ? 50.00m : 0m)
            + (InMonth(weekly.WindowStart) ? 30.00m : 0m)
            + (InMonth(Today) ? 12.00m : 0m)
            + (InMonth(dayAfter) ? 40.00m : 0m);
        Assert.Equal(monthlySpend.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture), inMonth.Spent);
    }

    [Fact]
    public async Task One_category_holds_one_budget_per_period()
    {
        var category = await CreateCategoryAsync();

        var monthly = await PostAsync<BudgetDto>(
            Client,
            "/api/budgets",
            new { categoryId = category, limitAmount = "200.00", period = "monthly" });

        var second = await Client.PostAsJsonAsync(
            "/api/budgets",
            new { categoryId = category, limitAmount = "300.00", period = "monthly" });
        await AssertProblemAsync(second, HttpStatusCode.Conflict, "conflict.duplicate");

        var weekly = await PostAsync<BudgetDto>(
            Client,
            "/api/budgets",
            new { categoryId = category, limitAmount = "60.00", period = "weekly" });
        Assert.Equal("weekly", weekly.Period);

        var collide = await Client.PutAsJsonAsync(
            $"/api/budgets/{weekly.Id}",
            new { categoryId = category, limitAmount = "60.00", period = "monthly" });
        await AssertProblemAsync(collide, HttpStatusCode.Conflict, "conflict.duplicate");

        var moved = await Client.PutAsJsonAsync(
            $"/api/budgets/{weekly.Id}",
            new { categoryId = category, limitAmount = "60.00", period = "yearly" });
        moved.EnsureSuccessStatusCode();

        var unchanged = await Client.PutAsJsonAsync(
            $"/api/budgets/{monthly.Id}",
            new { categoryId = category, limitAmount = "250.00", period = "monthly" });
        unchanged.EnsureSuccessStatusCode();
    }

    private static DateOnly StartOfWeek(DateOnly date, DayOfWeek firstDay) =>
        date.AddDays(-(((int)date.DayOfWeek - (int)firstDay + 7) % 7));

    private static DateOnly TodayIn(string timeZoneId) =>
        DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(timeZoneId)).DateTime);

    private static void AssertWindow(BudgetDto budget, DateOnly start, int days) =>
        Assert.Equal((start, start.AddDays(days - 1)), (budget.WindowStart, budget.WindowEnd));

    private bool InMonth(DateOnly date) => (date.Year, date.Month) == (Today.Year, Today.Month);

    private async Task<BudgetDto> CreateBudgetAsync(string period, string limit) =>
        await PostAsync<BudgetDto>(
            Client,
            "/api/budgets",
            new { categoryId = await CreateCategoryAsync(), limitAmount = limit, period });

    private async Task<BudgetDto> ReadBudgetAsync(Guid id) =>
        (await Client.GetFromJsonAsync<List<BudgetDto>>("/api/budgets"))!.Single(b => b.Id == id);

    private Task SpendAsync(Guid account, Guid category, string amount, DateOnly date) =>
        PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new { accountId = account, categoryId = category, type = "expense", amount, date });

    private Task SplitSpendAsync(Guid account, Guid category, string total, string share, DateOnly date) =>
        PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = total,
                date,
                lines = new object[]
                {
                    new { categoryId = category, amount = share },
                    new { categoryId = (Guid?)null, amount = "8.00" },
                },
            });

    private async Task<JsonObject> ReadSettingsAsync() =>
        (await Client.GetFromJsonAsync<JsonObject>("/api/settings"))!;

    private async Task SaveSettingAsync(string name, string value)
    {
        var settings = await ReadSettingsAsync();
        settings[name] = value;
        await ApplySettingsAsync(settings);
    }

    private async Task ApplySettingsAsync(JsonObject settings)
    {
        var response = await Client.PutAsJsonAsync("/api/settings", settings);
        response.EnsureSuccessStatusCode();
    }
}
