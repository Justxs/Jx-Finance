using JxFinance.Domain.Common;

namespace JxFinance.Domain.RecurringBills;

public readonly record struct RecurringBillId(Guid Value) : IStronglyTypedId<RecurringBillId>
{
    public static RecurringBillId From(Guid value) => new(value);

    public static RecurringBillId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
