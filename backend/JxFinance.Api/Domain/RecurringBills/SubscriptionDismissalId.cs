using JxFinance.Domain.Common;

namespace JxFinance.Domain.RecurringBills;

public readonly record struct SubscriptionDismissalId(Guid Value) : IStronglyTypedId<SubscriptionDismissalId>
{
    public static SubscriptionDismissalId From(Guid value) => new(value);

    public static SubscriptionDismissalId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
