using JxFinance.Domain.Common;

namespace JxFinance.Domain.Households;

public readonly record struct SettlementId(Guid Value) : IStronglyTypedId<SettlementId>
{
    public static SettlementId From(Guid value) => new(value);

    public static SettlementId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
