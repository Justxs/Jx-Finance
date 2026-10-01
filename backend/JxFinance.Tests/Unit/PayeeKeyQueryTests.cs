using JxFinance.Common.Unusual;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.RecurringBills.Services;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Unit;

public sealed class PayeeKeyQueryTests
{
    [Fact]
    public async Task Price_rise_charges_are_narrowed_to_the_keys_by_the_stored_payee_key()
    {
        await using var capture = new SqlCapture();

        await PriceRiseMatcher.LoadChargesAsync(
            capture.Db.Transactions,
            [new AccountId(Guid.NewGuid())],
            ["netflix"],
            new DateOnly(2026, 9, 1),
            FlowType.Expense,
            TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains("\"PayeeKey\" = ANY (", statement, StringComparison.Ordinal);
        Assert.DoesNotContain("\"Description\"", statement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Unusual_amount_history_reads_the_stored_payee_key()
    {
        await using var capture = new SqlCapture();

        await new UnusualAmountService(capture.Db).EvaluateAsync(
            [new UnusualCandidate(new AccountId(Guid.NewGuid()), null, new DateOnly(2026, 9, 1), 25m, "netflix")],
            TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains("\"PayeeKey\"", statement, StringComparison.Ordinal);
        Assert.DoesNotContain("\"Description\"", statement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Subscription_detection_leaves_out_rows_without_a_payee_key_in_sql()
    {
        await using var capture = new SqlCapture();

        await new SubscriptionDetectionService(capture.Db, new TestClock(), null!).DetectAsync(TestContext.Current.CancellationToken);

        var occurrences = capture.Statements[0];
        Assert.Contains("\"PayeeKey\" IS NOT NULL", occurrences, StringComparison.Ordinal);
        Assert.Contains("\"PayeeKey\" <> ''", occurrences, StringComparison.Ordinal);
        Assert.DoesNotContain("\"Description\"", occurrences, StringComparison.Ordinal);
    }
}
