using System.Globalization;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Trash;

[Collection<IntegrationCollection>]
public sealed class RestoredTransactionLedgerTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_restored_transaction_counts_again_in_the_balance_the_budget_and_the_report()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var category = await CreateCategoryAsync(client: member);
        await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = category, limitAmount = "500.00" });
        var today = Today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var transaction = await CreateTransactionAsync(member, account, category, "expense", "40.00", today, "Maistas");

        var withIt = await ReadAsync(member, account);
        await member.DeleteAsync($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);
        var withoutIt = await ReadAsync(member, account);
        await member.PostAsJsonAsync("/api/trash/restore", new { kind = "transaction", entityId = transaction.Id }, TestContext.Current.CancellationToken);
        var again = await ReadAsync(member, account);

        Assert.Equal(new Ledger("960.00", "40.00", "40.00"), withIt);
        Assert.Equal(new Ledger("1000.00", "0.00", "0.00"), withoutIt);
        Assert.Equal(withIt, again);
    }

    private async Task<Ledger> ReadAsync(HttpClient client, Guid account)
    {
        var range = $"dateFrom={Today.AddDays(-1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}"
            + $"&dateTo={Today.AddDays(1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}";
        var budgets = (await client.GetFromJsonAsync<List<BudgetDto>>("/api/budgets"))!;
        var report = (await client.GetFromJsonAsync<ReportTotals>($"/api/reports/summary?{range}"))!;

        return new Ledger(await CurrentBalanceAsync(account, client), budgets.Single().Spent, report.TotalExpense);
    }

    private sealed record Ledger(string Balance, string BudgetSpent, string ReportExpense);

    private sealed record ReportTotals(string TotalExpense);
}
