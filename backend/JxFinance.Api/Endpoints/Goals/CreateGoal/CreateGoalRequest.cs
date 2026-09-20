using JxFinance.Common.Json;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed record CreateGoalRequest(
    string Name,
    [property: Money] decimal TargetAmount,
    [property: Money] decimal? CurrentAmount,
    DateOnly? TargetDate) : IGoalInput;
