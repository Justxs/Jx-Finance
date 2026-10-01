using JxFinance.Common.SettleUp;
using JxFinance.Domain.Common;
using JxFinance.Domain.Contacts;

namespace JxFinance.Tests.Unit;

public sealed class ContactBalancesTests
{
    private static readonly Guid Ona = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private static readonly Guid Jonas = Guid.Parse("00000000-0000-0000-0000-000000000002");
    private static readonly Guid Rasa = Guid.Parse("00000000-0000-0000-0000-000000000003");

    [Fact]
    public void A_share_of_a_split_is_owed_to_you()
    {
        var balances = ContactBalances.Of([new ContactShareEntry(Jonas, Currency.Eur, 30m)], []);

        Assert.Equal(30m, balances[(Jonas, Currency.Eur)]);
    }

    [Fact]
    public void Lending_raises_and_being_paid_back_lowers_what_they_owe()
    {
        var balances = ContactBalances.Of(
            [new ContactShareEntry(Jonas, Currency.Eur, 20m)],
            [
                new ContactPaymentEntry(Jonas, ContactPaymentDirection.ToContact, Currency.Eur, 50m),
                new ContactPaymentEntry(Jonas, ContactPaymentDirection.FromContact, Currency.Eur, 30m),
            ]);

        Assert.Equal(40m, balances[(Jonas, Currency.Eur)]);
    }

    [Fact]
    public void Someone_who_paid_for_you_is_owed_by_you()
    {
        var balances = ContactBalances.Of([], [new ContactPaymentEntry(Ona, ContactPaymentDirection.FromContact, Currency.Eur, 25m)]);

        Assert.Equal(-25m, balances[(Ona, Currency.Eur)]);
    }

    [Fact]
    public void A_settled_person_has_no_balance()
    {
        var balances = ContactBalances.Of(
            [new ContactShareEntry(Rasa, Currency.Eur, 12.34m)],
            [new ContactPaymentEntry(Rasa, ContactPaymentDirection.FromContact, Currency.Eur, 12.34m)]);

        Assert.Empty(balances);
    }

    [Fact]
    public void Currencies_are_kept_apart_and_never_converted()
    {
        var balances = ContactBalances.Of(
            [new ContactShareEntry(Jonas, Currency.Eur, 10m), new ContactShareEntry(Jonas, Currency.Usd, 15m)],
            [new ContactPaymentEntry(Jonas, ContactPaymentDirection.FromContact, Currency.Usd, 15m)]);

        Assert.Equal(10m, balances[(Jonas, Currency.Eur)]);
        Assert.False(balances.ContainsKey((Jonas, Currency.Usd)));
    }

    [Fact]
    public void People_are_kept_apart()
    {
        var balances = ContactBalances.Of(
            [new ContactShareEntry(Jonas, Currency.Eur, 10m), new ContactShareEntry(Ona, Currency.Eur, 10m)],
            [new ContactPaymentEntry(Ona, ContactPaymentDirection.FromContact, Currency.Eur, 4m)]);

        Assert.Equal(2, balances.Count);
        Assert.Equal(10m, balances[(Jonas, Currency.Eur)]);
        Assert.Equal(6m, balances[(Ona, Currency.Eur)]);
    }

    [Fact]
    public void Household_balances_add_up_to_zero_per_currency()
    {
        var balances = SettleUpBalances.Of(
        [
            new Owed(Ona, Jonas, Currency.Eur, 30m),
            new Owed(Ona, Rasa, Currency.Eur, 20m),
            new Owed(Ona, Ona, Currency.Eur, 25m),
            new Owed(Jonas, Ona, Currency.Eur, 10m),
            new Owed(Rasa, Jonas, Currency.Usd, 7m),
        ]);

        Assert.Equal(40m, balances[(Ona, Currency.Eur)]);
        Assert.Equal(-20m, balances[(Jonas, Currency.Eur)]);
        Assert.Equal(-20m, balances[(Rasa, Currency.Eur)]);
        Assert.Equal(0m, balances.Where(b => b.Key.Currency == Currency.Eur).Sum(b => b.Value));
        Assert.Equal(0m, balances.Where(b => b.Key.Currency == Currency.Usd).Sum(b => b.Value));
    }
}
