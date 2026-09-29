using JxFinance.Domain.Common;

namespace JxFinance.Domain.Receipts;

public readonly record struct ReceiptReadingId(Guid Value) : IStronglyTypedId<ReceiptReadingId>
{
    public static ReceiptReadingId From(Guid value) => new(value);

    public static ReceiptReadingId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
