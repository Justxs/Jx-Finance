using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed record CreateGoalRequest(
    string Name,
    [property: Money] decimal TargetAmount,
    [property: Money] decimal? CurrentAmount,
    DateOnly? TargetDate);
