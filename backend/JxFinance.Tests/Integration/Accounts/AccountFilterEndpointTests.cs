using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Accounts;

[Collection<IntegrationCollection>]
public sealed class AccountFilterEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Filters_by_name_and_type_and_sorts_by_current_balance()
    {
        var marker = Guid.NewGuid().ToString("N")[..8];
        await CreateAsync($"Zeta {marker}", "savings", "300.00");
        await CreateAsync($"Alpha {marker}", "cash", "100.00");
        await CreateAsync($"Beta {marker}", "cash", "200.00");

        var byName = await Client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?search={Uri.EscapeDataString(marker)}", TestContext.Current.CancellationToken);
        Assert.Equal(3, byName!.Count);

        var byType = await Client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?search={Uri.EscapeDataString(marker)}&type=cash", TestContext.Current.CancellationToken);
        Assert.Equal(2, byType!.Count);
        Assert.All(byType, a => Assert.Equal("cash", a.Type));

        var byBalanceDesc = await Client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?search={Uri.EscapeDataString(marker)}&sort=currentBalance&direction=desc", TestContext.Current.CancellationToken);
        Assert.Equal(["300.00", "200.00", "100.00"], byBalanceDesc!.Select(a => a.CurrentBalance));

        var byNameAsc = await Client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?search={Uri.EscapeDataString(marker)}&sort=name&direction=asc", TestContext.Current.CancellationToken);
        Assert.Equal(
            [$"Alpha {marker}", $"Beta {marker}", $"Zeta {marker}"],
            byNameAsc!.Select(a => a.Name));
    }

    [Fact]
    public async Task Name_search_treats_pattern_characters_as_text()
    {
        var marker = Guid.NewGuid().ToString("N")[..8];
        await CreateAsync($"{marker} 100%_done", "cash", "1.00");
        await CreateAsync($"{marker} 100 percent done", "cash", "1.00");

        var literal = await Client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?search={Uri.EscapeDataString($"{marker} 100%_DONE")}", TestContext.Current.CancellationToken);
        var wildcard = await Client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?search={Uri.EscapeDataString($"{marker}%done")}", TestContext.Current.CancellationToken);

        Assert.Equal($"{marker} 100%_done", Assert.Single(literal!).Name);
        Assert.Empty(wildcard!);
    }

    [Fact]
    public async Task Balances_as_of_a_date_count_only_rows_on_or_before_it()
    {
        using var member = await CreateUserClientAsync();
        var asOf = new DateOnly(Today.Year, Today.Month, 1).AddDays(-1);
        var account = await CreateAccountAsync("100.00", client: member);
        var idle = await CreateAccountAsync("10.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "40.00", $"{asOf:yyyy-MM-dd}");
        await CreateTransactionAsync(member, account, null, "income", "25.00", $"{asOf.AddDays(1):yyyy-MM-dd}");

        var past = (await member.GetFromJsonAsync<List<AccountDto>>($"/api/accounts?asOf={asOf:yyyy-MM-dd}", TestContext.Current.CancellationToken))!;
        var current = (await member.GetFromJsonAsync<List<AccountDto>>("/api/accounts", TestContext.Current.CancellationToken))!;
        var malformed = await member.GetAsync("/api/accounts?asOf=not-a-date", TestContext.Current.CancellationToken);

        Assert.Equal(current.Select(a => a.Id), past.Select(a => a.Id));
        Assert.Equal(("60.00", "60.00"), (past.Single(a => a.Id == account).CurrentBalance, past.Single(a => a.Id == account).ReportingBalance));
        Assert.Equal("85.00", current.Single(a => a.Id == account).ReportingBalance);
        Assert.Equal("10.00", past.Single(a => a.Id == idle).ReportingBalance);
        await AssertValidationErrorAsync(malformed, "asOf");
    }

    private async Task CreateAsync(string name, string type, string startingBalance)
    {
        var response = await Client.PostAsJsonAsync("/api/accounts", new { name, type, startingBalance });
        response.EnsureSuccessStatusCode();
    }
}
