using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Categories;

[Collection<IntegrationCollection>]
public sealed class CategoryEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Starter_categories_are_seeded_with_icons()
    {
        var categories = await Client.GetFromJsonAsync<List<CategoryDto>>("/api/categories", TestContext.Current.CancellationToken);

        Assert.Contains(
            categories!,
            c => c is { Name: "Food", Type: "expense", Icon: "utensils", IsDefault: true });
        Assert.Contains(
            categories!,
            c => c is { Name: "Salary", Type: "income", Icon: "banknote", IsDefault: true });
    }

    [Fact]
    public async Task New_users_start_with_their_own_starter_categories()
    {
        using var member = await CreateUserClientAsync();

        var categories = await member.GetFromJsonAsync<List<CategoryDto>>("/api/categories", TestContext.Current.CancellationToken);

        Assert.Equal(10, categories!.Count);
        Assert.All(categories, c => Assert.True(c.IsDefault));
    }

    [Fact]
    public async Task Create_and_rename_a_category_with_an_icon()
    {
        var createResponse = await Client.PostAsJsonAsync(
            "/api/categories",
            new { name = $"Pets {Guid.NewGuid():N}", type = "expense", icon = "paw-print" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryDto>(TestContext.Current.CancellationToken);
        Assert.False(created!.IsDefault);
        Assert.Equal("paw-print", created.Icon);

        var renameResponse = await Client.PutAsJsonAsync(
            $"/api/categories/{created.Id}",
            new { name = "Pets & vet", icon = "dog" }, TestContext.Current.CancellationToken);
        renameResponse.EnsureSuccessStatusCode();
        var renamed = await renameResponse.Content.ReadFromJsonAsync<CategoryDto>(TestContext.Current.CancellationToken);
        Assert.Equal("Pets & vet", renamed!.Name);
        Assert.Equal("dog", renamed.Icon);
        Assert.Equal("expense", renamed.Type);
    }

    [Fact]
    public async Task Deleting_a_category_uncategorizes_its_transactions()
    {
        var account = await CreateAccountAsync();
        var category = await CreateCategoryAsync();
        var transaction = await PostAsync<TransactionDto>(
            Client,
            "/api/transactions",
            new { accountId = account, categoryId = category, type = "expense", amount = "9.99", date = "2026-06-02" });
        Assert.Equal(category, transaction.CategoryId);

        var deleteResponse = await Client.DeleteAsync($"/api/categories/{category}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);
        Assert.Null(afterDelete!.CategoryId);

        var categories = await Client.GetFromJsonAsync<List<CategoryDto>>("/api/categories", TestContext.Current.CancellationToken);
        Assert.DoesNotContain(categories!, c => c.Id == category);
    }

    private sealed record CategoryDto(Guid Id, string Name, string Type, string? Icon, bool IsDefault);
}
