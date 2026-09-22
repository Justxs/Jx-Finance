using System.Net.Http.Json;

namespace JxFinance.Tests.Support;

public static class Seed
{
    public static async Task<T> PostAsync<T>(HttpClient client, string url, object body)
    {
        var response = await client.PostAsJsonAsync(url, body, TestContext.Current.CancellationToken);
        Assert.True(
            response.IsSuccessStatusCode,
            $"POST {url}: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)}");
        return (await response.Content.ReadFromJsonAsync<T>(TestContext.Current.CancellationToken))!;
    }

    public static async Task<Guid> HouseholdAsync(HttpClient owner, string? name = null, params TestUser[] members)
    {
        var household = await PostAsync<IdDto>(owner, "/api/households", new { name = name ?? $"Household {Guid.NewGuid():N}" });
        foreach (var member in members)
            await PostAsync<IdDto>(owner, $"/api/households/{household.Id}/members", new { email = member.Email, role = "member" });
        return household.Id;
    }

    public static async Task<Guid> CategoryAsync(HttpClient client, string name, string type = "expense") =>
        (await PostAsync<IdDto>(client, "/api/categories", new { name, type })).Id;

    public static async Task<Guid> BudgetAsync(
        HttpClient client,
        Guid categoryId,
        string limitAmount = "100.00",
        string period = "monthly",
        bool rolloverEnabled = false) =>
        (await PostAsync<IdDto>(
            client,
            "/api/budgets",
            new { categoryId, limitAmount, period, rolloverEnabled })).Id;

    public static async Task<Guid> GoalAsync(
        HttpClient client,
        string? name = null,
        string targetAmount = "500.00",
        string currentAmount = "0.00",
        DateOnly? targetDate = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/goals",
            new { name = name ?? $"Goal {Guid.NewGuid():N}"[..20], targetAmount, currentAmount, targetDate })).Id;

    public static async Task<Guid> AssetAsync(
        HttpClient client,
        DateOnly asOf,
        string? name = null,
        string type = "property",
        string currentValue = "1000.00",
        string? currency = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/assets",
            new { name = name ?? $"Asset {Guid.NewGuid():N}"[..20], type, currentValue, currency, asOf })).Id;

    public static async Task<Guid> DebtAsync(
        HttpClient client,
        DateOnly asOf,
        string? name = null,
        string type = "loan",
        string outstandingAmount = "1000.00",
        string? currency = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/debts",
            new { name = name ?? $"Debt {Guid.NewGuid():N}"[..20], type, outstandingAmount, currency, asOf })).Id;

    public static async Task<Guid> RecurringBillAsync(
        HttpClient client,
        DateOnly nextDueDate,
        string? name = null,
        string shape = "expense",
        string kind = "fixed",
        string? amount = "5.00",
        Guid? accountId = null,
        Guid? categoryId = null,
        string cadence = "monthly",
        int remindDaysBefore = 0) =>
        (await PostAsync<IdDto>(
            client,
            "/api/recurring-bills",
            new { name = name ?? $"Bill {Guid.NewGuid():N}", shape, kind, amount, accountId, categoryId, cadence, nextDueDate, remindDaysBefore })).Id;

    public static async Task<Guid> RuleAsync(
        HttpClient client,
        string match,
        string pattern,
        Guid? categoryId = null,
        Guid[]? tagIds = null,
        Guid? accountId = null,
        string? minAmount = null,
        string? maxAmount = null,
        string? name = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/categorization-rules",
            new
            {
                name = name ?? $"Rule {Guid.NewGuid():N}"[..20],
                match,
                pattern,
                tagIds = tagIds ?? [],
                categoryId,
                accountId,
                minAmount,
                maxAmount,
            })).Id;

    public static async Task<List<NotificationDto>> UnreadNotificationsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unread=true", TestContext.Current.CancellationToken))!;
}
