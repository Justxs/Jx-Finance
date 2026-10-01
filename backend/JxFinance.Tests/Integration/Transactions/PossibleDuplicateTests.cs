using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.Transactions;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class PossibleDuplicateTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Range = "dateFrom=2026-05-01&dateTo=2026-05-31";

    [Fact]
    public async Task Rows_on_one_account_with_the_same_amount_and_payee_within_three_days_are_listed()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var other = await CreateAccountAsync("1000.00", client: member);
        var typed = await CreateTransactionAsync(member, account, null, "expense", "12.50", "2026-05-03", "Maxima");
        var imported = await CreateTransactionAsync(member, account, null, "expense", "12.50", "2026-05-06", "MAXIMA 20260506");
        await CreateTransactionAsync(member, account, null, "expense", "12.50", "2026-05-10", "Maxima");
        await CreateTransactionAsync(member, account, null, "expense", "12.60", "2026-05-03", "Maxima");
        await CreateTransactionAsync(member, account, null, "income", "12.50", "2026-05-03", "Maxima");
        await CreateTransactionAsync(member, other, null, "expense", "12.50", "2026-05-04", "Maxima");

        var list = await ListAsync(member, $"{Range}&duplicates=true");
        var summary = await member.GetFromJsonAsync<SummaryDto>(
            $"/api/transactions/summary?{Range}&duplicates=true",
            TestContext.Current.CancellationToken);
        var csv = await member.GetStringAsync($"/api/transactions/export?{Range}&duplicates=true", TestContext.Current.CancellationToken);

        Assert.Equal([imported.Id, typed.Id], list.Items.Select(t => t.Id));
        Assert.Equal(2, summary!.Count);
        Assert.Equal(2, csv.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length - 1);
    }

    [Fact]
    public async Task Rows_without_a_payee_key_pair_by_their_trimmed_description()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var first = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2026-05-12", "1234");
        var second = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2026-05-13", " 1234 ");
        await CreateTransactionAsync(member, account, null, "expense", "40.00", "2026-05-13", "5678");

        var list = await ListAsync(member, $"{Range}&duplicates=true");

        Assert.Equal(new[] { first.Id, second.Id }.Order(), list.Items.Select(t => t.Id).Order());
    }

    [Fact]
    public async Task Refunds_and_rows_imported_together_are_not_duplicates()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "-8.00", "2026-05-14", "Senukai");
        await CreateTransactionAsync(member, account, null, "expense", "-8.00", "2026-05-15", "Senukai");
        var coffee = await CreateTransactionAsync(member, account, null, "expense", "2.20", "2026-05-20", "Caffeine");
        var second = await CreateTransactionAsync(member, account, null, "expense", "2.20", "2026-05-20", "Caffeine");
        await MarkImportedTogetherAsync(coffee.Id, second.Id);

        var list = await ListAsync(member, $"{Range}&duplicates=true");

        Assert.Empty(list.Items);
    }

    [Fact]
    public async Task Keep_both_stops_offering_the_pair()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var first = await CreateTransactionAsync(member, account, null, "expense", "15.00", "2026-05-08", "Bolt");
        await CreateTransactionAsync(member, account, null, "expense", "15.00", "2026-05-08", "Bolt");

        var kept = await member.PostAsync($"/api/transactions/{first.Id}/duplicates/keep", null, TestContext.Current.CancellationToken);
        var again = await member.PostAsync($"/api/transactions/{first.Id}/duplicates/keep", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, kept.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Empty((await ListAsync(member, $"{Range}&duplicates=true")).Items);
        Assert.Equal(1, await WithDbAsync(db => db.DuplicateDismissals.CountAsync(
            d => d.TransactionId == new TransactionId(first.Id) || d.OtherTransactionId == new TransactionId(first.Id),
            TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Keep_both_on_a_row_nobody_can_see_answers_not_found()
    {
        using var owner = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: owner);
        var row = await CreateTransactionAsync(owner, account, null, "expense", "15.00", "2026-05-08", "Bolt");

        var response = await stranger.PostAsync($"/api/transactions/{row.Id}/duplicates/keep", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Deleting_one_row_ends_the_pair_and_restoring_it_brings_it_back()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var first = await CreateTransactionAsync(member, account, null, "expense", "9.99", "2026-05-01", "Netflix");
        var second = await CreateTransactionAsync(member, account, null, "expense", "9.99", "2026-05-02", "Netflix");

        (await member.DeleteAsync($"/api/transactions/{second.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var afterDelete = await ListAsync(member, $"{Range}&duplicates=true");
        (await member.PostAsJsonAsync(
            "/api/trash/restore",
            new { kind = "transaction", entityId = second.Id },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var afterRestore = await ListAsync(member, $"{Range}&duplicates=true");

        Assert.Empty(afterDelete.Items);
        Assert.Equal(new[] { first.Id, second.Id }.Order(), afterRestore.Items.Select(t => t.Id).Order());
    }

    [Fact]
    public async Task A_pair_kept_by_one_household_member_is_kept_for_the_other()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync("1000.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var first = await CreateTransactionAsync(pair.OwnerClient, account, null, "expense", "60.00", "2026-05-18", "Circle K");
        await CreateTransactionAsync(pair.PartnerClient, account, null, "expense", "60.00", "2026-05-19", "Circle K");
        var before = await ListAsync(pair.OwnerClient, $"{Range}&duplicates=true");

        (await pair.PartnerClient.PostAsync($"/api/transactions/{first.Id}/duplicates/keep", null, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        Assert.Equal(2, before.Total);
        Assert.Empty((await ListAsync(pair.OwnerClient, $"{Range}&duplicates=true")).Items);
    }

    private Task MarkImportedTogetherAsync(Guid first, Guid second)
    {
        var ids = new[] { new TransactionId(first), new TransactionId(second) };
        var stamp = DateTimeOffset.UtcNow;
        return WithDbAsync(db => db.Transactions.IgnoreQueryFilters()
            .Where(t => ids.Contains(t.Id))
            .ExecuteUpdateAsync(
                s => s.SetProperty(t => t.Source, TransactionSource.Imported).SetProperty(t => t.CreatedAt, stamp),
                TestContext.Current.CancellationToken));
    }

    private static async Task<PageDto<TransactionDto>> ListAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?pageSize=50&{query}", TestContext.Current.CancellationToken))!;

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);
}
