using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Unit;

public sealed class AppDbContextTests
{
    [Fact]
    public async Task Saving_synchronously_is_not_supported()
    {
        await using var capture = new SqlCapture();

        Assert.Throws<NotSupportedException>(() => capture.Db.SaveChanges());
        Assert.Throws<NotSupportedException>(() => capture.Db.SaveChanges(acceptAllChangesOnSuccess: true));
    }

    [Theory]
    [InlineData("MAXIMA LT, UAB 20260914", "maxima lt uab")]
    [InlineData(null, "")]
    [InlineData("  ", "")]
    public async Task An_added_transaction_gets_the_payee_key_of_its_description(string? description, string expected)
    {
        await using var capture = new SqlCapture();
        var transaction = NewTransaction(description);
        capture.Db.Transactions.Add(transaction);

        await ApplyRulesAsync(capture);

        Assert.Equal(expected, transaction.PayeeKey);
    }

    [Fact]
    public async Task Editing_the_description_recomputes_the_payee_key()
    {
        await using var capture = new SqlCapture();
        var transaction = NewTransaction("Lidl 0042", "lidl");
        capture.Db.Transactions.Attach(transaction);

        transaction.Description = "Rimi Hyper";
        await ApplyRulesAsync(capture);

        Assert.Equal("rimi hyper", transaction.PayeeKey);
    }

    [Fact]
    public async Task Editing_only_the_amount_keeps_the_payee_key()
    {
        await using var capture = new SqlCapture();
        var transaction = NewTransaction("Lidl", "kept");
        capture.Db.Transactions.Attach(transaction);

        transaction.Amount = new Money(99m, Currency.Eur);
        await ApplyRulesAsync(capture);

        Assert.Equal("kept", transaction.PayeeKey);
    }

    [Fact]
    public async Task An_added_spread_transaction_gets_the_date_of_its_last_slice()
    {
        await using var capture = new SqlCapture();
        var transaction = NewTransaction("Insurance");
        transaction.Date = new DateOnly(2026, 1, 31);
        transaction.SpreadMonths = 12;
        capture.Db.Transactions.Add(transaction);

        await ApplyRulesAsync(capture);

        Assert.Equal(new DateOnly(2026, 12, 31), transaction.SpreadUntil);
    }

    [Fact]
    public async Task An_added_transaction_that_is_not_spread_has_no_end()
    {
        await using var capture = new SqlCapture();
        var transaction = NewTransaction("Lidl");
        capture.Db.Transactions.Add(transaction);

        await ApplyRulesAsync(capture);

        Assert.Null(transaction.SpreadUntil);
    }

    [Fact]
    public async Task Changing_the_date_moves_the_end_of_the_spread()
    {
        await using var capture = new SqlCapture();
        var transaction = Spread(new DateOnly(2026, 1, 10), 3);
        capture.Db.Transactions.Attach(transaction);

        transaction.Date = new DateOnly(2026, 2, 10);
        await ApplyRulesAsync(capture);

        Assert.Equal(new DateOnly(2026, 4, 10), transaction.SpreadUntil);
    }

    [Fact]
    public async Task Changing_the_months_moves_the_end_of_the_spread()
    {
        await using var capture = new SqlCapture();
        var transaction = Spread(new DateOnly(2026, 1, 10), 3);
        capture.Db.Transactions.Attach(transaction);

        transaction.SpreadMonths = 6;
        await ApplyRulesAsync(capture);

        Assert.Equal(new DateOnly(2026, 6, 10), transaction.SpreadUntil);
    }

    [Fact]
    public async Task Clearing_the_months_clears_the_end_of_the_spread()
    {
        await using var capture = new SqlCapture();
        var transaction = Spread(new DateOnly(2026, 1, 10), 3);
        capture.Db.Transactions.Attach(transaction);

        transaction.SpreadMonths = null;
        await ApplyRulesAsync(capture);

        Assert.Null(transaction.SpreadUntil);
    }

    [Fact]
    public async Task An_added_spread_starts_on_its_date_and_a_backward_one_ends_there()
    {
        var forward = NewTransaction("Insurance");
        forward.Date = new DateOnly(2026, 1, 31);
        forward.SpreadMonths = 3;
        var backward = NewTransaction("Electricity");
        backward.Date = new DateOnly(2026, 3, 31);
        backward.SpreadMonths = 3;
        backward.SpreadDirection = SpreadDirection.Backward;

        foreach (var transaction in new[] { forward, backward })
        {
            await using var capture = new SqlCapture();
            capture.Db.Transactions.Add(transaction);
            await ApplyRulesAsync(capture);
        }

        Assert.Equal((new DateOnly(2026, 1, 31), new DateOnly(2026, 3, 31)), (forward.SpreadFrom, forward.SpreadUntil));
        Assert.Equal((new DateOnly(2026, 1, 31), new DateOnly(2026, 3, 31)), (backward.SpreadFrom, backward.SpreadUntil));
    }

    [Fact]
    public async Task Turning_a_spread_backward_moves_both_ends_and_clearing_it_clears_both()
    {
        await using var capture = new SqlCapture();
        var transaction = Spread(new DateOnly(2026, 4, 10), 3);
        capture.Db.Transactions.Attach(transaction);

        transaction.SpreadDirection = SpreadDirection.Backward;
        await ApplyRulesAsync(capture);

        Assert.Equal((new DateOnly(2026, 2, 10), new DateOnly(2026, 4, 10)), (transaction.SpreadFrom, transaction.SpreadUntil));

        transaction.SpreadMonths = null;
        await ApplyRulesAsync(capture);

        Assert.Equal(((DateOnly?)null, (DateOnly?)null), (transaction.SpreadFrom, transaction.SpreadUntil));
    }

    private static Transaction Spread(DateOnly date, short months)
    {
        var transaction = NewTransaction("Insurance", "insurance");
        transaction.Date = date;
        transaction.SpreadMonths = months;
        transaction.SpreadUntil = date.AddMonths(months - 1);
        return transaction;
    }

    private static Transaction NewTransaction(string? description, string? payeeKey = null) => new()
    {
        UserId = Guid.NewGuid(),
        AccountId = AccountId.New(),
        Type = FlowType.Expense,
        Amount = new Money(12.5m, Currency.Eur),
        ReportingAmount = 12.5m,
        Date = new DateOnly(2026, 9, 14),
        Description = description,
        PayeeKey = payeeKey,
    };

    private static async Task ApplyRulesAsync(SqlCapture capture) =>
        await Assert.ThrowsAsync<DbUpdateException>(() => capture.Db.SaveChangesAsync(TestContext.Current.CancellationToken));
}
