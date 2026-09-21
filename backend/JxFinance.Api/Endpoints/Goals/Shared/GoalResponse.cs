using JxFinance.Common.Json;
using JxFinance.Domain.Goals;

namespace JxFinance.Endpoints.Goals.Shared;

public sealed record GoalResponse(
    Guid Id,
    string Name,
    [property: Money] decimal TargetAmount,
    [property: Money] decimal CurrentAmount,
    DateOnly? TargetDate,
    GoalFunding Funding,
    Guid? FundingAccountId,
    int FundingSharePercent,
    [property: Money] decimal? ProgressAmount);
