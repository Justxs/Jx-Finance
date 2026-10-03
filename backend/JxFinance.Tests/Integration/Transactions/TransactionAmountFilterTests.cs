using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<LedgerCollection>]
public sealed class TransactionAmountFilterTests(LedgerFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task The_amount_range_keeps_rows_by_the_size_of_their_amount_and_the_totals_and_export_follow()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var purchase = await CreateTransactionAsync(member, account, food, "expense", "49.00", "2026-04-02", "Maxima");
        await CreateTransactionAsync(member, account, food, "expense", "48.99", "2026-04-03", "Rimi");
        await CreateTransactionAsync(member, account, food, "expense", "50.01", "2026-04-04", "Iki");
        await CreateTransactionAsync(member, account, null, "income", "50.00", "2026-04-05", "Refund from a friend");
        await PostAsync<TransactionDto>(
            member,
            "/api/transactions",
            new { accountId = account, categoryId = food, type = "expense", amount = "-49.50", date = "2026-04-06", description = "Maxima refund", refundOfTransactionId = purchase.Id });
        const string range = "amountMin=49&amountMax=50";

        var list = (await member.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?pageSize=50&{range}", TestContext.Current.CancellationToken))!;
        var summary = (await member.GetFromJsonAsync<SummaryDto>($"/api/transactions/summary?{range}", TestContext.Current.CancellationToken))!;
        var csv = await member.GetStringAsync($"/api/transactions/export?{range}", TestContext.Current.CancellationToken);

        Assert.Equal(["Maxima refund", "Refund from a friend", "Maxima"], list.Items.Select(t => t.Description));
        Assert.Equal(3, summary.Count);
        Assert.Equal(4, csv.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length);
    }

    [Fact]
    public async Task One_bound_alone_filters_from_that_side()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "5.00", "2026-04-02", "Small");
        await CreateTransactionAsync(member, account, null, "expense", "500.00", "2026-04-03", "Large");

        var atLeast = (await member.GetFromJsonAsync<PageDto<TransactionDto>>("/api/transactions?amountMin=100", TestContext.Current.CancellationToken))!;
        var atMost = (await member.GetFromJsonAsync<PageDto<TransactionDto>>("/api/transactions?amountMax=5", TestContext.Current.CancellationToken))!;

        Assert.Equal(["Large"], atLeast.Items.Select(t => t.Description));
        Assert.Equal(["Small"], atMost.Items.Select(t => t.Description));
    }

    [Theory]
    [InlineData("amountMin=-1", "amountMin")]
    [InlineData("amountMax=1.001", "amountMax")]
    [InlineData("amountMin=20&amountMax=10", "amountMax")]
    public async Task An_invalid_amount_range_is_rejected(string query, string field)
    {
        using var member = await CreateUserClientAsync();

        var response = await member.GetAsync($"/api/transactions?{query}", TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, field);
    }

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);
}
