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
