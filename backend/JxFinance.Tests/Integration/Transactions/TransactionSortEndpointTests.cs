using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class TransactionSortEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Sorts_by_amount_and_description_in_both_directions()
    {
        var account = await CreateAccountAsync();

        var marker = Guid.NewGuid().ToString("N")[..8];
        await CreateTransactionAsync(Client, account, null, "expense", "30.00", "2026-05-01", $"Cherry {marker}");
        await CreateTransactionAsync(Client, account, null, "expense", "10.00", "2026-05-02", $"Apple {marker}");
        await CreateTransactionAsync(Client, account, null, "expense", "20.00", "2026-05-03", $"Banana {marker}");

        var query = $"/api/transactions?search={Uri.EscapeDataString(marker)}&pageSize=50";

        var byAmountAsc = await Client.GetFromJsonAsync<PageDto<TransactionDto>>($"{query}&sort=amount&direction=asc", TestContext.Current.CancellationToken);
        Assert.Equal(["10.00", "20.00", "30.00"], byAmountAsc!.Items.Select(i => i.Amount));

        var byAmountDesc = await Client.GetFromJsonAsync<PageDto<TransactionDto>>($"{query}&sort=amount&direction=desc", TestContext.Current.CancellationToken);
        Assert.Equal(["30.00", "20.00", "10.00"], byAmountDesc!.Items.Select(i => i.Amount));

        var byDescription = await Client.GetFromJsonAsync<PageDto<TransactionDto>>($"{query}&sort=description&direction=asc", TestContext.Current.CancellationToken);
        Assert.Equal(
            [$"Apple {marker}", $"Banana {marker}", $"Cherry {marker}"],
            byDescription!.Items.Select(i => i.Description));
    }

    [Fact]
    public async Task Defaults_to_newest_first_when_no_sort_is_given()
    {
        var account = await CreateAccountAsync();

        var marker = Guid.NewGuid().ToString("N")[..8];
        await CreateTransactionAsync(Client, account, null, "expense", "1.00", "2026-01-01", $"Older {marker}");
        await CreateTransactionAsync(Client, account, null, "expense", "2.00", "2026-03-01", $"Newer {marker}");

        var results = await Client.GetFromJsonAsync<PageDto<TransactionDto>>(
            $"/api/transactions?search={Uri.EscapeDataString(marker)}&pageSize=50", TestContext.Current.CancellationToken);

        Assert.Equal([$"Newer {marker}", $"Older {marker}"], results!.Items.Select(i => i.Description));
    }
}
