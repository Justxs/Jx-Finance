using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Goals;

public sealed class Goal : OwnableEntity
{
    public GoalId Id { get; set; } = GoalId.New();
    public required string Name { get; set; }
    public Money TargetAmount { get; set; }
    public Money CurrentAmount { get; set; }
    public DateOnly? TargetDate { get; set; }
    public GoalFunding Funding { get; set; } = GoalFunding.Manual;
    public AccountId? FundingAccountId { get; set; }
    public int FundingSharePercent { get; set; } = 100;

    public decimal? ProgressFrom(decimal? reportingBalance)
    {
        if (Funding == GoalFunding.Manual)
        {
            return CurrentAmount.Amount;
        }

        return reportingBalance is { } balance
            ? Money.Round(Math.Max(0m, balance) * FundingSharePercent / 100m)
            : null;
    }
}
