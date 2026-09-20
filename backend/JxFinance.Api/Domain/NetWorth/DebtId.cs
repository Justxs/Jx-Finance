using JxFinance.Domain.Common;

namespace JxFinance.Domain.NetWorth;

public readonly record struct DebtId(Guid Value) : IStronglyTypedId<DebtId>
{
    public static DebtId From(Guid value) => new(value);

    public static DebtId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
