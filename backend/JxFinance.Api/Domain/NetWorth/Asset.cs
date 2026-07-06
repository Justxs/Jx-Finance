using JxFinance.Domain.Common;

namespace JxFinance.Domain.NetWorth;

public sealed class Asset : OwnableEntity
{
    public AssetId Id { get; set; } = AssetId.New();
    public required string Name { get; set; }
    public AssetType Type { get; set; }
    public Money CurrentValue { get; set; }
    public DateOnly AsOf { get; set; }
}
