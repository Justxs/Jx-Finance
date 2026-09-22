using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class TransactionEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_update_and_delete_a_transaction()
    {
        var account = await CreateAccountAsync();

        var createResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "15.77",
                date = "2026-06-02",
                description = "Lidl",
            }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<TransactionDto>(TestContext.Current.CancellationToken);
        Assert.Equal("15.77", created!.Amount);
        Assert.Equal("expense", created.Type);
        Assert.Equal("manual", created.Source);
        Assert.Equal(new DateOnly(2026, 6, 2), created.Date);
        Assert.False(created.IsSplit);

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/transactions/{created.Id}",
            new
            {
                accountId = account,
                type = "expense",
                amount = "18.20",
                date = "2026-06-03",
                description = "Lidl fixed",
            }, TestContext.Current.CancellationToken);
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<TransactionDto>(TestContext.Current.CancellationToken);
        Assert.Equal("18.20", updated!.Amount);
        Assert.Equal(new DateOnly(2026, 6, 3), updated.Date);

        var deleteResponse = await Client.DeleteAsync($"/api/transactions/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await Client.GetAsync($"/api/transactions/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);
    }

    [Fact]
    public async Task List_is_paged_and_filterable_by_account()
    {
        var account = await CreateAccountAsync();
        for (var i = 1; i <= 3; i++)
        {
            var response = await Client.PostAsJsonAsync(
                "/api/transactions",
                new
                {
                    accountId = account,
                    type = "expense",
                    amount = $"{i}.00",
                    date = $"2026-06-0{i}",
                }, TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        var page = await Client.GetFromJsonAsync<PageDto<TransactionDto>>(
            $"/api/transactions?accountId={account}&page=1&pageSize=2", TestContext.Current.CancellationToken);

        Assert.Equal(3, page!.Total);
        Assert.Equal(2, page.Items.Count);
        Assert.Equal("3.00", page.Items[0].Amount);
        Assert.Equal("2.00", page.Items[1].Amount);
    }

    [Fact]
    public async Task Create_rejects_a_zero_amount()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = await CreateAccountAsync(), type = "expense", amount = "0", date = "2026-06-02" }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "amount");
    }

    [Fact]
    public async Task Create_rejects_an_unknown_account()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = Guid.NewGuid(), type = "expense", amount = "5.00", date = "2026-06-02" }, TestContext.Current.CancellationToken);

        await AssertRejectedAsync(response, "Account does not exist.");
    }

    [Fact]
    public async Task Create_rejects_a_category_of_the_other_flow_type()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = await CreateAccountAsync(),
                categoryId = await CreateCategoryAsync("income"),
                type = "expense",
                amount = "5.00",
                date = "2026-06-02",
            }, TestContext.Current.CancellationToken);

        await AssertRejectedAsync(response, "Category type does not match the transaction type.");
    }

    [Fact]
    public async Task Export_returns_csv_with_account_and_category_names()
    {
        var accountName = $"Export account {Guid.NewGuid():N}";
        var account = await PostAsync<IdDto>(
            Client,
            "/api/accounts",
            new { name = accountName, type = "checking", startingBalance = "0.00" });
        var category = await CreateCategoryAsync();

        await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account.Id,
                categoryId = category,
                type = "expense",
                amount = "12.34",
                date = "2026-06-05",
                description = "Export me",
            }, TestContext.Current.CancellationToken);

        var response = await Client.GetAsync($"/api/transactions/export?accountId={account.Id}", TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);

        var csv = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Contains("Date,Description,Account,Category,Tags,Type,Amount", csv);
        Assert.Contains(accountName, csv);
        Assert.Contains("Export me", csv);
        Assert.Contains("12.34", csv);
    }

    [Theory]
    [InlineData("=HYPERLINK(\"http://x\")", "\"'=HYPERLINK(\"\"http://x\"\")\"")]
    [InlineData("+1+1", "'+1+1")]
    [InlineData("-2+3", "'-2+3")]
    [InlineData("@SUM(A1)", "'@SUM(A1)")]
    public async Task Export_neutralizes_spreadsheet_formulas_in_text_columns_only(string description, string expectedCell)
    {
        var account = await PostAsync<IdDto>(
            Client,
            "/api/accounts",
            new { name = $"=Formula account {Guid.NewGuid():N}", type = "checking", startingBalance = "0.00" });

        await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new { accountId = account.Id, type = "expense", amount = "12.34", date = "2026-06-05", description });

        var csv = await Client.GetStringAsync($"/api/transactions/export?accountId={account.Id}", TestContext.Current.CancellationToken);
        var row = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[1];

        Assert.StartsWith($"2026-06-05,{expectedCell},'=Formula account", row);
        Assert.EndsWith(",Expense,12.34,eur", row, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Export_pdf_returns_pdf_document()
    {
        var account = await CreateAccountAsync();

        await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "56.78",
                date = "2026-06-05",
                description = "Pdf me — ąčęėįšųūž",
            }, TestContext.Current.CancellationToken);

        var response = await Client.GetAsync($"/api/transactions/export/pdf?accountId={account}", TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);

        var pdf = await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken);
        Assert.Equal("%PDF-", System.Text.Encoding.ASCII.GetString(pdf, 0, 5));
    }
}
