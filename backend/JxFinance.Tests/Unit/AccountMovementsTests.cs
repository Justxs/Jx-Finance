using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Tests.Unit;

public sealed class AccountMovementsTests
{
    [Fact]
    public async Task Every_source_of_movement_is_summed_in_one_round_trip()
    {
        await using var capture = new SqlCapture();

        await AccountMovements.SumAsync(
            capture.Db,
            [new AccountId(Guid.NewGuid())],
            null,
            TestContext.Current.CancellationToken);

        var sql = capture.OnlyStatement;
        Assert.Equal(5, Occurrences(sql, "UNION ALL"));
        Assert.Contains("GROUP BY", sql, StringComparison.Ordinal);
        foreach (var table in new[] { "Transactions", "Transfers", "CurrencyConversions", "InvestmentTransactions" })
        {
            Assert.Contains($"\"{table}\"", sql, StringComparison.Ordinal);
        }
    }

    [Fact]
    public async Task Dated_movements_are_grouped_by_day_in_one_round_trip()
    {
        await using var capture = new SqlCapture();
        var today = new DateOnly(2027, 1, 15);

        await AccountMovements.SumByDateAsync(
            capture.Db,
            [new AccountId(Guid.NewGuid())],
            today,
            today.AddDays(90),
            TestContext.Current.CancellationToken);

        var sql = capture.OnlyStatement;
        Assert.Equal(5, Occurrences(sql, "UNION ALL"));
        Assert.Contains("GROUP BY", sql, StringComparison.Ordinal);
        Assert.Contains("\"Date\"", sql, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Rows_are_listed_newest_first_and_a_page_that_is_not_full_is_its_own_count()
    {
        await using var capture = new SqlCapture();

        var (rows, count) = await AccountMovements.ListAsync(
            capture.Db,
            new AccountId(Guid.NewGuid()),
            Currency.Eur,
            new DateOnly(2027, 1, 1),
            new DateOnly(2027, 1, 31),
            100,
            TestContext.Current.CancellationToken);

        var sql = capture.OnlyStatement;
        Assert.Equal(5, Occurrences(sql, "UNION ALL"));
        Assert.Contains("ORDER BY", sql, StringComparison.Ordinal);
        Assert.Contains("DESC", sql, StringComparison.Ordinal);
        Assert.Contains("LIMIT", sql, StringComparison.Ordinal);
        Assert.Equal((0, 0), (rows.Count, count));
    }

    private static int Occurrences(string text, string needle) =>
        (text.Length - text.Replace(needle, "", StringComparison.Ordinal).Length) / needle.Length;
}
