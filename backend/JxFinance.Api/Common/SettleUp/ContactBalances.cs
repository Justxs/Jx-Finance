using JxFinance.Domain.Common;
using JxFinance.Domain.Contacts;

namespace JxFinance.Common.SettleUp;

public sealed record ContactShareEntry(Guid ContactId, Currency Currency, decimal Amount);

public sealed record ContactPaymentEntry(Guid ContactId, ContactPaymentDirection Direction, Currency Currency, decimal Amount);

public static class ContactBalances
{
    private static readonly Guid You = Guid.Empty;

    public static Dictionary<(Guid ContactId, Currency Currency), decimal> Of(
        IEnumerable<ContactShareEntry> shares,
        IEnumerable<ContactPaymentEntry> payments)
    {
        var debts = shares
            .Select(share => new Owed(You, share.ContactId, share.Currency, share.Amount))
            .Concat(payments.Select(payment => payment.Direction == ContactPaymentDirection.ToContact
                ? new Owed(You, payment.ContactId, payment.Currency, payment.Amount)
                : new Owed(payment.ContactId, You, payment.Currency, payment.Amount)));

        return SettleUpBalances.Of(debts)
            .Where(balance => balance.Key.Id != You && balance.Value != 0)
            .ToDictionary(balance => (balance.Key.Id, balance.Key.Currency), balance => -balance.Value);
    }
}
