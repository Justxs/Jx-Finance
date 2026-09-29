using JxFinance.Domain.Common;

namespace JxFinance.Domain.Receipts;

public readonly record struct ReceiptItemCategoryId(Guid Value) : IStronglyTypedId<ReceiptItemCategoryId>
{
    public static ReceiptItemCategoryId From(Guid value) => new(value);

    public static ReceiptItemCategoryId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
