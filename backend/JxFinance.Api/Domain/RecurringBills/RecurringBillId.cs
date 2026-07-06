namespace JxFinance.Domain.RecurringBills;

public readonly record struct RecurringBillId(Guid Value)
{
    public static RecurringBillId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
