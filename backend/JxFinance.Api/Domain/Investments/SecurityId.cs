using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public readonly record struct SecurityId(Guid Value) : IStronglyTypedId<SecurityId>
{
    public static SecurityId From(Guid value) => new(value);

    public static SecurityId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
