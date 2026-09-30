using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Domain.NetWorth;

public sealed class Asset : OwnableEntity, IShareable
{
    public AssetId Id { get; set; } = AssetId.New();
    public required string Name { get; set; }
    public AssetType Type { get; set; }
    public Money CurrentValue { get; set; }
    public Currency Currency => CurrentValue.Currency;
    public DateOnly AsOf { get; set; }
    public Depreciation? Depreciation { get; set; }
    public Scope Scope { get; set; } = Scope.Personal;
    public HouseholdId? HouseholdId { get; set; }

    public AssetValuation Newest => new() { AssetId = Id, Date = AsOf, Value = CurrentValue.Amount };
}
