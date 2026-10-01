using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Goals.UpdateGoalProgress;

public sealed record UpdateGoalProgressRequest(
    Guid Id,
    [property: Money] decimal? CurrentAmount,
    [property: Money] decimal? Delta);
