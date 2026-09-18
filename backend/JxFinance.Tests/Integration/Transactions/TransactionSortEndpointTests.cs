using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class TransactionSortEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Sorts_by_amount_and_description_in_both_directions()
    {
        var accountResponse = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = $"Sort test {Guid.NewGuid():N}", type = "cash", startingBalance = "0.00" });
        var account = await accountResponse.Content.ReadFromJsonAsync<AccountDto>();

        var marker = Guid.NewGuid().ToString("N")[..8];
        await CreateTransactionAsync(account!.Id, "expense", "30.00", "2026-05-01", $"Cherry {marker}");
        await CreateTransactionAsync(account.Id, "expense", "10.00", "2026-05-02", $"Apple {marker}");
        await CreateTransactionAsync(account.Id, "expense", "20.00", "2026-05-03", $"Banana {marker}");

        var query = $"/api/transactions?search={Uri.EscapeDataString(marker)}&pageSize=50";

        var byAmountAsc = await Client.GetFromJsonAsync<PagedDto>($"{query}&sort=amount&direction=asc");
        Assert.Equal(["10.00", "20.00", "30.00"], byAmountAsc!.Items.Select(i => i.Amount));

        var byAmountDesc = await Client.GetFromJsonAsync<PagedDto>($"{query}&sort=amount&direction=desc");
        Assert.Equal(["30.00", "20.00", "10.00"], byAmountDesc!.Items.Select(i => i.Amount));

        var byDescription = await Client.GetFromJsonAsync<PagedDto>($"{query}&sort=description&direction=asc");
        Assert.Equal(
            [$"Apple {marker}", $"Banana {marker}", $"Cherry {marker}"],
            byDescription!.Items.Select(i => i.Description));
    }

    [Fact]
    public async Task Defaults_to_newest_first_when_no_sort_is_given()
    {
        var accountResponse = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = $"Default sort {Guid.NewGuid():N}", type = "cash", startingBalance = "0.00" });
        var account = await accountResponse.Content.ReadFromJsonAsync<AccountDto>();

        var marker = Guid.NewGuid().ToString("N")[..8];
        await CreateTransactionAsync(account!.Id, "expense", "1.00", "2026-01-01", $"Older {marker}");
        await CreateTransactionAsync(account.Id, "expense", "2.00", "2026-03-01", $"Newer {marker}");

        var results = await Client.GetFromJsonAsync<PagedDto>(
            $"/api/transactions?search={Uri.EscapeDataString(marker)}&pageSize=50");

        Assert.Equal([$"Newer {marker}", $"Older {marker}"], results!.Items.Select(i => i.Description));
    }

    private async Task CreateTransactionAsync(
        Guid accountId,
        string type,
        string amount,
        string date,
        string description)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId, type, amount, date, description });
        response.EnsureSuccessStatusCode();
    }

    private sealed record AccountDto(Guid Id);

    private sealed record TransactionDto(string Amount, string Description);

    private sealed record PagedDto(List<TransactionDto> Items);
}
