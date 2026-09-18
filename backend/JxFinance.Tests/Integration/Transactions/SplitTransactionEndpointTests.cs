using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class SplitTransactionEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_a_split_transaction_and_read_back_its_lines()
    {
        var account = await CreateAccountAsync();
        var food = await CreateCategoryAsync("Split Food", "expense");
        var clothes = await CreateCategoryAsync("Split Clothes", "expense");

        var createResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account.Id,
                type = "expense",
                amount = "50.00",
                date = "2026-06-05",
                lines = new object[]
                {
                    new { categoryId = food.Id, amount = "30.00", description = "Food" },
                    new { categoryId = clothes.Id, amount = "20.00", description = "Clothes" },
                },
            });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<TransactionDto>();
        Assert.True(created!.IsSplit);
        Assert.Null(created.CategoryId);
        Assert.Equal(2, created.Lines!.Count);

        var fetched = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{created.Id}");
        Assert.True(fetched!.IsSplit);
        Assert.Equal(2, fetched.Lines!.Count);
    }

    [Fact]
    public async Task Create_rejects_lines_that_do_not_sum_to_the_total()
    {
        var account = await CreateAccountAsync();

        var response = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account.Id,
                type = "expense",
                amount = "50.00",
                date = "2026-06-05",
                lines = new object[]
                {
                    new { amount = "10.00" },
                    new { amount = "10.00" },
                },
            });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Editing_a_split_replaces_its_line_set()
    {
        var account = await CreateAccountAsync();
        var categoryA = await CreateCategoryAsync("Replace A", "expense");
        var categoryB = await CreateCategoryAsync("Replace B", "expense");

        var createResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account.Id,
                type = "expense",
                amount = "40.00",
                date = "2026-06-06",
                lines = new object[] { new { categoryId = categoryA.Id, amount = "40.00" } },
            });
        var created = await createResponse.Content.ReadFromJsonAsync<TransactionDto>();
        var firstLineId = created!.Lines![0].Id;

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/transactions/{created.Id}",
            new
            {
                accountId = account.Id,
                type = "expense",
                amount = "40.00",
                date = "2026-06-06",
                lines = new object[]
                {
                    new { categoryId = categoryB.Id, amount = "15.00" },
                    new { categoryId = categoryB.Id, amount = "25.00" },
                },
            });
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<TransactionDto>();

        Assert.Equal(2, updated!.Lines!.Count);
        Assert.DoesNotContain(updated.Lines, l => l.Id == firstLineId);
    }

    [Fact]
    public async Task Unsplitting_a_transaction_removes_its_lines()
    {
        var account = await CreateAccountAsync();
        var category = await CreateCategoryAsync("Unsplit Cat", "expense");

        var createResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account.Id,
                type = "expense",
                amount = "20.00",
                date = "2026-06-07",
                lines = new object[] { new { categoryId = category.Id, amount = "20.00" } },
            });
        var created = await createResponse.Content.ReadFromJsonAsync<TransactionDto>();

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/transactions/{created!.Id}",
            new
            {
                accountId = account.Id,
                categoryId = category.Id,
                type = "expense",
                amount = "20.00",
                date = "2026-06-07",
                lines = Array.Empty<object>(),
            });
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<TransactionDto>();

        Assert.False(updated!.IsSplit);
        Assert.Null(updated.Lines);
    }

    private async Task<AccountDto> CreateAccountAsync()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = $"Split test {Guid.NewGuid():N}", type = "cash", startingBalance = "1000.00" });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AccountDto>())!;
    }

    private async Task<CategoryDto> CreateCategoryAsync(string name, string type)
    {
        var response = await Client.PostAsJsonAsync("/api/categories", new { name = $"{name} {Guid.NewGuid():N}", type });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CategoryDto>())!;
    }

    private sealed record AccountDto(Guid Id);

    private sealed record CategoryDto(Guid Id);

    private sealed record TransactionLineDto(Guid Id, Guid? CategoryId, string Amount, string? Description);

    private sealed record TransactionDto(Guid Id, Guid? CategoryId, bool IsSplit, List<TransactionLineDto>? Lines);
}
