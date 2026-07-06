namespace JxFinance.Endpoints.Goals;

public sealed record GoalResponse(
    Guid Id,
    string Name,
    string TargetAmount,
    string CurrentAmount,
    DateOnly? TargetDate);
