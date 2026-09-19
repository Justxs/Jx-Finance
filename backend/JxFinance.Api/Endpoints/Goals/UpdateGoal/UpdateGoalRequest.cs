using System.Text.Json.Serialization;
using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Goals.UpdateGoal;

public sealed record UpdateGoalRequest(
    Guid Id,
    string Name,
    [property: Money] decimal TargetAmount,
    [property: Money, JsonRequired] decimal CurrentAmount,
    DateOnly? TargetDate);
