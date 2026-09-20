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
            $"/api/accounts?search={Uri.EscapeDataString(marker)}");
        Assert.Equal(3, byName!.Count);

        var byType = await Client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?search={Uri.EscapeDataString(marker)}&type=cash");
        Assert.Equal(2, byType!.Count);
        Assert.All(byType, a => Assert.Equal("cash", a.Type));

        var byBalanceDesc = await Client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?search={Uri.EscapeDataString(marker)}&sort=currentBalance&direction=desc");
        Assert.Equal(["300.00", "200.00", "100.00"], byBalanceDesc!.Select(a => a.CurrentBalance));

        var byNameAsc = await Client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?search={Uri.EscapeDataString(marker)}&sort=name&direction=asc");
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
            $"/api/accounts?search={Uri.EscapeDataString($"{marker} 100%_DONE")}");
        var wildcard = await Client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?search={Uri.EscapeDataString($"{marker}%done")}");

        Assert.Equal($"{marker} 100%_done", Assert.Single(literal!).Name);
        Assert.Empty(wildcard!);
    }

    private async Task CreateAsync(string name, string type, string startingBalance)
    {
        var response = await Client.PostAsJsonAsync("/api/accounts", new { name, type, startingBalance });
        response.EnsureSuccessStatusCode();
    }
}
