using JxFinance.Common.Json;
using JxFinance.Endpoints.Goals.Shared;

namespace JxFinance.Endpoints.Goals.UpdateGoal;

public sealed record UpdateGoalRequest(
    Guid Id,
    string Name,
    [property: Money] decimal TargetAmount,
    [property: Money(NotNull = true)] decimal? CurrentAmount,
    DateOnly? TargetDate) : IGoalInput;
