using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Data;

[Collection<DataCollection>]
public sealed class PayeeKeyBackfillTests(DataFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Rows_without_a_key_get_one_deleted_rows_included_and_their_UpdatedAt_stays()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var kept = await CreateTransactionAsync(member, account, null, "expense", "5.00", "2026-04-02", "Lidl 0042");
        var removed = await CreateTransactionAsync(member, account, null, "expense", "6.00", "2026-04-03", "Rimi, Vilnius");
        var blank = await CreateTransactionAsync(member, account, null, "expense", "7.00", "2026-04-04");
        (await member.DeleteAsync($"/api/transactions/{removed.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var ids = new[] { kept.Id, removed.Id, blank.Id };
        await SqlAsync($"""UPDATE "Transactions" SET "PayeeKey" = NULL WHERE "Id" = ANY({ids})""");
        var before = await RowsAsync(ids);

        var filled = await WithDbAsync(db => PayeeKeyBackfill.RunAsync(db, TestContext.Current.CancellationToken));

        var after = await RowsAsync(ids);
        Assert.True(filled >= ids.Length);
        Assert.All(before.Values, row => Assert.Null(row.PayeeKey));
        Assert.Equal(
            [(kept.Id, "lidl"), (removed.Id, "rimi vilnius"), (blank.Id, "")],
            ids.Select(id => (id, after[id].PayeeKey)));
        Assert.Equal(ids.Select(id => before[id].UpdatedAt), ids.Select(id => after[id].UpdatedAt));
    }

    private Task<Dictionary<Guid, Row>> RowsAsync(Guid[] ids)
    {
        var typed = ids.Select(id => new TransactionId(id)).ToList();
        return WithDbAsync(db => db.Transactions
            .IgnoreQueryFilters()
            .Where(t => typed.Contains(t.Id))
            .Select(t => new Row(t.Id.Value, t.PayeeKey, t.UpdatedAt))
            .ToDictionaryAsync(row => row.Id, TestContext.Current.CancellationToken));
    }

    private sealed record Row(Guid Id, string? PayeeKey, DateTimeOffset UpdatedAt);
}
