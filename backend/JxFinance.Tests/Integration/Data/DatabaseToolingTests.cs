using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Data;

[Collection<DataCollection>]
public sealed class DatabaseToolingTests(DataFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Demo_data_fills_an_empty_user_and_refuses_a_second_run()
    {
        var user = await CreateUserAsync();

        await DemoDataCommand.RunAsync(Services, user.Email);

        var client = await LoginAsync(user);
        var accounts = await client.GetFromJsonAsync<JsonElement>("/api/accounts", TestContext.Current.CancellationToken);
        var transactions = await client.GetFromJsonAsync<JsonElement>("/api/transactions?page=1&pageSize=5", TestContext.Current.CancellationToken);
        Assert.Equal(3, accounts.GetArrayLength());
        Assert.True(transactions.GetProperty("total").GetInt32() > 50);
        await Assert.ThrowsAsync<InvalidOperationException>(() => DemoDataCommand.RunAsync(Services, user.Email));
    }

    [Fact]
    public async Task Demo_data_has_paid_history_from_its_first_month_and_the_newest_features()
    {
        var user = await CreateUserAsync();

        await DemoDataCommand.RunAsync(Services, user.Email);

        var client = await LoginAsync(user);
        var month = Today.AddMonths(-5).ToString("yyyy-MM", CultureInfo.InvariantCulture);
        var calendar = await client.GetFromJsonAsync<JsonElement>($"/api/recurring-bills/calendar?month={month}", TestContext.Current.CancellationToken);
        var occurrences = calendar.GetProperty("occurrences").EnumerateArray().ToList();
        Assert.Equal(
            ["Car insurance", "Electricity", "Rent", "Salary", "Standing order to savings"],
            occurrences.Select(o => o.GetProperty("name").GetString()).Order(StringComparer.Ordinal));
        Assert.All(occurrences, o => Assert.Equal("paid", o.GetProperty("status").GetString()));
        var seeded = await WithDbAsync(user.Id, async db => new
        {
            Spread = await db.Transactions.CountAsync(t => t.SpreadMonths == 12, TestContext.Current.CancellationToken),
            GroupAccounts = await db.Transactions.Where(t => t.GroupId != null).Select(t => t.AccountId).Distinct().CountAsync(TestContext.Current.CancellationToken),
            Places = await db.Transactions.CountAsync(t => t.Place != null && t.Latitude != null && t.Longitude != null, TestContext.Current.CancellationToken),
            Uncategorized = await db.Transactions.CountAsync(t => t.CategoryId == null, TestContext.Current.CancellationToken),
            PayeeNames = await db.PayeeNames.CountAsync(TestContext.Current.CancellationToken),
            SharedAssets = await db.Assets.CountAsync(a => a.Scope == Scope.Shared, TestContext.Current.CancellationToken),
        });
        Assert.Equal((1, 2, 2, 1), (seeded.Spread, seeded.GroupAccounts, seeded.PayeeNames, seeded.SharedAssets));
        Assert.True(seeded.Places >= 20);
        Assert.True(seeded.Uncategorized >= 8);
    }
}
