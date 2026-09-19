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
        var account = await CreateAccountAsync("1000.00");
        var food = await CreateCategoryAsync();
        var clothes = await CreateCategoryAsync();

        var createResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "50.00",
                date = "2026-06-05",
                lines = new object[]
                {
                    new { categoryId = food, amount = "30.00", description = "Food" },
                    new { categoryId = clothes, amount = "20.00", description = "Clothes" },
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
        var account = await CreateAccountAsync("1000.00");

        var response = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account,
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
        var account = await CreateAccountAsync("1000.00");
        var categoryA = await CreateCategoryAsync();
        var categoryB = await CreateCategoryAsync();

        var createResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "40.00",
                date = "2026-06-06",
                lines = new object[] { new { categoryId = categoryA, amount = "40.00" } },
            });
        var created = await createResponse.Content.ReadFromJsonAsync<TransactionDto>();
        var firstLineId = created!.Lines![0].Id;

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/transactions/{created.Id}",
            new
            {
                accountId = account,
                type = "expense",
                amount = "40.00",
                date = "2026-06-06",
                lines = new object[]
                {
                    new { categoryId = categoryB, amount = "15.00" },
                    new { categoryId = categoryB, amount = "25.00" },
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
        var account = await CreateAccountAsync("1000.00");
        var category = await CreateCategoryAsync();

        var createResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "20.00",
                date = "2026-06-07",
                lines = new object[] { new { categoryId = category, amount = "20.00" } },
            });
        var created = await createResponse.Content.ReadFromJsonAsync<TransactionDto>();

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/transactions/{created!.Id}",
            new
            {
                accountId = account,
                categoryId = category,
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

    private sealed record TransactionLineDto(Guid Id, Guid? CategoryId, string Amount, string? Description);

    private sealed record TransactionDto(Guid Id, Guid? CategoryId, bool IsSplit, List<TransactionLineDto>? Lines);
}
