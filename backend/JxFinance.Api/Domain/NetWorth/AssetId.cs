namespace JxFinance.Domain.NetWorth;

public readonly record struct AssetId(Guid Value)
{
    public static AssetId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
