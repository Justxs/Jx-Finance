using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Categories;

[Collection(IntegrationCollection.Name)]
public sealed class CategoryEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Starter_categories_are_seeded_with_icons()
    {
        var categories = await Client.GetFromJsonAsync<List<CategoryDto>>("/api/categories");

        Assert.Contains(
            categories!,
            c => c is { Name: "Food", Type: "expense", Icon: "utensils", IsDefault: true });
        Assert.Contains(
            categories!,
            c => c is { Name: "Salary", Type: "income", Icon: "banknote", IsDefault: true });
    }

    [Fact]
    public async Task Create_and_rename_a_category_with_an_icon()
    {
        var createResponse = await Client.PostAsJsonAsync(
            "/api/categories",
            new { name = "Pets", type = "expense", icon = "paw-print" });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryDto>();
        Assert.False(created!.IsDefault);
        Assert.Equal("paw-print", created.Icon);

        var renameResponse = await Client.PutAsJsonAsync(
            $"/api/categories/{created.Id}",
            new { name = "Pets & vet", icon = "dog" });
        renameResponse.EnsureSuccessStatusCode();
        var renamed = await renameResponse.Content.ReadFromJsonAsync<CategoryDto>();
        Assert.Equal("Pets & vet", renamed!.Name);
        Assert.Equal("dog", renamed.Icon);
        Assert.Equal("expense", renamed.Type);
    }

    [Fact]
    public async Task Deleting_a_category_uncategorizes_its_transactions()
    {
        var accountResponse = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = "Category delete test", type = "cash", startingBalance = "0.00" });
        var account = await accountResponse.Content.ReadFromJsonAsync<AccountDto>();

        var categoryResponse = await Client.PostAsJsonAsync(
            "/api/categories",
            new { name = "Doomed", type = "expense" });
        var category = await categoryResponse.Content.ReadFromJsonAsync<CategoryDto>();

        var transactionResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account!.Id,
                categoryId = category!.Id,
                type = "expense",
                amount = "9.99",
                date = "2026-06-02",
            });
        Assert.Equal(HttpStatusCode.Created, transactionResponse.StatusCode);
        var transaction = await transactionResponse.Content.ReadFromJsonAsync<TransactionDto>();
        Assert.Equal(category.Id, transaction!.CategoryId);

        var deleteResponse = await Client.DeleteAsync($"/api/categories/{category.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{transaction.Id}");
        Assert.Null(afterDelete!.CategoryId);

        var categories = await Client.GetFromJsonAsync<List<CategoryDto>>("/api/categories");
        Assert.DoesNotContain(categories!, c => c.Id == category.Id);
    }

    private sealed record CategoryDto(Guid Id, string Name, string Type, string? Icon, bool IsDefault);

    private sealed record AccountDto(Guid Id);

    private sealed record TransactionDto(Guid Id, Guid? CategoryId);
}
