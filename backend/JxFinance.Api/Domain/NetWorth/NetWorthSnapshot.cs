using JxFinance.Domain.Common;

namespace JxFinance.Domain.NetWorth;

public sealed class NetWorthSnapshot : OwnableEntity
{
    public NetWorthSnapshotId Id { get; set; } = NetWorthSnapshotId.New();
    public DateOnly Date { get; set; }
    public Currency Currency { get; set; }
    public decimal Accounts { get; set; }
    public decimal Assets { get; set; }
    public decimal Debts { get; set; }
    public decimal NetWorthValue { get; set; }
}
