using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Goals.Shared;

public sealed record GoalResponse(
    Guid Id,
    string Name,
    [property: Money] decimal TargetAmount,
    [property: Money] decimal CurrentAmount,
    DateOnly? TargetDate);
