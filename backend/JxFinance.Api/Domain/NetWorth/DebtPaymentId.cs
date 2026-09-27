using JxFinance.Domain.Common;

namespace JxFinance.Domain.NetWorth;

public readonly record struct DebtPaymentId(Guid Value) : IStronglyTypedId<DebtPaymentId>
{
    public static DebtPaymentId From(Guid value) => new(value);

    public static DebtPaymentId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
