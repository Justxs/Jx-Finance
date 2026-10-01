using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public readonly record struct AllocationTargetId(Guid Value) : IStronglyTypedId<AllocationTargetId>
{
    public static AllocationTargetId From(Guid value) => new(value);

    public static AllocationTargetId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
