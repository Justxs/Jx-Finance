using JxFinance.Endpoints.Transactions.Services;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Unit;

public sealed class PossibleDuplicatesQueryTests
{
    [Fact]
    public async Task Pairs_are_found_in_sql_on_the_same_account_by_the_stored_payee_key()
    {
        await using var capture = new SqlCapture();

        await PossibleDuplicates.Pairs(capture.Db).ToListAsync(TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains("\"AccountId\" = ", statement, StringComparison.Ordinal);
        Assert.Contains("\"PayeeKey\"", statement, StringComparison.Ordinal);
        Assert.Contains("\"Date\" + 3", statement, StringComparison.Ordinal);
        Assert.Contains("btrim(", statement, StringComparison.Ordinal);
        Assert.Contains("\"DuplicateDismissals\"", statement, StringComparison.Ordinal);
        Assert.Contains("\"IsDeleted\"", statement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task The_ledger_filter_asks_for_a_partner_of_each_row()
    {
        await using var capture = new SqlCapture();
        var pairs = PossibleDuplicates.Pairs(capture.Db);

        await capture.Db.Transactions
            .Where(t => pairs.Any(p => p.Id == t.Id))
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.Contains("EXISTS (", capture.OnlyStatement, StringComparison.Ordinal);
    }
}
