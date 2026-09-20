using JxFinance.Domain.Common;

namespace JxFinance.Domain.NetWorth;

public readonly record struct NetWorthSnapshotId(Guid Value) : IStronglyTypedId<NetWorthSnapshotId>
{
    public static NetWorthSnapshotId From(Guid value) => new(value);

    public static NetWorthSnapshotId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
