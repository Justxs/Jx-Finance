using System.Net.Http.Json;
using JxFinance.Domain.Common;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Budgets;

[Collection<IntegrationCollection>]
public sealed class BudgetRolloverTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task What_is_left_of_the_previous_window_raises_this_windows_limit()
    {
        var account = await CreateAccountAsync("5000.00");
        var category = await CreateCategoryAsync();
        var budget = await CreateWeeklyAsync(category, "100.00");

        await BackdateAsync(budget.Id, budget.WindowStart.AddDays(-7));
        await SpendAsync(account, category, "40.00", budget.WindowStart.AddDays(-1));
        await SpendAsync(account, category, "25.00", Today);

        var carried = await ReadAsync(budget.Id);

        Assert.Equal(
            ("100.00", "60.00", "160.00", "25.00", "135.00"),
            (carried.LimitAmount, carried.CarriedAmount, carried.EffectiveLimit, carried.Spent, carried.Remaining));
    }

    [Fact]
    public async Task An_overspent_window_carries_a_negative_amount_forward()
    {
        var account = await CreateAccountAsync("5000.00");
        var category = await CreateCategoryAsync();
        var budget = await CreateWeeklyAsync(category, "100.00");

        await BackdateAsync(budget.Id, budget.WindowStart.AddDays(-7));
        await SpendAsync(account, category, "130.00", budget.WindowStart.AddDays(-2));

        var carried = await ReadAsync(budget.Id);

        Assert.Equal(
            ("-30.00", "70.00", "0.00", "70.00"),
            (carried.CarriedAmount, carried.EffectiveLimit, carried.Spent, carried.Remaining));
    }

    [Fact]
    public async Task The_carry_walks_back_twelve_windows_and_no_further()
    {
        var account = await CreateAccountAsync("5000.00");
        var category = await CreateCategoryAsync();
        var budget = await CreateWeeklyAsync(category, "100.00");

        await BackdateAsync(budget.Id, budget.WindowStart.AddDays(-7 * 40));
        await SpendAsync(account, category, "500.00", budget.WindowStart.AddDays(-7 * 13));
        await SpendAsync(account, category, "40.00", budget.WindowStart.AddDays(-7 * 12));

        var carried = await ReadAsync(budget.Id);

        Assert.Equal("1160.00", carried.CarriedAmount);
        Assert.Equal("1260.00", carried.EffectiveLimit);
    }

    [Fact]
    public async Task A_budget_carries_nothing_from_before_it_existed()
    {
        var account = await CreateAccountAsync("5000.00");
        var category = await CreateCategoryAsync();
        var budget = await CreateWeeklyAsync(category, "100.00");

        await SpendAsync(account, category, "10.00", budget.WindowStart.AddDays(-1));

        var read = await ReadAsync(budget.Id);

        Assert.Equal(("0.00", "100.00"), (read.CarriedAmount, read.EffectiveLimit));
    }

    [Fact]
    public async Task Rollover_switched_off_ignores_earlier_windows()
    {
        var account = await CreateAccountAsync("5000.00");
        var category = await CreateCategoryAsync();
        var budget = await PostAsync<BudgetDto>(
            Client,
            "/api/budgets",
            new { categoryId = category, limitAmount = "100.00", period = "weekly", rolloverEnabled = false });

        await BackdateAsync(budget.Id, budget.WindowStart.AddDays(-7));
        await SpendAsync(account, category, "20.00", budget.WindowStart.AddDays(-1));

        var read = await ReadAsync(budget.Id);
        Assert.Equal(("0.00", "100.00", "0.00"), (read.CarriedAmount, read.EffectiveLimit, read.Spent));

        var switchedOn = await Client.PutAsJsonAsync(
            $"/api/budgets/{budget.Id}",
            new { categoryId = category, limitAmount = "100.00", period = "weekly", rolloverEnabled = true }, TestContext.Current.CancellationToken);
        switchedOn.EnsureSuccessStatusCode();

        var after = (await switchedOn.Content.ReadFromJsonAsync<BudgetDto>(TestContext.Current.CancellationToken))!;
        Assert.Equal(("80.00", "180.00"), (after.CarriedAmount, after.EffectiveLimit));
    }

    private async Task<BudgetDto> CreateWeeklyAsync(Guid category, string limit) =>
        await PostAsync<BudgetDto>(
            Client,
            "/api/budgets",
            new { categoryId = category, limitAmount = limit, period = "weekly", rolloverEnabled = true });

    private async Task<BudgetDto> ReadAsync(Guid id) =>
        (await Client.GetFromJsonAsync<List<BudgetDto>>("/api/budgets"))!.Single(b => b.Id == id);

    private Task SpendAsync(Guid account, Guid category, string amount, DateOnly date) =>
        PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new { accountId = account, categoryId = category, type = "expense", amount, date });

    private Task BackdateAsync(Guid budgetId, DateOnly createdOn) =>
        SqlAsync($"""UPDATE "Budgets" SET "CreatedAt" = {Services.GetRequiredService<IClock>().StartOfDay(createdOn)} WHERE "Id" = {budgetId}""");
}
