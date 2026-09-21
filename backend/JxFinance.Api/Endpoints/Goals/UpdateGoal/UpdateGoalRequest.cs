using JxFinance.Common.Json;
using JxFinance.Domain.Goals;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.UpdateGoal;

public sealed record UpdateGoalRequest(
    Guid Id,
    string Name,
    [property: Money] decimal TargetAmount,
    [property: Money] decimal? CurrentAmount,
    DateOnly? TargetDate,
    GoalFunding Funding,
    Guid? FundingAccountId,
    int? FundingSharePercent) : IGoalInput;
