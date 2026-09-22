using JxFinance.Domain.Accounts;
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
            TestContext.Current.CancellationToken);

        var sql = capture.OnlyStatement;
        Assert.Equal(5, Occurrences(sql, "UNION ALL"));
        Assert.Contains("GROUP BY", sql, StringComparison.Ordinal);
        foreach (var table in new[] { "Transactions", "Transfers", "CurrencyConversions", "InvestmentTransactions" })
        {
            Assert.Contains($"\"{table}\"", sql, StringComparison.Ordinal);
        }
    }

    private static int Occurrences(string text, string needle) =>
        (text.Length - text.Replace(needle, "", StringComparison.Ordinal).Length) / needle.Length;
}
