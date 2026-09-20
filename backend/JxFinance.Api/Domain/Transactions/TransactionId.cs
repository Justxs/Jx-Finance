using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transactions;

public readonly record struct TransactionId(Guid Value) : IStronglyTypedId<TransactionId>
{
    public static TransactionId From(Guid value) => new(value);

    public static TransactionId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
