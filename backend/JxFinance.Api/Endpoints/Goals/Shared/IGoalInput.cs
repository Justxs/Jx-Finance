namespace JxFinance.Endpoints.Goals.Shared;

public interface IGoalInput
{
    string Name { get; }
    decimal TargetAmount { get; }
    decimal? CurrentAmount { get; }
    DateOnly? TargetDate { get; }
}
