using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transactions;

public readonly record struct TransactionGroupId(Guid Value) : IStronglyTypedId<TransactionGroupId>
{
    public static TransactionGroupId From(Guid value) => new(value);

    public static TransactionGroupId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
