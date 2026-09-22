using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transactions;

public readonly record struct TransactionId(Guid Value) : IStronglyTypedId<TransactionId>
{
    public static TransactionId From(Guid value) => new(value);

    public static TransactionId New() => new(Guid.NewGuid());

    public static bool operator >(TransactionId left, TransactionId right) => GuidOrder.Compare(left.Value, right.Value) > 0;

    public static bool operator <(TransactionId left, TransactionId right) => GuidOrder.Compare(left.Value, right.Value) < 0;

    public static bool operator >=(TransactionId left, TransactionId right) => !(left < right);

    public static bool operator <=(TransactionId left, TransactionId right) => !(left > right);

    public override string ToString() => Value.ToString();
}
