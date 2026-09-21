using JxFinance.Domain.Goals;

namespace JxFinance.Endpoints.Goals.Shared;

public interface IGoalInput
{
    string Name { get; }
    decimal TargetAmount { get; }
    decimal? CurrentAmount { get; }
    DateOnly? TargetDate { get; }
    GoalFunding Funding { get; }
    Guid? FundingAccountId { get; }
    int? FundingSharePercent { get; }
}
