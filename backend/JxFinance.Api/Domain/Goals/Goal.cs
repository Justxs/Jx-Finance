using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Domain.Goals;

public sealed class Goal : OwnableEntity, IShareable
{
    public GoalId Id { get; set; } = GoalId.New();
    public required string Name { get; set; }
    public Money TargetAmount { get; set; }
    public Money CurrentAmount { get; set; }
    public DateOnly? TargetDate { get; set; }
    public GoalFunding Funding { get; set; } = GoalFunding.Manual;
    public AccountId? FundingAccountId { get; set; }
    public int FundingSharePercent { get; set; } = 100;
    public Scope Scope { get; set; } = Scope.Personal;
    public HouseholdId? HouseholdId { get; set; }

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
