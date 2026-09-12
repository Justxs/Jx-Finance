namespace JxFinance.Endpoints.Goals.Shared;

public sealed record GoalResponse(
    Guid Id,
    string Name,
    string TargetAmount,
    string CurrentAmount,
    DateOnly? TargetDate);
