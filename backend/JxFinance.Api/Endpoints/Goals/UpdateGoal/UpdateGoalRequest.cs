namespace JxFinance.Endpoints.Goals.UpdateGoal;

public sealed record UpdateGoalRequest(Guid Id, string Name, string TargetAmount, string CurrentAmount, DateOnly? TargetDate);
