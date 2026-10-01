using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public sealed class AllocationTarget : OwnableEntity
{
    public const int KeyMaxLength = 36;
    public const int MaxTargets = 100;
    public const decimal WholeShare = 100m;

    public AllocationTargetId Id { get; set; } = AllocationTargetId.New();
    public AllocationDimension Dimension { get; set; }
    public required string Key { get; set; }
    public decimal Share { get; set; }
}
