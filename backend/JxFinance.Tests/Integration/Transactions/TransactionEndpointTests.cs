using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection(IntegrationCollection.Name)]
public sealed class TransactionEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_update_and_delete_a_transaction()
    {
        var account = await CreateAccountAsync("Tx CRUD");

        var createResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account.Id,
                type = "expense",
                amount = "15.77",
                date = "2026-06-02",
                description = "Lidl",
            });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<TransactionDto>();
        Assert.Equal("15.77", created!.Amount);
        Assert.Equal("expense", created.Type);
        Assert.Equal("manual", created.Source);
        Assert.Equal(new DateOnly(2026, 6, 2), created.Date);
        Assert.False(created.IsSplit);

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/transactions/{created.Id}",
            new
            {
                accountId = account.Id,
                type = "expense",
                amount = "18.20",
                date = "2026-06-03",
                description = "Lidl fixed",
            });
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<TransactionDto>();
        Assert.Equal("18.20", updated!.Amount);
        Assert.Equal(new DateOnly(2026, 6, 3), updated.Date);

        var deleteResponse = await Client.DeleteAsync($"/api/transactions/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await Client.GetAsync($"/api/transactions/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);
    }

    [Fact]
    public async Task List_is_paged_and_filterable_by_account()
    {
        var account = await CreateAccountAsync("Tx paging");
        for (var i = 1; i <= 3; i++)
        {
            var response = await Client.PostAsJsonAsync(
                "/api/transactions",
                new
                {
                    accountId = account.Id,
                    type = "expense",
                    amount = $"{i}.00",
                    date = $"2026-06-0{i}",
                });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        var page = await Client.GetFromJsonAsync<PagedDto<TransactionDto>>(
            $"/api/transactions?accountId={account.Id}&page=1&pageSize=2");

        Assert.Equal(3, page!.Total);
        Assert.Equal(2, page.Items.Count);
        Assert.Equal("3.00", page.Items[0].Amount);
        Assert.Equal("2.00", page.Items[1].Amount);
    }

    [Fact]
    public async Task Create_rejects_invalid_payloads()
    {
        var account = await CreateAccountAsync("Tx validation");

        var zeroAmount = await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = account.Id, type = "expense", amount = "0", date = "2026-06-02" });
        Assert.Equal(HttpStatusCode.BadRequest, zeroAmount.StatusCode);

        var unknownAccount = await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = Guid.NewGuid(), type = "expense", amount = "5.00", date = "2026-06-02" });
        Assert.Equal(HttpStatusCode.BadRequest, unknownAccount.StatusCode);

        var incomeCategoryResponse = await Client.PostAsJsonAsync(
            "/api/categories",
            new { name = $"Income only {Guid.NewGuid():N}", type = "income" });
        var incomeCategory = await incomeCategoryResponse.Content.ReadFromJsonAsync<CategoryDto>();

        var mismatchedCategory = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account.Id,
                categoryId = incomeCategory!.Id,
                type = "expense",
                amount = "5.00",
                date = "2026-06-02",
            });
        Assert.Equal(HttpStatusCode.BadRequest, mismatchedCategory.StatusCode);
    }

    private async Task<AccountDto> CreateAccountAsync(string name)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name, type = "checking", startingBalance = "0.00" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AccountDto>())!;
    }

    private sealed record AccountDto(Guid Id);

    private sealed record CategoryDto(Guid Id);

    private sealed record TransactionDto(
        Guid Id,
        Guid AccountId,
        Guid? CategoryId,
        string Type,
        string Amount,
        DateOnly Date,
        string? Description,
        string Source,
        bool IsSplit);

    private sealed record PagedDto<T>(List<T> Items, int Page, int PageSize, int Total);
}
