using JxFinance.Domain.Common;

namespace JxFinance.Domain.NetWorth;

public sealed class NetWorthSnapshot : OwnableEntity
{
    public NetWorthSnapshotId Id { get; set; } = NetWorthSnapshotId.New();
    public DateOnly Date { get; set; }
    public Money Accounts { get; set; }
    public Money Assets { get; set; }
    public Money Debts { get; set; }
    public Money NetWorthValue { get; set; }
}
