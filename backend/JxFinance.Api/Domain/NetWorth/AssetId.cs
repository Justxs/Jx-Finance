using JxFinance.Domain.Common;

namespace JxFinance.Domain.NetWorth;

public readonly record struct AssetId(Guid Value) : IStronglyTypedId<AssetId>
{
    public static AssetId From(Guid value) => new(value);

    public static AssetId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
