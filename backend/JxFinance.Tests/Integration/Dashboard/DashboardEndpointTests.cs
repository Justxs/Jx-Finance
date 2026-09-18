using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Dashboard;

[Collection<IntegrationCollection>]
public sealed class DashboardEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Summary_reflects_new_accounts_and_this_months_transactions()
    {
        var before = await Client.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary");

        var accountResponse = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = "Dashboard test", type = "checking", startingBalance = "10.00" });
        Assert.Equal(HttpStatusCode.Created, accountResponse.StatusCode);
        var account = await accountResponse.Content.ReadFromJsonAsync<AccountDto>();

        var inMonthDate = before!.MonthStart;
        var income = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account!.Id,
                type = "income",
                amount = "5.00",
                date = inMonthDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            });
        Assert.Equal(HttpStatusCode.Created, income.StatusCode);

        var after = await Client.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary");

        Assert.Equal(15.00m, Parse(after!.TotalBalance) - Parse(before.TotalBalance));
        Assert.Equal(5.00m, Parse(after.MonthIncome) - Parse(before.MonthIncome));
        Assert.Equal(Parse(before.MonthExpense), Parse(after.MonthExpense));
        Assert.Equal(1, after.MonthStart.Day);
    }

    private static decimal Parse(string money) => decimal.Parse(money, CultureInfo.InvariantCulture);

    private sealed record AccountDto(Guid Id);

    private sealed record SummaryDto(
        string TotalBalance,
        string MonthIncome,
        string MonthExpense,
        DateOnly MonthStart,
        DateOnly MonthEnd);
}
