using JxFinance.Domain.Common;

namespace JxFinance.Domain.NetWorth;

public sealed class Debt : OwnableEntity
{
    public DebtId Id { get; set; } = DebtId.New();
    public required string Name { get; set; }
    public DebtType Type { get; set; }
    public Money OutstandingAmount { get; set; }
    public decimal? InterestRate { get; set; }
    public DateOnly AsOf { get; set; }
}
