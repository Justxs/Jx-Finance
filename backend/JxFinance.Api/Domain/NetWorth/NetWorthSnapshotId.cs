namespace JxFinance.Domain.NetWorth;

public readonly record struct NetWorthSnapshotId(Guid Value)
{
    public static NetWorthSnapshotId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
