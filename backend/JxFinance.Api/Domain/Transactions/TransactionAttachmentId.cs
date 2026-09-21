using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transactions;

public readonly record struct TransactionAttachmentId(Guid Value) : IStronglyTypedId<TransactionAttachmentId>
{
    public static TransactionAttachmentId From(Guid value) => new(value);

    public static TransactionAttachmentId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
