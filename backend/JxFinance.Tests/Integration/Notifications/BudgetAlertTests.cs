using System.Net.Http.Json;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;

namespace JxFinance.Tests.Integration.Notifications;

[Collection<IntegrationCollection>]
public sealed class BudgetAlertTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private static readonly string[] BothKinds = ["budgetExceeded", "budgetWarning"];

    private static readonly int[] BothPercents = [80, 100];

    [Fact]
    public async Task Spending_below_eighty_percent_raises_nothing()
    {
        using var member = await CreateUserClientAsync();
        var budget = await WeeklyBudgetAsync(member, "100.00");
        await SpendAsync(member, budget, "79.00");

        await NewJob().ScanAsync(default);

        Assert.Empty(await AlertsAsync(member));
    }

    [Fact]
    public async Task Eighty_then_one_hundred_percent_raise_one_alert_each_and_no_more()
    {
        using var member = await CreateUserClientAsync();
        var budget = await WeeklyBudgetAsync(member, "100.00");
        await SpendAsync(member, budget, "80.00");
        var job = NewJob();

        await job.ScanAsync(default);
        await job.ScanAsync(default);
        var warned = await AlertsAsync(member);

        await SpendAsync(member, budget, "20.00");
        await job.ScanAsync(default);
        await job.ScanAsync(default);
        var both = await AlertsAsync(member);

        var warning = Assert.Single(warned);
        Assert.Equal("budgetWarning", warning.Type);
        Assert.Equal(budget.Budget.Id, warning.RelatedId);
        Assert.Equal(80, warning.Payload.ThresholdPercent);
        Assert.Equal("weekly", warning.Payload.Period);
        Assert.Equal(BothKinds, both.Select(a => a.Type).Order());
        Assert.Equal(BothPercents, both.Select(a => a.Payload.ThresholdPercent ?? 0).Order());
    }

    [Fact]
    public async Task The_next_window_alerts_again()
    {
        using var member = await CreateUserClientAsync();
        var budget = await WeeklyBudgetAsync(member, "100.00");
        await SpendAsync(member, budget, "100.00");
        var job = NewJob();

        await job.ScanAsync(default);
        await MoveAlertsIntoThePreviousWindowAsync(budget);
        await job.ScanAsync(default);

        Assert.Equal(4, (await AlertsAsync(member)).Count);
    }

    [Fact]
    public async Task A_budget_of_another_user_is_untouched()
    {
        using var spender = await CreateUserClientAsync();
        using var saver = await CreateUserClientAsync();
        var overspent = await WeeklyBudgetAsync(spender, "100.00");
        var within = await WeeklyBudgetAsync(saver, "100.00");
        await SpendAsync(spender, overspent, "100.00");
        await SpendAsync(saver, within, "10.00");

        await NewJob().ScanAsync(default);

        Assert.Equal(2, (await AlertsAsync(spender)).Count);
        Assert.Empty(await AlertsAsync(saver));
    }

    [Fact]
    public async Task Budgets_switched_off_raise_nothing_and_leave_the_list_readable()
    {
        using var member = await CreateUserClientAsync();
        var budget = await WeeklyBudgetAsync(member, "100.00");
        await SpendAsync(member, budget, "100.00");
        var store = Services.GetRequiredService<IInstanceSettingsStore>();

        try
        {
            var disabled = await StoredSettingsAsync();
            disabled.Features = disabled.Features with { Budgets = false };
            store.Set(disabled);

            await NewJob().ScanAsync(default);

            Assert.Empty(await AlertsAsync(member));
        }
        finally
        {
            store.Set(await StoredSettingsAsync());
        }

        await NewJob().ScanAsync(default);

        Assert.Equal(2, (await AlertsAsync(member)).Count);
    }

    [Fact]
    public async Task A_carried_remainder_moves_the_threshold_with_the_effective_limit()
    {
        using var member = await CreateUserClientAsync();
        var budget = await WeeklyBudgetAsync(member, "100.00", rollover: true);
        await BackdateBudgetAsync(budget.Budget.Id, budget.Budget.WindowStart.AddDays(-7));
        await SpendAsync(member, budget, "90.00");
        var job = NewJob();

        await job.ScanAsync(default);
        var quiet = await AlertsAsync(member);

        await SpendAsync(member, budget, "80.00");
        await job.ScanAsync(default);
        var alerts = await AlertsAsync(member);

        Assert.Empty(quiet);
        Assert.Equal("budgetWarning", Assert.Single(alerts).Type);
    }

    private BudgetAlertJob NewJob() =>
        new(Services.GetRequiredService<IServiceScopeFactory>(), NullLogger<BudgetAlertJob>.Instance);

    private async Task<BudgetSetup> WeeklyBudgetAsync(HttpClient client, string limit, bool rollover = false)
    {
        var account = await CreateAccountAsync("5000.00", client: client);
        var category = await CreateCategoryAsync(client: client);
        var budget = await PostAsync<BudgetDto>(
            client,
            "/api/budgets",
            new { categoryId = category, limitAmount = limit, period = "weekly", rolloverEnabled = rollover });
        return new BudgetSetup(budget, account, category);
    }

    private Task SpendAsync(HttpClient client, BudgetSetup budget, string amount) =>
        PostAsync<IdDto>(
            client,
            "/api/transactions",
            new { accountId = budget.Account, categoryId = budget.Category, type = "expense", amount, date = Today });

    private static async Task<List<AlertDto>> AlertsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<AlertDto>>("/api/notifications"))!
            .Where(n => n.RelatedType == "Budget")
            .ToList();

    private async Task<InstanceSettings> StoredSettingsAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.InstanceSettings.AsNoTracking().FirstOrDefaultAsync()
            ?? Services.GetRequiredService<IInstanceSettingsStore>().Defaults();
    }

    private Task MoveAlertsIntoThePreviousWindowAsync(BudgetSetup budget) =>
        ExecuteAsync(
            "UPDATE \"Notifications\" SET \"CreatedAt\" = $1 WHERE \"RelatedId\" = $2",
            Services.GetRequiredService<IClock>().StartOfDay(budget.Budget.WindowStart.AddDays(-1)),
            budget.Budget.Id);

    private Task BackdateBudgetAsync(Guid budgetId, DateOnly createdOn) =>
        ExecuteAsync(
            "UPDATE \"Budgets\" SET \"CreatedAt\" = $1 WHERE \"Id\" = $2",
            Services.GetRequiredService<IClock>().StartOfDay(createdOn),
            budgetId);

    private async Task ExecuteAsync(string sql, DateTimeOffset moment, Guid id)
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue(moment);
        command.Parameters.AddWithValue(id);
        await command.ExecuteNonQueryAsync();
    }

    private sealed record BudgetSetup(BudgetDto Budget, Guid Account, Guid Category);

    private sealed record AlertPayloadDto(DateOnly? DueDate, int? ThresholdPercent, string? Period);

    private sealed record AlertDto(
        Guid Id,
        string Type,
        string Title,
        AlertPayloadDto Payload,
        string? RelatedType,
        Guid? RelatedId,
        bool IsRead);
}
