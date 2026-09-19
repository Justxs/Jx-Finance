using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class TransactionSummaryAndBulkCategoryEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Summary_matches_the_list_under_every_filter_and_ignores_invisible_data()
    {
        using var member = await CreateUserClientAsync();
        var main = await CreateAccountAsync("1000.00", client: member);
        var side = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var clothes = await CreateCategoryAsync(client: member);
        var salary = await CreateCategoryAsync("income", member);

        await CreateTransactionAsync(member, main, food, "expense", "10.00", "2026-03-01", "Coffee beans");
        await CreateTransactionAsync(member, main, salary, "income", "1000.00", "2026-03-05", "March pay");
        await CreateTransactionAsync(member, side, clothes, "expense", "25.50", "2026-04-01", "Socks");
        var splitResponse = await member.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = main,
                type = "expense",
                amount = "50.00",
                date = "2026-04-10",
                description = "Market run",
                lines = new object[]
                {
                    new { categoryId = food, amount = "30.00" },
                    new { categoryId = clothes, amount = "20.00" },
                },
            });
        splitResponse.EnsureSuccessStatusCode();

        var foreignAccount = await CreateAccountAsync("1000.00");
        var foreignCategory = await CreateCategoryAsync();
        await CreateTransactionAsync(Client, foreignAccount, foreignCategory, "expense", "999.00", "2026-03-01", "Coffee beans");

        var filters = new[]
        {
            "",
            $"accountId={main}",
            $"accountId={side}",
            $"categoryId={food}",
            $"categoryId={clothes}",
            $"categoryId={foreignCategory}",
            "type=income",
            "type=expense",
            "search=Coffee",
            "dateFrom=2026-04-01",
            "dateTo=2026-03-31",
            "dateFrom=2026-03-02&dateTo=2026-04-05",
            $"accountId={main}&categoryId={food}&type=expense&dateFrom=2026-04-01",
        };

        foreach (var filter in filters)
        {
            var page = await member.GetFromJsonAsync<PageDto>($"/api/transactions?pageSize=200&{filter}");
            var summary = await member.GetFromJsonAsync<SummaryDto>($"/api/transactions/summary?{filter}");

            Assert.Equal(page!.Total, summary!.Count);
            Assert.Equal(Total(page.Items, "income"), summary.TotalIncome);
            Assert.Equal(Total(page.Items, "expense"), summary.TotalExpense);
        }

        var everything = await member.GetFromJsonAsync<SummaryDto>("/api/transactions/summary");
        Assert.Equal(new SummaryDto(4, "1000.00", "85.50"), everything);

        var foodOnly = await member.GetFromJsonAsync<SummaryDto>($"/api/transactions/summary?categoryId={food}");
        Assert.Equal(new SummaryDto(2, "0.00", "60.00"), foodOnly);

        var nothing = await member.GetFromJsonAsync<SummaryDto>($"/api/transactions/summary?accountId={foreignAccount}");
        Assert.Equal(new SummaryDto(0, "0.00", "0.00"), nothing);
    }

    [Fact]
    public async Task Summary_excludes_transfers()
    {
        using var member = await CreateUserClientAsync();
        var from = await CreateAccountAsync("1000.00", client: member);
        var to = await CreateAccountAsync("1000.00", client: member);
        var transfer = await member.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = from, toAccountId = to, amount = "40.00", date = "2026-05-01" });
        transfer.EnsureSuccessStatusCode();

        var summary = await member.GetFromJsonAsync<SummaryDto>("/api/transactions/summary");

        Assert.Equal(new SummaryDto(0, "0.00", "0.00"), summary);
    }

    [Fact]
    public async Task Bulk_category_sets_and_clears_the_category()
    {
        var account = await CreateAccountAsync("1000.00");
        var category = await CreateCategoryAsync();
        var first = await CreateTransactionAsync(Client, account, null, "expense", "5.00", "2026-06-01", "Bulk one");
        var second = await CreateTransactionAsync(Client, account, null, "expense", "6.00", "2026-06-02", "Bulk two");

        var setResponse = await Client.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = new[] { first.Id, second.Id }, categoryId = category });
        setResponse.EnsureSuccessStatusCode();
        Assert.Equal(2, (await setResponse.Content.ReadFromJsonAsync<BulkDto>())!.Updated);
        Assert.Equal(category, (await GetTransactionAsync(first.Id)).CategoryId);
        Assert.Equal(category, (await GetTransactionAsync(second.Id)).CategoryId);

        var clearResponse = await Client.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = new[] { first.Id }, categoryId = (Guid?)null });
        clearResponse.EnsureSuccessStatusCode();
        Assert.Equal(1, (await clearResponse.Content.ReadFromJsonAsync<BulkDto>())!.Updated);
        Assert.Null((await GetTransactionAsync(first.Id)).CategoryId);
        Assert.Equal(category, (await GetTransactionAsync(second.Id)).CategoryId);
    }

    [Fact]
    public async Task Bulk_category_counts_repeated_ids_once()
    {
        var account = await CreateAccountAsync("1000.00");
        var category = await CreateCategoryAsync();
        var transaction = await CreateTransactionAsync(Client, account, null, "expense", "5.00", "2026-06-03", "Bulk dupe");

        var response = await Client.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = new[] { transaction.Id, transaction.Id, transaction.Id }, categoryId = category });

        response.EnsureSuccessStatusCode();
        Assert.Equal(1, (await response.Content.ReadFromJsonAsync<BulkDto>())!.Updated);
        Assert.Equal(category, (await GetTransactionAsync(transaction.Id)).CategoryId);
    }

    [Fact]
    public async Task Bulk_category_rejects_ids_the_caller_cannot_see_and_changes_nothing()
    {
        using var member = await CreateUserClientAsync();
        var memberAccount = await CreateAccountAsync("1000.00", client: member);
        var memberCategory = await CreateCategoryAsync(client: member);
        var own = await CreateTransactionAsync(member, memberAccount, null, "expense", "5.00", "2026-06-04", "Bulk own");
        var adminAccount = await CreateAccountAsync("1000.00");
        var foreign = await CreateTransactionAsync(Client, adminAccount, null, "expense", "7.00", "2026-06-04", "Bulk foreign");

        var invisible = await member.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = new[] { own.Id, foreign.Id }, categoryId = memberCategory });
        Assert.Equal(HttpStatusCode.NotFound, invisible.StatusCode);

        var missing = await member.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = new[] { own.Id, Guid.NewGuid() }, categoryId = memberCategory });
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

        var ownAfter = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{own.Id}");
        Assert.Null(ownAfter!.CategoryId);
        Assert.Null((await GetTransactionAsync(foreign.Id)).CategoryId);
    }

    [Fact]
    public async Task Bulk_category_rejects_a_category_the_caller_cannot_see()
    {
        using var member = await CreateUserClientAsync();
        var memberAccount = await CreateAccountAsync("1000.00", client: member);
        var own = await CreateTransactionAsync(member, memberAccount, null, "expense", "5.00", "2026-06-05", "Bulk hidden category");
        var adminCategory = await CreateCategoryAsync();

        var response = await member.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = new[] { own.Id }, categoryId = adminCategory });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Bulk_category_rejects_split_transactions_and_changes_nothing()
    {
        var account = await CreateAccountAsync("1000.00");
        var category = await CreateCategoryAsync();
        var plain = await CreateTransactionAsync(Client, account, null, "expense", "5.00", "2026-06-06", "Bulk plain");
        var splitResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "20.00",
                date = "2026-06-06",
                lines = new object[] { new { categoryId = category, amount = "20.00" } },
            });
        splitResponse.EnsureSuccessStatusCode();
        var split = await splitResponse.Content.ReadFromJsonAsync<TransactionDto>();

        var response = await Client.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = new[] { plain.Id, split!.Id }, categoryId = category });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Split transactions cannot be bulk-recategorized", await response.Content.ReadAsStringAsync());
        Assert.Null((await GetTransactionAsync(plain.Id)).CategoryId);
    }

    [Fact]
    public async Task Bulk_category_rejects_a_category_of_the_wrong_type_and_changes_nothing()
    {
        var account = await CreateAccountAsync("1000.00");
        var expenseCategory = await CreateCategoryAsync();
        var expense = await CreateTransactionAsync(Client, account, null, "expense", "5.00", "2026-06-07", "Bulk expense");
        var income = await CreateTransactionAsync(Client, account, null, "income", "8.00", "2026-06-07", "Bulk income");

        var response = await Client.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = new[] { expense.Id, income.Id }, categoryId = expenseCategory });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null((await GetTransactionAsync(expense.Id)).CategoryId);
        Assert.Null((await GetTransactionAsync(income.Id)).CategoryId);
    }

    [Fact]
    public async Task Bulk_category_rejects_empty_and_oversized_id_lists()
    {
        var empty = await Client.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = Array.Empty<Guid>(), categoryId = (Guid?)null });
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);

        var oversized = await Client.PostAsJsonAsync(
            "/api/transactions/bulk-category",
            new { transactionIds = Enumerable.Range(0, 201).Select(_ => Guid.NewGuid()).ToArray(), categoryId = (Guid?)null });
        Assert.Equal(HttpStatusCode.BadRequest, oversized.StatusCode);
    }

    private static string Total(IEnumerable<TransactionDto> items, string type) =>
        items
            .Where(t => string.Equals(t.Type, type, StringComparison.OrdinalIgnoreCase))
            .Sum(t => decimal.Parse(t.Amount, CultureInfo.InvariantCulture))
            .ToString("0.00", CultureInfo.InvariantCulture);

    private async Task<TransactionDto> GetTransactionAsync(Guid id) =>
        (await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{id}"))!;

    private static async Task<TransactionDto> CreateTransactionAsync(
        HttpClient client,
        Guid accountId,
        Guid? categoryId,
        string type,
        string amount,
        string date,
        string description)
    {
        var response = await client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId, categoryId, type, amount, date, description });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TransactionDto>())!;
    }

    private sealed record TransactionDto(Guid Id, Guid? CategoryId, string Type, string Amount, bool IsSplit);

    private sealed record PageDto(List<TransactionDto> Items, int Total);

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);

    private sealed record BulkDto(int Updated);
}
