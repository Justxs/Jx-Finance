using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class TransactionSearchEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Filters_by_search_text_type_category_and_date_range()
    {
        var account = await CreateAccountAsync();
        var category = await CreateCategoryAsync();

        var marker = Guid.NewGuid().ToString("N")[..8];

        await CreateTransactionAsync(Client, account, category, "expense", "12.00", "2026-05-01", $"Lidl {marker}");
        await CreateTransactionAsync(Client, account, null, "income", "500.00", "2026-06-15", $"Salary {marker}");
        await CreateTransactionAsync(Client, account, category, "expense", "7.50", "2026-07-01", $"Pharmacy {marker}");

        var searchResults = await Client.GetFromJsonAsync<PageDto<TransactionDto>>(
            $"/api/transactions?search={Uri.EscapeDataString(marker)}&pageSize=50");
        Assert.Equal(3, searchResults!.Total);

        var typeResults = await Client.GetFromJsonAsync<PageDto<TransactionDto>>(
            $"/api/transactions?search={Uri.EscapeDataString(marker)}&type=income&pageSize=50");
        Assert.Equal(1, typeResults!.Total);

        var categoryResults = await Client.GetFromJsonAsync<PageDto<TransactionDto>>(
            $"/api/transactions?search={Uri.EscapeDataString(marker)}&categoryId={category}&pageSize=50");
        Assert.Equal(2, categoryResults!.Total);

        var dateRangeResults = await Client.GetFromJsonAsync<PageDto<TransactionDto>>(
            $"/api/transactions?search={Uri.EscapeDataString(marker)}&dateFrom=2026-06-01&dateTo=2026-06-30&pageSize=50");
        Assert.Equal(1, dateRangeResults!.Total);
    }

    [Fact]
    public async Task Search_ignores_case()
    {
        var account = await CreateAccountAsync();
        var marker = Guid.NewGuid().ToString("N")[..8];
        await CreateTransactionAsync(Client, account, null, "expense", "12.00", "2026-05-01", $"Maxima {marker} Vilnius");

        var results = await Client.GetFromJsonAsync<PageDto<TransactionDto>>(
            $"/api/transactions?search={Uri.EscapeDataString($"MAXIMA {marker.ToUpperInvariant()} vil")}&pageSize=50");

        Assert.Equal(1, results!.Total);
    }

    [Theory]
    [InlineData("%")]
    [InlineData("_")]
    [InlineData("\\")]
    public async Task Search_treats_pattern_characters_as_text(string special)
    {
        var account = await CreateAccountAsync();
        var marker = Guid.NewGuid().ToString("N")[..8];
        await CreateTransactionAsync(Client, account, null, "expense", "12.00", "2026-05-01", $"{marker}{special}end");
        await CreateTransactionAsync(Client, account, null, "expense", "12.00", "2026-05-01", $"{marker}Xend");

        var results = await Client.GetFromJsonAsync<PageDto<TransactionDto>>(
            $"/api/transactions?search={Uri.EscapeDataString($"{marker}{special}end")}&pageSize=50");

        Assert.Equal(1, results!.Total);
    }
}
