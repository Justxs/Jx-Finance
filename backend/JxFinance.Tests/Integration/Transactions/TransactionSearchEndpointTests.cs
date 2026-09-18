using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class TransactionSearchEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Filters_by_search_text_type_category_and_date_range()
    {
        var accountResponse = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = $"Search test {Guid.NewGuid():N}", type = "cash", startingBalance = "1000.00" });
        var account = await accountResponse.Content.ReadFromJsonAsync<AccountDto>();

        var categoryResponse = await Client.PostAsJsonAsync(
            "/api/categories",
            new { name = $"Search cat {Guid.NewGuid():N}", type = "expense" });
        var category = await categoryResponse.Content.ReadFromJsonAsync<CategoryDto>();

        var marker = Guid.NewGuid().ToString("N")[..8];

        await CreateTransactionAsync(account!.Id, category!.Id, "expense", "12.00", "2026-05-01", $"Lidl {marker}");
        await CreateTransactionAsync(account.Id, null, "income", "500.00", "2026-06-15", $"Salary {marker}");
        await CreateTransactionAsync(account.Id, category.Id, "expense", "7.50", "2026-07-01", $"Pharmacy {marker}");

        var searchResults = await Client.GetFromJsonAsync<PagedDto>(
            $"/api/transactions?search={Uri.EscapeDataString(marker)}&pageSize=50");
        Assert.Equal(3, searchResults!.Total);

        var typeResults = await Client.GetFromJsonAsync<PagedDto>(
            $"/api/transactions?search={Uri.EscapeDataString(marker)}&type=income&pageSize=50");
        Assert.Equal(1, typeResults!.Total);

        var categoryResults = await Client.GetFromJsonAsync<PagedDto>(
            $"/api/transactions?search={Uri.EscapeDataString(marker)}&categoryId={category.Id}&pageSize=50");
        Assert.Equal(2, categoryResults!.Total);

        var dateRangeResults = await Client.GetFromJsonAsync<PagedDto>(
            $"/api/transactions?search={Uri.EscapeDataString(marker)}&dateFrom=2026-06-01&dateTo=2026-06-30&pageSize=50");
        Assert.Equal(1, dateRangeResults!.Total);
    }

    private async Task CreateTransactionAsync(
        Guid accountId,
        Guid? categoryId,
        string type,
        string amount,
        string date,
        string description)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId, categoryId, type, amount, date, description });
        response.EnsureSuccessStatusCode();
    }

    private sealed record AccountDto(Guid Id);

    private sealed record CategoryDto(Guid Id);

    private sealed record PagedDto(int Total);
}
