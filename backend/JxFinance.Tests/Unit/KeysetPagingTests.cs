using JxFinance.Domain.Investments;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Unit;

public sealed class KeysetPagingTests
{
    [Fact]
    public async Task A_batch_of_transactions_compares_the_id_instead_of_skipping_rows()
    {
        await using var capture = new SqlCapture();
        var after = new TransactionId(Guid.NewGuid());

        await capture.Db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.Id > after)
            .OrderBy(t => t.Id)
            .Take(500)
            .ToListAsync(TestContext.Current.CancellationToken);

        var sql = capture.OnlyStatement;
        Assert.Contains("\"Id\" > @", sql, StringComparison.Ordinal);
        Assert.Contains("ORDER BY t.\"Id\"", sql, StringComparison.Ordinal);
        Assert.DoesNotContain("OFFSET", sql, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_batch_of_investment_entries_compares_the_id_too()
    {
        await using var capture = new SqlCapture();
        var after = new InvestmentTransactionId(Guid.NewGuid());

        await capture.Db.InvestmentTransactions
            .IgnoreQueryFilters()
            .Where(t => t.Id > after)
            .OrderBy(t => t.Id)
            .Take(500)
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.Contains("\"Id\" > @", capture.OnlyStatement, StringComparison.Ordinal);
    }

    [Fact]
    public void Ids_are_ordered_the_way_postgres_orders_uuids()
    {
        var low = new TransactionId(Guid.Parse("00000001-0000-0000-0000-000000000000"));
        var high = new TransactionId(Guid.Parse("ffffffff-0000-0000-0000-000000000000"));

        Assert.True(high > low);
        Assert.True(low < high);
        Assert.False(low >= high);
        Assert.True(low <= high);
    }

    [Fact]
    public void An_id_is_neither_above_nor_below_itself()
    {
        var value = Guid.NewGuid();
        var id = new InvestmentTransactionId(value);
        var same = new InvestmentTransactionId(value);

        Assert.False(id > same);
        Assert.False(id < same);
        Assert.True(id >= same);
        Assert.True(id <= same);
    }
}
