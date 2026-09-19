using System.Globalization;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Dashboard;

[Collection<IntegrationCollection>]
public sealed class DashboardEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Summary_reflects_new_accounts_and_this_months_transactions()
    {
        using var member = await CreateUserClientAsync();
        var before = await member.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary");

        var account = await CreateAccountAsync("10.00", client: member);
        await PostAsync<IdDto>(
            member,
            "/api/transactions",
            new { accountId = account, type = "income", amount = "5.00", date = before!.MonthStart });

        var after = await member.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary");

        Assert.Equal(15.00m, Parse(after!.TotalBalance) - Parse(before.TotalBalance));
        Assert.Equal(5.00m, Parse(after.MonthIncome) - Parse(before.MonthIncome));
        Assert.Equal(Parse(before.MonthExpense), Parse(after.MonthExpense));
        Assert.Equal(1, after.MonthStart.Day);
    }

    private static decimal Parse(string money) => decimal.Parse(money, CultureInfo.InvariantCulture);

    private sealed record SummaryDto(
        string TotalBalance,
        string MonthIncome,
        string MonthExpense,
        DateOnly MonthStart,
        DateOnly MonthEnd);
}
