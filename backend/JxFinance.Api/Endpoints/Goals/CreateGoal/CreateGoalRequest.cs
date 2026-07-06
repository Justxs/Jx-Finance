namespace JxFinance.Endpoints.Goals.CreateGoal;

public sealed record CreateGoalRequest(string Name, string TargetAmount, string? CurrentAmount, DateOnly? TargetDate);
